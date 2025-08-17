import { VideoAnalysis } from './gemini-video-analyzer';
import { ReferenceSource } from '@/app/actions/process-reference';
import { ContentComplexityMetrics, ComplexityLevel } from './content-complexity-analyzer';
import { logger } from './logger';

export interface ProcessedContent {
  content: string;
  contentQuality: 'full' | 'partial' | 'metadata-only';
  warning?: string;
  processingStrategy: string;
  tokenEstimate: number;
  simplificationApplied: boolean;
}

export class AdaptiveContentProcessor {
  
  /**
   * 根據複雜度指標處理內容
   */
  processContent(
    source: ReferenceSource,
    complexity: ContentComplexityMetrics
  ): ProcessedContent {
    logger.info('🔄 Starting adaptive content processing', {
      complexityLevel: complexity.level,
      totalScore: complexity.totalScore,
      tokenBudget: complexity.recommendedTokenBudget
    });

    // 根據複雜度等級選擇處理策略
    switch (complexity.level) {
      case ComplexityLevel.SIMPLE:
        return this.processSimpleContent(source, complexity);
      
      case ComplexityLevel.MODERATE:
        return this.processModerateContent(source, complexity);
      
      case ComplexityLevel.COMPLEX:
        return this.processComplexContent(source, complexity);
      
      case ComplexityLevel.EXTREME:
        return this.processExtremeContent(source, complexity);
      
      default:
        return this.processSimpleContent(source, complexity);
    }
  }

  private processSimpleContent(
    source: ReferenceSource,
    complexity: ContentComplexityMetrics
  ): ProcessedContent {
    let content = '';
    
    // 簡單內容：完整使用所有可用信息
    if (source.hasVideoAnalysis && source.videoAnalysis) {
      content = this.buildFullVideoAnalysisContent(source, source.videoAnalysis);
    } else if (source.transcript && source.transcript.trim().length > 0) {
      content = this.buildTranscriptContent(source);
    } else {
      content = this.buildBasicContent(source);
    }

    const tokenEstimate = this.estimateTokens(content);
    
    logger.info('✅ Simple content processed', {
      contentLength: content.length,
      tokenEstimate,
      hasVideoAnalysis: !!source.videoAnalysis
    });

    return {
      content,
      contentQuality: source.hasVideoAnalysis ? 'full' : (source.transcript ? 'full' : 'partial'),
      processingStrategy: 'simple_full_content',
      tokenEstimate,
      simplificationApplied: false
    };
  }

  private processModerateContent(
    source: ReferenceSource,
    complexity: ContentComplexityMetrics
  ): ProcessedContent {
    let content = '';
    let warning: string | undefined;
    
    if (source.hasVideoAnalysis && source.videoAnalysis) {
      // 中等複雜度：保留重要信息，輕微簡化
      content = this.buildOptimizedVideoAnalysisContent(source, source.videoAnalysis);
    } else if (source.transcript) {
      content = this.buildTranscriptContent(source);
    } else {
      content = this.buildBasicContent(source);
    }

    const tokenEstimate = this.estimateTokens(content);
    
    // 如果仍然超過 token 預算，進行輕微裁剪
    if (tokenEstimate > complexity.recommendedTokenBudget) {
      content = this.lightTruncation(content, complexity.recommendedTokenBudget);
      warning = 'Content lightly optimized for processing efficiency.';
    }

    logger.info('✅ Moderate content processed', {
      contentLength: content.length,
      tokenEstimate: this.estimateTokens(content),
      simplified: !!warning
    });

    return {
      content,
      contentQuality: 'full',
      warning,
      processingStrategy: 'moderate_optimized_content',
      tokenEstimate: this.estimateTokens(content),
      simplificationApplied: !!warning
    };
  }

  private processComplexContent(
    source: ReferenceSource,
    complexity: ContentComplexityMetrics
  ): ProcessedContent {
    let content = '';
    
    if (source.hasVideoAnalysis && source.videoAnalysis) {
      // 複雜內容：智能簡化，保留最重要的信息
      content = this.buildSimplifiedVideoAnalysisContent(source, source.videoAnalysis);
    } else if (source.transcript) {
      content = this.buildTranscriptContent(source, true); // 簡化版本
    } else {
      content = this.buildBasicContent(source);
    }

    // 確保符合 token 預算
    content = this.smartTruncation(content, complexity.recommendedTokenBudget);

    logger.info('✅ Complex content processed with simplification', {
      contentLength: content.length,
      tokenEstimate: this.estimateTokens(content)
    });

    return {
      content,
      contentQuality: 'partial',
      warning: 'Content simplified due to complexity for optimal processing.',
      processingStrategy: 'complex_simplified_content',
      tokenEstimate: this.estimateTokens(content),
      simplificationApplied: true
    };
  }

