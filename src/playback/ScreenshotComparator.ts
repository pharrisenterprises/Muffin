// ═══════════════════════════════════════════════════════════════════════════
// SCREENSHOT COMPARATOR - Visual Verification During Playback
// ═══════════════════════════════════════════════════════════════════════════

import type {
  ScreenshotComparisonResult,
  ComparisonOptions,
  DiffRegion,
  BoundingBox
} from './self-healing-types';
import type { ScreenshotCapture } from '../validation/types';
import { DEFAULT_COMPARISON_OPTIONS } from './self-healing-config';

/**
 * Compares recorded screenshots with current page state
 */
export class ScreenshotComparator {
  private options: ComparisonOptions;
  
  constructor(options?: Partial<ComparisonOptions>) {
    this.options = { ...DEFAULT_COMPARISON_OPTIONS, ...options };
  }
  
  /**
   * Compare recorded screenshot with current state
   */
  async compare(
    recorded: ScreenshotCapture,
    current: ScreenshotCapture
  ): Promise<ScreenshotComparisonResult> {
    const startTime = Date.now();
    
    try {
      const recordedImage = await this.loadImage(recorded.imageData);
      const currentImage = await this.loadImage(current.imageData);
      
      let recordedRegion = recordedImage;
      let currentRegion = currentImage;
      
      if (this.options.focusOnElement && recorded.elementBounds) {
        recordedRegion = this.extractRegion(
          recordedImage,
          recorded.elementBounds,
          this.options.contextPadding
        );
        
        if (current.elementBounds) {
          currentRegion = this.extractRegion(
            currentImage,
            current.elementBounds,
            this.options.contextPadding
          );
        }
      }
      
      const pixelResult = this.pixelComparison(recordedRegion, currentRegion);
      const structuralResult = this.structuralSimilarity(recordedRegion, currentRegion);
      
      const similarity = (pixelResult.similarity + structuralResult) / 2;
      const match = similarity >= this.options.similarityThreshold;
      
      const elementAnalysis = this.analyzeElementLocation(
        recorded.elementBounds,
        current.elementBounds,
        pixelResult.diffRegions
      );
      
      return {
        match,
        similarity,
        method: 'combined',
        diffRegions: pixelResult.diffRegions,
        elementVisible: elementAnalysis.visible,
        elementMoved: elementAnalysis.moved,
        newElementBounds: elementAnalysis.newBounds,
        confidence: this.calculateConfidence(similarity, elementAnalysis),
        duration: Date.now() - startTime
      };
    } catch {
      return {
        match: false,
        similarity: 0,
        method: 'combined',
        diffRegions: [],
        elementVisible: false,
        elementMoved: false,
        confidence: 0,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * Quick comparison check
   */
  async quickCompare(
    recorded: ScreenshotCapture,
    current: ScreenshotCapture
  ): Promise<boolean> {
    try {
      if (!recorded.elementBounds || !current.elementBounds) return false;
      
      const recordedImage = await this.loadImage(recorded.imageData);
      const currentImage = await this.loadImage(current.imageData);
      
      const recordedRegion = this.extractRegion(recordedImage, recorded.elementBounds, 20);
      const currentRegion = this.extractRegion(currentImage, current.elementBounds, 20);
      
      const result = this.pixelComparison(recordedRegion, currentRegion);
      return result.similarity >= this.options.similarityThreshold;
    } catch {
      return false;
    }
  }
  
  /**
   * Find element in current screenshot
   */
  async findElementInCurrent(
    recorded: ScreenshotCapture,
    currentFull: ScreenshotCapture
  ): Promise<BoundingBox | null> {
    if (!recorded.elementBounds) return null;
    
    try {
      const recordedImage = await this.loadImage(recorded.imageData);
      const currentImage = await this.loadImage(currentFull.imageData);
      
      const template = this.extractRegion(recordedImage, recorded.elementBounds, 0);
      return this.templateMatch(template, currentImage);
    } catch {
      return null;
    }
  }
  
  // Private methods
  
  private async loadImage(base64: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = reject;
      img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });
  }
  
  private extractRegion(
    image: ImageData,
    bounds: BoundingBox,
    padding: number
  ): ImageData {
    const x = Math.max(0, bounds.x - padding);
    const y = Math.max(0, bounds.y - padding);
    const width = Math.min(image.width - x, bounds.width + padding * 2);
    const height = Math.min(image.height - y, bounds.height + padding * 2);
    
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(image, 0, 0);
    
    return ctx.getImageData(x, y, width, height);
  }
  
  private pixelComparison(
    img1: ImageData,
    img2: ImageData
  ): { similarity: number; diffRegions: DiffRegion[] } {
    const { data1, data2, width, height } = this.normalizeSizes(img1, img2);
    
    let matchingPixels = 0;
    const totalPixels = width * height;
    const diffMap: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const distance = Math.sqrt(
          Math.pow(data1[idx] - data2[idx], 2) +
          Math.pow(data1[idx + 1] - data2[idx + 1], 2) +
          Math.pow(data1[idx + 2] - data2[idx + 2], 2)
        );
        
        if (distance <= (this.options.ignoreColors ? 100 : 30)) {
          matchingPixels++;
        } else {
          diffMap[y][x] = true;
        }
      }
    }
    
