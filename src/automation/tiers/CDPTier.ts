/**
 * CDP TIER (TIER 2)
 * 
 * Uses Chrome DevTools Protocol for element finding and input
 * Fallback when native DOM methods fail
 */

import { RecordedStep } from '../../recording/types';
import { TierResult } from '../types';
import { CDPClient, cdpClient } from '../CDPClient';

export class CDPTier {
  private client: CDPClient;
  
  constructor() {
    this.client = cdpClient;
  }
  
  /**
   * Execute a step using CDP
   */
  async execute(step: RecordedStep): Promise<TierResult> {
    const startTime = Date.now();
    
    console.log('[CDPTier] Executing:', step.label);
    
    try {
      // Ensure CDP is attached
      if (!this.client.isConnected()) {
        const attached = await this.client.attach();
        if (!attached) {
          return {
            tier: 'cdp_protocol',
            success: false,
            error: 'Failed to attach CDP debugger',
            duration: Date.now() - startTime,
          };
        }
      }
      
      // Find element - try CSS selector first, then XPath
      let nodeInfo = null;
      
      if (step.bundle.cssSelector) {
        nodeInfo = await this.client.querySelector(step.bundle.cssSelector);
      }
      
      if (!nodeInfo && step.bundle.xpath) {
        nodeInfo = await this.client.queryXPath(step.bundle.xpath);
      }
      
      if (!nodeInfo) {
        return {
          tier: 'cdp_protocol',
          success: false,
          error: 'Element not found via CDP',
          duration: Date.now() - startTime,
        };
      }
      
      // Get click coordinates
      let x: number, y: number;
      
      if (nodeInfo.boundingBox) {
        x = nodeInfo.boundingBox.x + nodeInfo.boundingBox.width / 2;
        y = nodeInfo.boundingBox.y + nodeInfo.boundingBox.height / 2;
      } else if (step.x !== undefined && step.y !== undefined) {
        x = step.x;
        y = step.y;
      } else {
        return {
          tier: 'cdp_protocol',
          success: false,
          error: 'No coordinates available',
          duration: Date.now() - startTime,
        };
      }
      
      // Execute action
      switch (step.event) {
        case 'click':
          await this.client.clickAt(x, y);
          break;
          
        case 'input':
          // Focus and type
          if (nodeInfo.nodeId) {
            await this.client.focusNode(nodeInfo.nodeId);
          } else {
            await this.client.clickAt(x, y);
          }
          await this.sleep(100);
          if (step.value) {
            await this.client.typeText(step.value);
          }
          break;
          
        case 'enter':
          if (nodeInfo.nodeId) {
            await this.client.focusNode(nodeInfo.nodeId);
          } else {
            await this.client.clickAt(x, y);
          }
          await this.sleep(50);
          await this.client.pressEnter();
          break;
          
        case 'keypress':
          // Focus first
          if (nodeInfo.nodeId) {
            await this.client.focusNode(nodeInfo.nodeId);
          }
          // Type the key
          if (step.value) {
            await this.client.typeText(step.value);
          }
          break;
          
        case 'open':
          // Skip
          break;
      }
      
      return {
        tier: 'cdp_protocol',
        success: true,
        duration: Date.now() - startTime,
        confidence: 0.8,
      };
      
    } catch (error) {
      return {
        tier: 'cdp_protocol',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