  private processExtremeContent(
    source: ReferenceSource,
    complexity: ContentComplexityMetrics
  ): ProcessedContent {
    // 極度複雜：大幅簡化，只保留核心信息
    let content = this.buildMinimalContent(source);
    
    // 嚴格控制長度
    content = this.aggressiveTruncation(content, complexity.recommendedTokenBudget);

    logger.info('✅ Extreme content processed with aggressive simplification', {
      contentLength: content.length,
      tokenEstimate: this.estimateTokens(content)
    });

    return {
      content,
      contentQuality: 'metadata-only',
      warning: 'Content heavily simplified due to extreme complexity.',
      processingStrategy: 'extreme_minimal_content',
      tokenEstimate: this.estimateTokens(content),
      simplificationApplied: true
    };
  }

  private buildFullVideoAnalysisContent(source: ReferenceSource, analysis: VideoAnalysis): string {
    let content = `Title: ${source.title || 'Untitled'}\n\n`;
    
    // 完整的視頻分析內容
    if (analysis.generatedTranscript) {
      content += `Generated Transcript: ${analysis.generatedTranscript}\n\n`;
    }
    
    // 完整的角色描述
    if (analysis.characters && analysis.characters.length > 0) {
      content += `Characters:\n`;
      analysis.characters.forEach((char, index) => {
        content += `${index + 1}. ${char.name}: ${char.description} (${char.role})\n`;
        content += `   - Characteristics: ${char.characteristics}\n`;
      });
      content += '\n';
    }
    
    // 完整的場景分解
    if (analysis.sceneBreakdown && analysis.sceneBreakdown.length > 0) {
      content += `Scene Breakdown:\n`;
      analysis.sceneBreakdown.forEach((scene, index) => {
        content += `${index + 1}. ${scene.description} (${scene.startTime}s-${scene.endTime}s)\n`;
        content += `   - Setting: ${scene.setting}\n`;
        content += `   - Actions: ${scene.actions.join(', ')}\n`;
      });
      content += '\n';
    }
    
    // 故事結構
    if (analysis.storyStructure) {
      content += `Story Structure:\n`;
      content += `- Hook: ${analysis.storyStructure.hook}\n`;
      content += `- Development: ${analysis.storyStructure.development}\n`;
      content += `- Climax: ${analysis.storyStructure.climax}\n`;
      content += `- Resolution: ${analysis.storyStructure.resolution}\n\n`;
    }
    
    // 關鍵對話
    if (analysis.dialogues && analysis.dialogues.length > 0) {
      content += `Key Dialogues:\n`;
      analysis.dialogues.forEach((dialogue, index) => {
        content += `${index + 1}. ${dialogue.speaker}: "${dialogue.text}" (${dialogue.emotion})\n`;
      });
      content += '\n';
    }
    
    // 情緒和主題
    content += `Mood: ${analysis.mood}\n`;
    if (analysis.themes && analysis.themes.length > 0) {
      content += `Themes: ${analysis.themes.join(', ')}\n`;
    }
    content += `\nContent Summary: ${analysis.contentSummary}`;
    
    return content;
  }

