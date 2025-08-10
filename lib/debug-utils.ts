/**
 * Debug utilities for troubleshooting Vertex AI and Gemini issues
 */

export interface DebugInfo {
  timestamp: string;
  environment: {
    projectId: string;
    location: string;
    geminiModel: string;
    nodeEnv: string;
  };
  performance: {
    totalTime: number;
    steps: Array<{
      name: string;
      duration: number;
      success: boolean;
      error?: string;
    }>;
  };
  errors: Array<{
    step: string;
    error: string;
    stack?: string;
    retryAttempt?: number;
  }>;
}

export class DebugTracker {
  private startTime: number;
  private steps: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    success?: boolean;
    error?: string;
  }> = [];
  private errors: Array<{
    step: string;
    error: string;
    stack?: string;
    retryAttempt?: number;
  }> = [];

  constructor(private operationName: string) {
    this.startTime = Date.now();
    console.log(`🔍 Debug tracking started for: ${operationName}`);
  }

  startStep(stepName: string) {
    console.log(`📍 Starting step: ${stepName}`);
    this.steps.push({
      name: stepName,
      startTime: Date.now()
    });
  }

  endStep(stepName: string, success: boolean = true, error?: string) {
    const step = this.steps.find(s => s.name === stepName && !s.endTime);
    if (step) {
      step.endTime = Date.now();
      step.success = success;
      step.error = error;
      
      const duration = step.endTime - step.startTime;
      const status = success ? '✅' : '❌';
      console.log(`${status} Completed step: ${stepName} (${duration}ms)${error ? ` - ${error}` : ''}`);
    }
  }

  addError(step: string, error: Error | string, retryAttempt?: number) {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    this.errors.push({
      step,
      error: errorMessage,
      stack,
      retryAttempt
    });
    
    console.error(`🚨 Error in ${step}${retryAttempt ? ` (attempt ${retryAttempt})` : ''}:`, errorMessage);
  }

  getDebugInfo(): DebugInfo {
    const totalTime = Date.now() - this.startTime;
    
    const performanceSteps = this.steps.map(step => ({
      name: step.name,
      duration: step.endTime ? step.endTime - step.startTime : Date.now() - step.startTime,
      success: step.success ?? false,
      error: step.error
    }));

    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        projectId: process.env.PROJECT_ID || 'not-set',
        location: process.env.LOCATION || 'not-set',
        geminiModel: process.env.GEMINI_MODEL || 'not-set',
        nodeEnv: process.env.NODE_ENV || 'not-set'
      },
      performance: {
        totalTime,
        steps: performanceSteps
      },
      errors: this.errors
    };

    console.log(`🔍 Debug summary for ${this.operationName}:`, {
      totalTime: `${totalTime}ms`,
      stepsCompleted: performanceSteps.length,
      errorsEncountered: this.errors.length,
      successRate: `${Math.round((performanceSteps.filter(s => s.success).length / performanceSteps.length) * 100)}%`
    });

    return debugInfo;
  }

  logSummary() {
    const debugInfo = this.getDebugInfo();
    
    console.log('\n📊 === DEBUG SUMMARY ===');
    console.log(`Operation: ${this.operationName}`);
    console.log(`Total Time: ${debugInfo.performance.totalTime}ms`);
    console.log(`Environment: ${debugInfo.environment.projectId}/${debugInfo.environment.location}/${debugInfo.environment.geminiModel}`);
    
    if (debugInfo.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      debugInfo.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.step}: ${error.error}`);
      });
    }
    
    console.log('\n⏱️ Step Performance:');
    debugInfo.performance.steps.forEach(step => {
      const status = step.success ? '✅' : '❌';
      console.log(`  ${status} ${step.name}: ${step.duration}ms`);
    });
    
    console.log('📊 === END SUMMARY ===\n');
  }
}

/**
 * Create a debug tracker for an operation
 */
export function createDebugTracker(operationName: string): DebugTracker {
  return new DebugTracker(operationName);
}

/**
 * Log environment information for debugging
 */
export function logEnvironmentInfo() {
  console.log('🌍 Environment Information:');
  console.log('  Project ID:', process.env.PROJECT_ID || 'NOT SET');
  console.log('  Location:', process.env.LOCATION || 'NOT SET');
  console.log('  Gemini Model:', process.env.GEMINI_MODEL || 'NOT SET');
  console.log('  Veo Model:', process.env.MODEL || 'NOT SET');
  console.log('  Node Environment:', process.env.NODE_ENV || 'NOT SET');
  console.log('  GCS Storage URI:', process.env.GCS_VIDEOS_STORAGE_URI || 'NOT SET');
  console.log('  YouTube API Key:', process.env.YOUTUBE_API_KEY ? 'SET' : 'NOT SET');
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): {
  valid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Required variables
  if (!process.env.PROJECT_ID) {
    issues.push('PROJECT_ID is not set');
  }
  if (!process.env.LOCATION) {
    issues.push('LOCATION is not set');
  }
  
  // Optional but recommended variables
  if (!process.env.GEMINI_MODEL) {
    warnings.push('GEMINI_MODEL is not set - will use default gemini-1.5-pro-002');
  }
  if (!process.env.MODEL) {
    warnings.push('MODEL (Veo) is not set - will use default veo-001');
  }
  if (!process.env.GCS_VIDEOS_STORAGE_URI) {
    warnings.push('GCS_VIDEOS_STORAGE_URI is not set - video generation may fail');
  }
  if (!process.env.YOUTUBE_API_KEY) {
    warnings.push('YOUTUBE_API_KEY is not set - Reference tab may not work');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}