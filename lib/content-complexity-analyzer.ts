import { VideoAnalysis } from './gemini-video-analyzer';
import { ReferenceSource } from '@/app/actions/process-reference';
import { logger } from './logger';

export interface ContentComplexityMetrics {
  // 基礎指標
  totalScore: number;           // 0-100 總體複雜度分數
  level: ComplexityLevel;       // 複雜度等級
  
  // 細分評估
  videoMetrics: {
    duration: number;           // 視頻長度
    charactersCount: number;    // 角色數量
    scenesCount: number;        // 場景數量
    dialoguesCount: number;     // 對話數量
    transcriptLength: number;   // 轉錄長度
  };
  
  contentMetrics: {
    totalContentLength: number;      // 總內容長度
    structuredDataSize: number;      // 結構化資料大小
    analysisDataComplexity: number;  // 分析資料複雜度
  };
  
  riskFactors: {
    tokenOverflowRisk: RiskLevel;
    processingTimeRisk: RiskLevel;
    jsonTruncationRisk: RiskLevel;
  };
  
  recommendedTokenBudget: number;
  recommendedStrategy: ProcessingStrategy;
  shouldUseStructuredOutput: boolean;
}

export enum ComplexityLevel {
  SIMPLE = 'simple',      // 0-30分：短視頻，少角色，簡單內容
  MODERATE = 'moderate',  // 31-65分：中等複雜度
  COMPLEX = 'complex',    // 66-85分：高複雜度，多角色多場景
  EXTREME = 'extreme'     // 86-100分：極度複雜，需特殊處理
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ProcessingStrategy {
  useStructuredOutput: boolean;
  contentSimplification: 'none' | 'moderate' | 'aggressive';
  tokenBudget: number;
  fallbackStrategy: 'standard' | 'simplified' | 'minimal';
  maxProcessingTime: number;
}

// 複雜度分級標準 - 更保守的token分配來避免MAX_TOKENS問題
export const COMPLEXITY_THRESHOLDS = {
  [ComplexityLevel.SIMPLE]: { 
    max: 30, 
    tokenBudget: 800,  // 從2000大幅降低到800
    useStructuredOutput: true,
    maxProcessingTime: 20000 
  },
  [ComplexityLevel.MODERATE]: { 
    max: 65, 
    tokenBudget: 600,  // 從1500降低到600
    useStructuredOutput: true,  // moderate仍然可以嘗試結構化輸出
    maxProcessingTime: 30000 
  },
  [ComplexityLevel.COMPLEX]: { 
    max: 85, 
    tokenBudget: 500,  // 從1000降低到500
    useStructuredOutput: false, // 複雜內容不使用結構化輸出
    maxProcessingTime: 45000 
  },
  [ComplexityLevel.EXTREME]: { 
    max: 100, 
    tokenBudget: 400,  // 從800降低到400
    useStructuredOutput: false,
    maxProcessingTime: 60000 
  }
} as const;

export class ContentComplexityAnalyzer {
  private readonly weights = {
    duration: 0.15,        // 視頻長度影響 15%
    characters: 0.25,      // 角色數量影響 25%
    scenes: 0.20,          // 場景數量影響 20%
    dialogues: 0.15,       // 對話數量影響 15%
    transcriptLength: 0.25 // 轉錄長度影響 25%
  };

  /**
   * 分析內容複雜度
   */
  analyzeComplexity(videoAnalysis: VideoAnalysis | undefined, source: ReferenceSource): ContentComplexityMetrics {
    logger.info('🔍 Starting content complexity analysis', {
      hasVideoAnalysis: !!videoAnalysis,
      sourceType: source.type,
      duration: source.duration
    });

    // 如果沒有視頻分析，使用基礎評估
    if (!videoAnalysis) {
      return this.createBasicComplexityMetrics(source);
    }

    // 計算各項指標分數 (0-100)
    const scores = {
      duration: this.scoreDuration(source.duration || 0),
      characters: this.scoreCharacters(videoAnalysis.characters?.length || 0),
      scenes: this.scoreScenes(videoAnalysis.sceneBreakdown?.length || 0),
      dialogues: this.scoreDialogues(videoAnalysis.dialogues?.length || 0),
      transcriptLength: this.scoreTranscript(videoAnalysis.generatedTranscript?.length || 0)
    };

    // 加權計算總分
    const totalScore = Object.keys(this.weights).reduce((sum, key) => {
      const score = scores[key as keyof typeof scores];
      const weight = this.weights[key as keyof typeof this.weights];
      const weightedScore = (score || 0) * (weight || 0);
      return sum + (isNaN(weightedScore) ? 0 : weightedScore);
    }, 0);

    // 構建完整的複雜度指標
    const validTotalScore = isNaN(totalScore) ? 0 : totalScore;
    return this.buildComplexityMetrics(scores, validTotalScore, videoAnalysis, source);
  }