  private buildOptimizedVideoAnalysisContent(source: ReferenceSource, analysis: VideoAnalysis): string {
    let content = `Title: ${source.title || 'Untitled'}\n\n`;
    
    // 簡化的視頻分析內容 - 保留重要信息
    if (analysis.generatedTranscript) {
      // 限制轉錄長度
      const transcript = analysis.generatedTranscript.length > 400 
        ? analysis.generatedTranscript.substring(0, 400) + '...'
        : analysis.generatedTranscript;
      content += `Generated Transcript: ${transcript}\n\n`;
    }
    
    // 限制角色數量 (最多5個)
    if (analysis.characters && analysis.characters.length > 0) {
      content += `Main Characters:\n`;
      const mainCharacters = analysis.characters.slice(0, 5);
      mainCharacters.forEach((char, index) => {
        content += `${index + 1}. ${char.name}: ${char.description} (${char.role})\n`;
      });
      content += '\n';
    }
    
    // 限制場景數量 (最多8個)
    if (analysis.sceneBreakdown && analysis.sceneBreakdown.length > 0) {
      content += `Key Scenes:\n`;
      const keyScenes = analysis.sceneBreakdown.slice(0, 8);
      keyScenes.forEach((scene, index) => {
        content += `${index + 1}. ${scene.description} (${scene.startTime}s-${scene.endTime}s)\n`;
      });
      content += '\n';
    }
    
    // 簡化的故事結構
    if (analysis.storyStructure) {
      content += `Story: ${analysis.storyStructure.hook} → ${analysis.storyStructure.climax} → ${analysis.storyStructure.resolution}\n\n`;
    }
    
    content += `Mood: ${analysis.mood}\n`;
    content += `Summary: ${analysis.contentSummary}`;
    
    return content;
  }

  private buildSimplifiedVideoAnalysisContent(source: ReferenceSource, analysis: VideoAnalysis): string {
    let content = `Title: ${source.title || 'Untitled'}\n\n`;
    
    // 高度簡化的內容
    if (analysis.generatedTranscript) {
      const transcript = analysis.generatedTranscript.length > 200 
        ? analysis.generatedTranscript.substring(0, 200) + '...'
        : analysis.generatedTranscript;
      content += `Content: ${transcript}\n\n`;
    }
    
    // 只保留前3個主要角色
    if (analysis.characters && analysis.characters.length > 0) {
      const mainCharacters = analysis.characters.slice(0, 3);
      content += `Characters: ${mainCharacters.map(char => `${char.name} (${char.role})`).join(', ')}\n\n`;
    }
    
    // 只保留關鍵場景
    if (analysis.sceneBreakdown && analysis.sceneBreakdown.length > 0) {
      const keyScenes = analysis.sceneBreakdown.slice(0, 4);
      content += `Scenes: ${keyScenes.map(scene => scene.description).join('; ')}\n\n`;
    }
    
    content += `Mood: ${analysis.mood}\n`;
    content += `Summary: ${analysis.contentSummary}`;
    
    return content;
  }

  private buildTranscriptContent(source: ReferenceSource, simplified: boolean = false): string {
    let content = `Title: ${source.title || 'Untitled'}\n\n`;
    
    if (source.transcript) {
      if (simplified && source.transcript.length > 800) {
        content += `Content: ${source.transcript.substring(0, 800)}...`;
      } else {
        content += `Content: ${source.transcript}`;
      }
    }
    
    return content;
  }

  private buildBasicContent(source: ReferenceSource): string {
    let content = `Title: ${source.title || 'Untitled'}\n\n`;
    content += `Description: ${source.description || 'No description available'}`;
    return content;
  }

  private buildMinimalContent(source: ReferenceSource): string {
    return `Title: ${source.title || 'Untitled'}\nBrief: ${(source.description || '').substring(0, 100)}`;
  }

  private lightTruncation(content: string, targetTokens: number): string {
    const targetLength = targetTokens * 3; // 粗略估算：1 token ≈ 3 字符
    if (content.length <= targetLength) return content;
    
    return content.substring(0, targetLength) + '\n\n[Content optimized for processing]';
  }

  private smartTruncation(content: string, targetTokens: number): string {
    const targetLength = targetTokens * 3;
    if (content.length <= targetLength) return content;
    
    // 智能截斷：嘗試在段落邊界截斷
    const truncated = content.substring(0, targetLength);
    const lastNewline = truncated.lastIndexOf('\n\n');
    
    if (lastNewline > targetLength * 0.7) { // 如果能在70%以後找到段落邊界
      return truncated.substring(0, lastNewline) + '\n\n[Content simplified due to complexity]';
    }
    
    return truncated + '\n\n[Content simplified due to complexity]';
  }

  private aggressiveTruncation(content: string, targetTokens: number): string {
    const targetLength = targetTokens * 3;
    if (content.length <= targetLength) return content;
    
    return content.substring(0, targetLength) + '\n[Heavily simplified]';
  }

  private estimateTokens(content: string): number {
    // 粗略的 token 估算：中文約 1.5 字符/token，英文約 4 字符/token
    // 使用混合估算
    return Math.ceil(content.length / 2.5);
  }
}

// 單例實例
export const adaptiveContentProcessor = new AdaptiveContentProcessor();