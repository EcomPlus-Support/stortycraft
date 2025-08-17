import { ContentComplexityMetrics, ComplexityLevel, COMPLEXITY_THRESHOLDS } from './content-complexity-analyzer';
import { logger } from './logger';

export interface TokenAllocation {
  maxTokens: number;
  temperature: number;
  timeout: number;
  reasoning: string;
  riskAdjustment: string;
}

export class TokenAllocationManager {
  
  /**
   * 根據複雜度分配 token 和參數
   */
  allocateTokens(complexity: ContentComplexityMetrics, targetLanguage?: string): TokenAllocation {
    let baseAllocation = COMPLEXITY_THRESHOLDS[complexity.level].tokenBudget;
    
    // 針對繁體中文增加 token 分配 (中文需要更多 tokens)
    if (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') {
      baseAllocation = Math.round(baseAllocation * 1.5); // 增加 50%
      logger.info('🇹🇼 Increasing token allocation for Traditional Chinese', {
        original: COMPLEXITY_THRESHOLDS[complexity.level].tokenBudget,
        adjusted: baseAllocation
      });
    }
    
    logger.info('🎯 Allocating tokens based on complexity', {
      level: complexity.level,
      baseAllocation,
      riskFactors: complexity.riskFactors
    });

    // 根據風險因素調整
    let adjustedAllocation = baseAllocation;
    const adjustments: string[] = [];

    // Token 溢出風險調整
    if (complexity.riskFactors.tokenOverflowRisk === 'high') {
      adjustedAllocation *= 0.6;  // 減少40%
      adjustments.push('High token overflow risk: -40%');
    } else if (complexity.riskFactors.tokenOverflowRisk === 'medium') {
      adjustedAllocation *= 0.75; // 減少25%
      adjustments.push('Medium token overflow risk: -25%');
    }

    // 處理時間風險調整
    if (complexity.riskFactors.processingTimeRisk === 'high') {
      adjustedAllocation *= 0.8;  // 減少20%
      adjustments.push('High processing time risk: -20%');
    } else if (complexity.riskFactors.processingTimeRisk === 'medium') {
      adjustedAllocation *= 0.9;  // 減少10%
      adjustments.push('Medium processing time risk: -10%');
    }

    // JSON 截斷風險調整
    if (complexity.riskFactors.jsonTruncationRisk === 'high') {
      adjustedAllocation *= 0.7;  // 減少30%
      adjustments.push('High JSON truncation risk: -30%');
    } else if (complexity.riskFactors.jsonTruncationRisk === 'medium') {
      adjustedAllocation *= 0.85; // 減少15%
      adjustments.push('Medium JSON truncation risk: -15%');
    }

    // 確保最小值 - 針對繁體中文提高最小值
    const minTokens = (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 800 : 500;
    const finalAllocation = Math.max(Math.round(adjustedAllocation), minTokens);
    
    const allocation: TokenAllocation = {
      maxTokens: finalAllocation,
      temperature: this.getOptimalTemperature(complexity),
      timeout: this.getOptimalTimeout(complexity),
      reasoning: this.generateReasoning(complexity, baseAllocation, finalAllocation),
      riskAdjustment: adjustments.length > 0 ? adjustments.join('; ') : 'No adjustments needed'
    };

    logger.info('✅ Token allocation completed', {
      original: baseAllocation,
      allocated: finalAllocation,
      temperature: allocation.temperature,
      timeout: allocation.timeout
    });

    return allocation;
  }

  private getOptimalTemperature(complexity: ContentComplexityMetrics): number {
    // 根據複雜度調整創意性
    switch (complexity.level) {
      case ComplexityLevel.SIMPLE:
        return 0.8;  // 較高創意性，因為內容簡單
      case ComplexityLevel.MODERATE:
        return 0.6;  // 中等創意性
      case ComplexityLevel.COMPLEX:
        return 0.4;  // 較低創意性，確保穩定輸出
      case ComplexityLevel.EXTREME:
        return 0.2;  // 最低創意性，確保可靠性
      default:
        return 0.7;
    }
  }

  private getOptimalTimeout(complexity: ContentComplexityMetrics): number {
    // 根據複雜度和處理時間風險調整超時
    let baseTimeout = COMPLEXITY_THRESHOLDS[complexity.level].maxProcessingTime;
    
    // 根據風險因素調整
    if (complexity.riskFactors.processingTimeRisk === 'high') {
      baseTimeout *= 1.5;
    } else if (complexity.riskFactors.processingTimeRisk === 'medium') {
      baseTimeout *= 1.2;
    }
    
    // 確保在合理範圍內
    return Math.min(Math.max(baseTimeout, 15000), 120000); // 15秒-2分鐘
  }

  private generateReasoning(
    complexity: ContentComplexityMetrics, 
    original: number, 
    final: number
  ): string {
    const reasons: string[] = [];
    
    reasons.push(`Base allocation for ${complexity.level} content: ${original} tokens`);
    
    if (original !== final) {
      const changePercent = Math.round(((final - original) / original) * 100);
      reasons.push(`Adjusted to ${final} tokens (${changePercent > 0 ? '+' : ''}${changePercent}%) based on risk factors`);
    }
    
    reasons.push(`Content metrics: ${complexity.videoMetrics.charactersCount} characters, ${complexity.videoMetrics.scenesCount} scenes`);
    reasons.push(`Estimated content length: ${complexity.contentMetrics.totalContentLength} chars`);
    
    return reasons.join('. ');
  }

  /**
   * 為結構化輸出分配特殊的 token 預算
   */
  allocateForStructuredOutput(complexity: ContentComplexityMetrics, targetLanguage?: string): TokenAllocation {
    // 結構化輸出需要非常保守的 token 分配，因為 Gemini 經常遇到 MAX_TOKENS 問題
    const baseAllocation = this.allocateTokens(complexity, targetLanguage);
    
    // 針對繁體中文使用較寬鬆的限制
    const reductionFactor = (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 0.8 : 0.5;
    let structuredTokens = Math.round(baseAllocation.maxTokens * reductionFactor);
    
    // 根據複雜度進一步調整
    switch (complexity.level) {
      case 'simple':
        structuredTokens = Math.min(structuredTokens, (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 800 : 400);
        break;
      case 'moderate':
        structuredTokens = Math.min(structuredTokens, (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 700 : 350);
        break;
      case 'complex':
        structuredTokens = Math.min(structuredTokens, (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 600 : 300);
        break;
      case 'extreme':
        structuredTokens = Math.min(structuredTokens, (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 500 : 250);
        break;
    }
    
    // 確保最小值但不要太小 - 繁體中文需要更多
    const minStructuredTokens = (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW') ? 400 : 200;
    structuredTokens = Math.max(structuredTokens, minStructuredTokens);
    
    return {
      ...baseAllocation,
      maxTokens: structuredTokens,
      temperature: Math.max(baseAllocation.temperature - 0.2, 0.1), // 更低溫度增加穩定性
      reasoning: baseAllocation.reasoning + `. Drastically reduced to ${structuredTokens} tokens for structured output to prevent MAX_TOKENS issue.`
    };
  }

  /**
   * 為標準輸出分配 token 預算
   */
  allocateForStandardOutput(complexity: ContentComplexityMetrics, targetLanguage?: string): TokenAllocation {
    // 標準輸出可以使用完整的 token 預算
    return this.allocateTokens(complexity, targetLanguage);
  }

  /**
   * 動態調整 token 分配（基於運行時反饋）
   */
  adjustAllocation(
    currentAllocation: TokenAllocation, 
    feedback: {
      wasTokenLimitHit?: boolean;
      processingTime?: number;
      jsonTruncated?: boolean;
      finishReason?: string;
      isStructuredOutput?: boolean;
    }
  ): TokenAllocation {
    let adjustedTokens = currentAllocation.maxTokens;
    const adjustments: string[] = [];

    // 特別處理 MAX_TOKENS 情況
    if (feedback.finishReason === 'MAX_TOKENS' || feedback.wasTokenLimitHit) {
      if (feedback.isStructuredOutput) {
        // 結構化輸出遇到 MAX_TOKENS，大幅減少
        adjustedTokens = Math.round(adjustedTokens * 0.6);
        adjustments.push('Drastically reduced due to MAX_TOKENS in structured output');
      } else {
        adjustedTokens = Math.round(adjustedTokens * 0.7);
        adjustments.push('Reduced tokens due to MAX_TOKENS');
      }
    }

    // JSON 截斷處理
    if (feedback.jsonTruncated) {
      adjustedTokens = Math.round(adjustedTokens * 0.65);
      adjustments.push('Reduced tokens due to JSON truncation');
    }

    // 如果處理時間過長
    if (feedback.processingTime && feedback.processingTime > 45000) { // 45秒
      adjustedTokens = Math.round(adjustedTokens * 0.9);
      adjustments.push('Reduced tokens due to slow processing');
    }

    // 確保最小值，但對結構化輸出更嚴格
    const minTokens = feedback.isStructuredOutput ? 150 : 300;
    adjustedTokens = Math.max(adjustedTokens, minTokens);

    return {
      ...currentAllocation,
      maxTokens: adjustedTokens,
      temperature: feedback.wasTokenLimitHit ? Math.max(currentAllocation.temperature - 0.1, 0.1) : currentAllocation.temperature,
      reasoning: currentAllocation.reasoning + '. Dynamically adjusted: ' + adjustments.join(', ')
    };
  }
}

// 單例實例
export const tokenAllocationManager = new TokenAllocationManager();