  private scoreDuration(duration: number): number {
    // 視頻長度評分：0-15秒=0分，15-30秒=25分，30-45秒=50分，45-60秒=75分，>60秒=100分
    if (duration <= 15) return 0;
    if (duration <= 30) return 25;
    if (duration <= 45) return 50;
    if (duration <= 60) return 75;
    return 100;
  }

  private scoreCharacters(count: number): number {
    // 角色數量評分：0個=0分，1個=10分，2-3個=30分，4-5個=60分，>5個=100分
    if (count === 0) return 0;
    if (count === 1) return 10;
    if (count <= 3) return 30;
    if (count <= 5) return 60;
    return 100;
  }

  private scoreScenes(count: number): number {
    // 場景數量評分：0-2個=0分，3-5個=25分，6-8個=50分，9-12個=75分，>12個=100分
    if (count <= 2) return 0;
    if (count <= 5) return 25;
    if (count <= 8) return 50;
    if (count <= 12) return 75;
    return 100;
  }

  private scoreDialogues(count: number): number {
    // 對話數量評分：0個=0分，1-2個=20分，3-5個=40分，6-10個=70分，>10個=100分
    if (count === 0) return 0;
    if (count <= 2) return 20;
    if (count <= 5) return 40;
    if (count <= 10) return 70;
    return 100;
  }

  private scoreTranscript(length: number): number {
    // 轉錄長度評分：<100字=0分，100-300字=20分，300-600字=50分，600-1000字=80分，>1000字=100分
    if (length < 100) return 0;
    if (length < 300) return 20;
    if (length < 600) return 50;
    if (length < 1000) return 80;
    return 100;
  }

  private buildComplexityMetrics(
    scores: Record<string, number>, 
    totalScore: number, 
    videoAnalysis: VideoAnalysis, 
    source: ReferenceSource
  ): ContentComplexityMetrics {
    // Ensure totalScore is valid
    const validTotalScore = isNaN(totalScore) ? 0 : totalScore;
    const level = this.getComplexityLevel(validTotalScore);
    const riskFactors = this.assessRiskFactors(validTotalScore, videoAnalysis, source);
    const strategy = this.getProcessingStrategy(level, riskFactors);

    const metrics: ContentComplexityMetrics = {
      totalScore: Math.round(validTotalScore),
      level,
      videoMetrics: {
        duration: source.duration || 0,
        charactersCount: videoAnalysis.characters?.length || 0,
        scenesCount: videoAnalysis.sceneBreakdown?.length || 0,
        dialoguesCount: videoAnalysis.dialogues?.length || 0,
        transcriptLength: videoAnalysis.generatedTranscript?.length || 0
      },
      contentMetrics: {
        totalContentLength: this.calculateTotalContentLength(videoAnalysis, source),
        structuredDataSize: this.calculateStructuredDataSize(videoAnalysis),
        analysisDataComplexity: Math.round(validTotalScore)
      },
      riskFactors,
      recommendedTokenBudget: strategy.tokenBudget,
      recommendedStrategy: strategy,
      shouldUseStructuredOutput: strategy.useStructuredOutput
    };

    logger.info('✅ Content complexity analysis completed', {
      totalScore: metrics.totalScore,
      level: metrics.level,
      tokenBudget: metrics.recommendedTokenBudget,
      useStructuredOutput: metrics.shouldUseStructuredOutput
    });

    return metrics;
  }

  private createBasicComplexityMetrics(source: ReferenceSource): ContentComplexityMetrics {
    // 無視頻分析時的基礎評估
    const duration = source.duration || 0;
    const transcriptLength = source.transcript?.length || 0;
    
    // 基於可用信息的簡單評估
    let totalScore = 0;
    totalScore += this.scoreDuration(duration) * 0.4;
    totalScore += this.scoreTranscript(transcriptLength) * 0.6;
    
    const level = this.getComplexityLevel(totalScore);
    const riskFactors: ContentComplexityMetrics['riskFactors'] = {
      tokenOverflowRisk: 'low',
      processingTimeRisk: duration > 45 ? 'medium' : 'low',
      jsonTruncationRisk: 'low'
    };
    
    const strategy = this.getProcessingStrategy(level, riskFactors);
    const validTotalScore = isNaN(totalScore) ? 0 : totalScore;

    return {
      totalScore: Math.round(validTotalScore),
      level,
      videoMetrics: {
        duration,
        charactersCount: 0,
        scenesCount: 0,
        dialoguesCount: 0,
        transcriptLength
      },
      contentMetrics: {
        totalContentLength: transcriptLength + (source.description?.length || 0),
        structuredDataSize: 0,
        analysisDataComplexity: Math.round(validTotalScore)
      },
      riskFactors,
      recommendedTokenBudget: strategy.tokenBudget,
      recommendedStrategy: strategy,
      shouldUseStructuredOutput: strategy.useStructuredOutput
    };
  }

