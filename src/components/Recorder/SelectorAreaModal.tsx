/**
 * SelectorAreaModal.tsx
 * Human intervention tool for manually defining selector areas
 * 
 * This modal allows users to draw rectangles on page screenshots
 * to define exact click/input locations when automated recording fails.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../Ui/dialog';
import { Button } from '../Ui/button';
import { Alert, AlertDescription } from '../Ui/alert';
import { Target, RefreshCw, Check, X } from 'lucide-react';

export interface ManualSelector {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  timestamp: number;
  screenshotDataUrl?: string;
  viewportWidth: number;
  viewportHeight: number;
  confidence: 'user-defined';
}

interface SelectorAreaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (selector: ManualSelector) => void;
  stepLabel: string;
  stepIndex: number;
  targetUrl: string;
}

interface Rectangle {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function SelectorAreaModal({
  open,
  onClose,
  onSave,
  stepLabel,
  stepIndex,
  targetUrl,
}: SelectorAreaModalProps) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangle, setRectangle] = useState<Rectangle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setError(null);
    setRectangle(null);
    
    try {
      console.log('[SelectorModal] Requesting screenshot for:', targetUrl);
      
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT_FOR_SELECTOR',
        url: targetUrl,
      });
      
      if (response?.error) {
        throw new Error(response.error);
      }
      
      if (response?.screenshot) {
        console.log('[SelectorModal] Screenshot received');
        setScreenshot(response.screenshot);
      } else {
        throw new Error('No screenshot returned from background script');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SelectorModal] Screenshot capture failed:', errorMsg);
      setError(`Failed to capture screenshot: ${errorMsg}`);
    } finally {
      setIsCapturing(false);
    }
  }, [targetUrl]);

  // Auto-capture on open
  useEffect(() => {
    if (open && !screenshot) {
      captureScreenshot();
    }
  }, [open, screenshot, captureScreenshot]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setScreenshot(null);
      setRectangle(null);
      setError(null);
      setImageLoaded(false);
    }
  }, [open]);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas to match image natural dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      setImageDimensions({ 
        width: img.naturalWidth, 
        height: img.naturalHeight 
      });
      
      // Draw initial image
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      
      setImageLoaded(true);
      console.log('[SelectorModal] Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
    }
  }, []);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setRectangle({ 
      startX: coords.x, 
      startY: coords.y, 
      endX: coords.x, 
      endY: coords.y 
    });
  }, [getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !rectangle) return;
    
    const coords = getCanvasCoordinates(e);
    setRectangle(prev => prev ? { 
      ...prev, 
      endX: coords.x, 
      endY: coords.y 
    } : null);
  }, [isDrawing, rectangle, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Render canvas with overlay
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and redraw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);
    
    // Draw rectangle overlay if exists
    if (rectangle) {
      const x = Math.min(rectangle.startX, rectangle.endX);
      const y = Math.min(rectangle.startY, rectangle.endY);
      const w = Math.abs(rectangle.endX - rectangle.startX);
      const h = Math.abs(rectangle.endY - rectangle.startY);
      
      // Darken everything except selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear selection area and redraw image portion
      ctx.clearRect(x, y, w, h);
      ctx.drawImage(imageRef.current, x, y, w, h, x, y, w, h);
      
      // Draw green border
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      
      // Draw center crosshair
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();
    }
  }, [rectangle, imageLoaded]);

  const handleSave = useCallback(() => {
    if (!rectangle) {
      setError('Please draw a rectangle around the target element');
      return;
    }
    
    const x = Math.min(rectangle.startX, rectangle.endX);
    const y = Math.min(rectangle.startY, rectangle.endY);
    const w = Math.abs(rectangle.endX - rectangle.startX);
    const h = Math.abs(rectangle.endY - rectangle.startY);
    
    if (w < 10 || h < 10) {
      setError('Selection too small - please draw a larger rectangle');
      return;
    }
    
    const selector: ManualSelector = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
      centerX: Math.round(x + w / 2),
      centerY: Math.round(y + h / 2),
      timestamp: Date.now(),
      viewportWidth: imageDimensions.width,
      viewportHeight: imageDimensions.height,
      confidence: 'user-defined',
    };
    
    console.log('[SelectorModal] Saving manual selector:', selector);
    onSave(selector);
    onClose();
  }, [rectangle, imageDimensions, onSave, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-green-400" />
            Set Selector Area for Step {stepIndex + 1}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Draw a rectangle around the "{stepLabel}" target element on the screenshot below.
            The playback will use this exact location.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="bg-red-900/30 border-red-700">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative border border-slate-600 rounded-lg overflow-auto max-h-[60vh] bg-slate-950">
          {isCapturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 text-green-400 animate-spin" />
                <p className="text-white text-sm">Capturing screenshot...</p>
              </div>
            </div>
          )}
          
          {screenshot && (
            <>
              <img 
                ref={imageRef} 
                src={screenshot} 
                onLoad={handleImageLoad} 
                className="hidden" 
                alt="Page screenshot"
              />
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-crosshair max-w-full"
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
              {!imageLoaded && (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-green-400 animate-spin" />
                </div>
              )}
            </>
          )}
          
          {!screenshot && !isCapturing && (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p>Click "Recapture" to capture screenshot</p>
            </div>
          )}
        </div>

        {rectangle && (
          <div className="text-xs text-slate-400 space-y-1">
            <p>Selection: {Math.round(Math.abs(rectangle.endX - rectangle.startX))} × {Math.round(Math.abs(rectangle.endY - rectangle.startY))} px</p>
            <p>Center: ({Math.round((rectangle.startX + rectangle.endX) / 2)}, {Math.round((rectangle.startY + rectangle.endY) / 2)})</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={captureScreenshot} 
            disabled={isCapturing}
            className="border-slate-600 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isCapturing ? 'animate-spin' : ''}`} />
            Recapture
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setRectangle(null)} 
            disabled={!rectangle}
            className="border-slate-600 hover:bg-slate-800"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!rectangle} 
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Selector
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