    return {
      similarity: matchingPixels / totalPixels,
      diffRegions: this.findDiffRegions(diffMap, width, height)
    };
  }
  
  private structuralSimilarity(img1: ImageData, img2: ImageData): number {
    const { data1, data2 } = this.normalizeSizes(img1, img2);
    const lum1 = this.calculateLuminance(data1);
    const lum2 = this.calculateLuminance(data2);
    
    const mean1 = lum1.reduce((a, b) => a + b, 0) / lum1.length;
    const mean2 = lum2.reduce((a, b) => a + b, 0) / lum2.length;
    
    let var1 = 0, var2 = 0, covar = 0;
    for (let i = 0; i < lum1.length; i++) {
      const d1 = lum1[i] - mean1;
      const d2 = lum2[i] - mean2;
      var1 += d1 * d1;
      var2 += d2 * d2;
      covar += d1 * d2;
    }
    
    var1 /= lum1.length;
    var2 /= lum2.length;
    covar /= lum1.length;
    
    const c1 = 0.01 ** 2;
    const c2 = 0.03 ** 2;
    const ssim = ((2 * mean1 * mean2 + c1) * (2 * covar + c2)) /
                 ((mean1 ** 2 + mean2 ** 2 + c1) * (var1 + var2 + c2));
    
    return Math.max(0, Math.min(1, ssim));
  }
  
  private templateMatch(template: ImageData, image: ImageData): BoundingBox | null {
    const tWidth = template.width;
    const tHeight = template.height;
    const iWidth = image.width;
    const iHeight = image.height;
    
    if (tWidth > iWidth || tHeight > iHeight) return null;
    
    let bestMatch = { x: 0, y: 0, score: 0 };
    
    for (let y = 0; y <= iHeight - tHeight; y += 2) {
      for (let x = 0; x <= iWidth - tWidth; x += 2) {
        const score = this.matchScore(template, image, x, y);
        if (score > bestMatch.score) {
          bestMatch = { x, y, score };
        }
      }
    }
    
    if (bestMatch.score >= 0.7) {
      return { x: bestMatch.x, y: bestMatch.y, width: tWidth, height: tHeight };
    }
    
    return null;
  }
  
  private matchScore(template: ImageData, image: ImageData, offsetX: number, offsetY: number): number {
    let matches = 0;
    let total = 0;
    
    for (let y = 0; y < template.height; y++) {
      for (let x = 0; x < template.width; x++) {
        const tIdx = (y * template.width + x) * 4;
        const iIdx = ((y + offsetY) * image.width + (x + offsetX)) * 4;
        
        const distance = Math.sqrt(
          Math.pow(template.data[tIdx] - image.data[iIdx], 2) +
          Math.pow(template.data[tIdx + 1] - image.data[iIdx + 1], 2) +
          Math.pow(template.data[tIdx + 2] - image.data[iIdx + 2], 2)
        );
        
        if (distance < 50) matches++;
        total++;
      }
    }
    
    return matches / total;
  }
  
  private normalizeSizes(img1: ImageData, img2: ImageData) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    
    const data1 = new Uint8ClampedArray(width * height * 4);
    const data2 = new Uint8ClampedArray(width * height * 4);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const idx1 = (y * img1.width + x) * 4;
        const idx2 = (y * img2.width + x) * 4;
        
        for (let i = 0; i < 4; i++) {
          data1[idx + i] = img1.data[idx1 + i];
          data2[idx + i] = img2.data[idx2 + i];
        }
      }
    }
    
    return { data1, data2, width, height };
  }
  
  private calculateLuminance(data: Uint8ClampedArray): number[] {
    const luminance: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      luminance.push(lum / 255);
    }
    return luminance;
  }
  
  private findDiffRegions(diffMap: boolean[][], width: number, height: number): DiffRegion[] {
    const regions: DiffRegion[] = [];
    const visited = new Set<string>();
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (diffMap[y][x] && !visited.has(`${x},${y}`)) {
          const region = this.floodFillRegion(diffMap, x, y, width, height, visited);
          
          if (region.width > this.options.noiseThreshold && region.height > this.options.noiseThreshold) {
            regions.push({
              bounds: region,
              intensity: 0.5,
              type: 'changed',
              isTargetRegion: false
            });
          }
        }
      }
    }
    
    return regions;
  }
  
  private floodFillRegion(
    diffMap: boolean[][],
    startX: number,
    startY: number,
    width: number,
    height: number,
    visited: Set<string>
  ): BoundingBox {
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    const stack = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height || !diffMap[y][x]) continue;
      
      visited.add(key);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
  
  private analyzeElementLocation(
    originalBounds?: BoundingBox,
    currentBounds?: BoundingBox,
    _diffRegions?: DiffRegion[]
  ): { visible: boolean; moved: boolean; newBounds?: BoundingBox } {
    if (!originalBounds) return { visible: false, moved: false };
    if (!currentBounds) return { visible: false, moved: true };
    
    const dx = Math.abs(originalBounds.x - currentBounds.x);
    const dy = Math.abs(originalBounds.y - currentBounds.y);
    const moved = dx > 10 || dy > 10;
    
    return { visible: true, moved, newBounds: moved ? currentBounds : undefined };
  }
  
  private calculateConfidence(
    similarity: number,
    elementAnalysis: { visible: boolean; moved: boolean }
  ): number {
    let confidence = similarity;
    if (!elementAnalysis.visible) confidence *= 0.5;
    if (elementAnalysis.moved) confidence *= 0.8;
    return confidence;
  }
}

export function createScreenshotComparator(options?: Partial<ComparisonOptions>): ScreenshotComparator {
  return new ScreenshotComparator(options);
}