  private getComplexityLevel(score: number): ComplexityLevel {
    if (score <= COMPLEXITY_THRESHOLDS[ComplexityLevel.SIMPLE].max) return ComplexityLevel.SIMPLE;
    if (score <= COMPLEXITY_THRESHOLDS[ComplexityLevel.MODERATE].max) return ComplexityLevel.MODERATE;
    if (score <= COMPLEXITY_THRESHOLDS[ComplexityLevel.COMPLEX].max) return ComplexityLevel.COMPLEX;
    return ComplexityLevel.EXTREME;
  }

  private assessRiskFactors(
    totalScore: number, 
    videoAnalysis: VideoAnalysis, 
    source: ReferenceSource
  ): ContentComplexityMetrics['riskFactors'] {
    const totalContentLength = this.calculateTotalContentLength(videoAnalysis, source);
    
    return {
      tokenOverflowRisk: this.assessTokenOverflowRisk(totalScore, totalContentLength),
      processingTimeRisk: this.assessProcessingTimeRisk(totalScore, source.duration || 0),
      jsonTruncationRisk: this.assessJsonTruncationRisk(totalScore, videoAnalysis)
    };
  }

  private assessTokenOverflowRisk(score: number, contentLength: number): RiskLevel {
    if (score >= 80 || contentLength > 3000) return 'high';
    if (score >= 60 || contentLength > 2000) return 'medium';
    return 'low';
  }

  private assessProcessingTimeRisk(score: number, duration: number): RiskLevel {
    if (score >= 80 || duration > 60) return 'high';
    if (score >= 60 || duration > 45) return 'medium';
    return 'low';
  }

  private assessJsonTruncationRisk(score: number, videoAnalysis: VideoAnalysis): RiskLevel {
    const structuredDataSize = this.calculateStructuredDataSize(videoAnalysis);
    if (score >= 80 || structuredDataSize > 2000) return 'high';
    if (score >= 60 || structuredDataSize > 1500) return 'medium';
    return 'low';
  }

  private getProcessingStrategy(level: ComplexityLevel, riskFactors: ContentComplexityMetrics['riskFactors']): ProcessingStrategy {
    const baseStrategy = COMPLEXITY_THRESHOLDS[level];
    
    let adjustedTokenBudget = baseStrategy.tokenBudget;
    
    // 根據風險因素調整 token 預算
    if (riskFactors.tokenOverflowRisk === 'high') {
      adjustedTokenBudget *= 0.7;
    } else if (riskFactors.tokenOverflowRisk === 'medium') {
      adjustedTokenBudget *= 0.85;
    }

    return {
      useStructuredOutput: baseStrategy.useStructuredOutput && riskFactors.jsonTruncationRisk === 'low',
      contentSimplification: this.getSimplificationLevel(level, riskFactors),
      tokenBudget: Math.round(adjustedTokenBudget),
      fallbackStrategy: this.getFallbackStrategy(level),
      maxProcessingTime: baseStrategy.maxProcessingTime
    };
  }

  private getSimplificationLevel(level: ComplexityLevel, riskFactors: ContentComplexityMetrics['riskFactors']): ProcessingStrategy['contentSimplification'] {
    if (level === ComplexityLevel.EXTREME || riskFactors.tokenOverflowRisk === 'high') {
      return 'aggressive';
    }
    if (level === ComplexityLevel.COMPLEX || riskFactors.processingTimeRisk === 'high') {
      return 'moderate';
    }
    return 'none';
  }

  private getFallbackStrategy(level: ComplexityLevel): ProcessingStrategy['fallbackStrategy'] {
    switch (level) {
      case ComplexityLevel.EXTREME: return 'minimal';
      case ComplexityLevel.COMPLEX: return 'simplified';
      default: return 'standard';
    }
  }

  private calculateTotalContentLength(videoAnalysis: VideoAnalysis, source: ReferenceSource): number {
    let totalLength = 0;
    
    // 基礎內容長度
    totalLength += source.transcript?.length || 0;
    totalLength += source.description?.length || 0;
    
    // 視頻分析內容長度
    if (videoAnalysis) {
      totalLength += videoAnalysis.generatedTranscript?.length || 0;
      totalLength += (videoAnalysis.characters?.length || 0) * 100; // 估算每個角色描述約100字
      totalLength += (videoAnalysis.sceneBreakdown?.length || 0) * 80; // 估算每個場景描述約80字
      totalLength += (videoAnalysis.dialogues?.length || 0) * 50; // 估算每個對話約50字
    }
    
    return totalLength;
  }

  private calculateStructuredDataSize(videoAnalysis: VideoAnalysis): number {
    if (!videoAnalysis) return 0;
    
    // 估算結構化資料的 JSON 大小
    const estimatedSize = 
      (videoAnalysis.characters?.length || 0) * 200 +
      (videoAnalysis.sceneBreakdown?.length || 0) * 150 +
      (videoAnalysis.dialogues?.length || 0) * 100 +
      (videoAnalysis.visualElements?.length || 0) * 80 +
      (videoAnalysis.keyMoments?.length || 0) * 60;
    
    return estimatedSize;
  }
}

// 單例實例
export const contentComplexityAnalyzer = new ContentComplexityAnalyzer();