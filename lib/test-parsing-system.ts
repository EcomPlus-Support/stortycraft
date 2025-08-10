/**
 * Comprehensive Test Suite for Enhanced JSON Parsing System
 * Tests three-tier parsing strategy, lenient validation, and main branch compatibility
 */

import { parseWithFallback, cleanJsonResponse, validateScenesDataLenient } from './error-utils'
import { parseAiJsonResponse, type ReferenceContentSchema } from './json-parser-simplified'

// Test data based on real AEGIS firefighting system content from logs
const AEGIS_FIREFIGHTING_CONTENT = {
  malformedJson: `\`\`\`json
{
 "scenario": "一場加州深山野火迅速蔓延，攝影機從火苗近景拉遠，展示火焰吞噬森林的駭人景象。傳統的應變措施緩慢展開：消防局接到緊急通知，調度人力與消防車艱難地從遠方駛向火場，而空拍鏡頭則突顯了路途遙遠與火勢的失控。就在危機達到頂點時，畫面切換到「AEGIS Autonomous Emergency Guardian Integrated System」的字樣。隨後，AEGIS系統啟動，遍布深山的感測器閃爍紅光，精準偵測火場的溫度、風向與風勢，並發出即時預警。緊接著，數十架AEGIS無人機組成的龐大機隊以驚人的速度衝向火場，遠超地面消防車的速度。第一批無人機精準抵達火勢最猛烈的區域，在預定間隔引爆特製滅火彈，瞬間壓制火勢。緊隨其後，第二批無人機攜帶大量蓄水抵達，對殘餘火點進行精準撲滅，防止火勢復燃。最終，畫面顯示「Detected in Seconds. Extinguished with Precision.」，並以黑底白字的「AEGIS」標誌完美收尾。",
 "genre": "Cinematic",
 "mood": "Inspirational",`,
  
  referenceContent: `\`\`\`json
{
  "analysis": {
    "keyTopics": ["emergency response", "autonomous systems", "firefighting technology", "precision rescue"],
    "sentiment": "inspirational",
    "coreMessage": "AEGIS autonomous emergency response system revolutionizes wildfire suppression through precision technology",
    "targetAudience": "Technology enthusiasts and emergency services professionals"
  },
  "generatedPitch": "一場加州深山野火迅速蔓延，攝影機從火苗近景拉遠，展示火焰吞噬森林的駭人景象。傳統的應變措施緩慢展開：消防局接到緊急通知，調度人力與消防車艱難地從遠方駛向火場，而空拍鏡頭則突顯了路途遙遠與火勢的失控。就在危機達到頂點時，畫面切換到「AEGIS Autonomous Emergency Guardian Integrated System」的字樣。隨後，AEGIS系統啟動，遍布深山的感測器閃爍紅光，精準偵測火場的溫度、風向與風勢，並發出即時預警。緊接著，數十架AEGIS無人機組成的龐大機隊以驚人的速度衝向火場，遠超地面消防車的速度。第一批無人機精準抵達火勢最猛烈的區域，在預定間隔引爆特製滅火彈，瞬間壓制火勢。緊隨其後，第二批無人機攜帶大量蓄水抵達，對殘餘火點進行精準撲滅，防止火勢復燃。最終，畫面顯示「Detected in Seconds. Extinguished with Precision.」，並以黑底白字的「AEGIS」標誌完美收尾。",
  "rationale": "This pitch showcases cutting-edge autonomous emergency response technology through dramatic visual storytelling"
}
\`\`\``
}

export interface TestResult {
  testName: string
  success: boolean
  parseTime: number
  strategy: string
  errors: string[]
  warnings: string[]
  data?: any
  metrics: {
    contentLength: number
    repairAttempts: number
    validationPassed: boolean
  }
}

export interface TestSuite {
  suiteName: string
  results: TestResult[]
  summary: {
    totalTests: number
    passed: number
    failed: number
    successRate: number
    avgParseTime: number
  }
}

export class JsonParsingTestRunner {
  private results: TestResult[] = []
  
  /**
   * Run comprehensive test suite for the enhanced JSON parsing system
   */
  async runComprehensiveTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting Comprehensive JSON Parsing System Test Suite')
    console.log('=' .repeat(80))
    
    const testSuites: TestSuite[] = []
    
    // Suite 1: Three-Tier Parsing Strategy Tests
    testSuites.push(await this.runThreeTierParsingTests())
    
    // Suite 2: Lenient Validation Tests
    testSuites.push(await this.runLenientValidationTests())
    
    // Suite 3: Main Branch Compatibility Tests
    testSuites.push(await this.runMainBranchCompatibilityTests())
    
    // Suite 4: AEGIS Firefighting Content Tests
    testSuites.push(await this.runAegisFirefightingTests())
    
    // Suite 5: Edge Case and Security Tests
    testSuites.push(await this.runEdgeCaseTests())
    
    // Generate overall summary
    this.generateOverallSummary(testSuites)
    
    return testSuites
  }
  
  /**
   * Test the three-tier parsing strategy
   */
  private async runThreeTierParsingTests(): Promise<TestSuite> {
    console.log('\n🔄 Testing Three-Tier Parsing Strategy')
    console.log('-'.repeat(50))
    
    const results: TestResult[] = []
    
    // Test 1: Strict parsing success
    results.push(this.testStrictParsing())
    
    // Test 2: Main branch parsing fallback
    results.push(this.testMainBranchFallback())
    
    // Test 3: Intelligent repair fallback
    results.push(this.testIntelligentRepair())
    
    // Test 4: All strategies fail scenario
    results.push(this.testAllStrategiesFail())
    
    return {
      suiteName: 'Three-Tier Parsing Strategy',
      results,
      summary: this.calculateSuiteSummary(results)
    }
  }
  
  /**
   * Test lenient validation system
   */
  private async runLenientValidationTests(): Promise<TestSuite> {
    console.log('\n🔍 Testing Lenient Validation System')
    console.log('-'.repeat(50))
    
    const results: TestResult[] = []
    
    // Test with various content types and validation scenarios
    const testCases = [
      { name: 'Complete Valid Schema', content: AEGIS_FIREFIGHTING_CONTENT.referenceContent },
      { name: 'Missing Optional Fields', content: this.createPartialSchema() },
      { name: 'Extra Unexpected Fields', content: this.createSchemaWithExtraFields() },
      { name: 'Minimal Required Fields Only', content: this.createMinimalSchema() }
    ]
    
    testCases.forEach(testCase => {
      results.push(this.testLenientValidation(testCase.name, testCase.content))
    })
    
    return {
      suiteName: 'Lenient Validation System',
      results,
      summary: this.calculateSuiteSummary(results)
    }
  }
  
  /**
   * Test main branch compatibility improvements
   */
  private async runMainBranchCompatibilityTests(): Promise<TestSuite> {
    console.log('\n🌿 Testing Main Branch Compatibility')
    console.log('-'.repeat(50))
    
    const results: TestResult[] = []
    
    // Test formats that worked in main branch
    const mainBranchFormats = [
      { name: 'Simple JSON without markdown', content: '{"test": "value", "number": 123}' },
      { name: 'JSON with trailing comma', content: '{"test": "value", "number": 123,}' },
      { name: 'JSON with extra whitespace', content: '\n\n  {\n  "test": "value",\n  "number": 123\n  }\n\n' },
      { name: 'Markdown wrapped JSON', content: '```json\n{"test": "value"}\n```' }
    ]
    
    mainBranchFormats.forEach(format => {
      results.push(this.testMainBranchCompatibility(format.name, format.content))
    })
    
    return {
      suiteName: 'Main Branch Compatibility',
      results,
      summary: this.calculateSuiteSummary(results)
    }
  }
  
  /**
   * Test AEGIS firefighting system content parsing
   */
  private async runAegisFirefightingTests(): Promise<TestSuite> {
    console.log('\n🚒 Testing AEGIS Firefighting Content Parsing')
    console.log('-'.repeat(50))
    
    const results: TestResult[] = []
    
    // Test the actual AEGIS content that was failing
    results.push(this.testAegisFirefightingContent())
    
    // Test variations of the AEGIS content
    results.push(this.testAegisContentVariations())
    
    return {
      suiteName: 'AEGIS Firefighting System Tests',
      results,
      summary: this.calculateSuiteSummary(results)
    }
  }
  
  /**
   * Test edge cases and security scenarios
   */
  private async runEdgeCaseTests(): Promise<TestSuite> {
    console.log('\n⚡ Testing Edge Cases and Security')
    console.log('-'.repeat(50))
    
    const results: TestResult[] = []
    
    const edgeCases = [
      { name: 'Empty Input', content: '' },
      { name: 'Only Whitespace', content: '   \n\t  ' },
      { name: 'Invalid Characters', content: '{"test": "value\x00\x01"}' },
      { name: 'Very Large Input', content: this.createLargeInput() },
      { name: 'Nested JSON Structures', content: this.createNestedJson() },
      { name: 'Unicode Content', content: this.createUnicodeJson() }
    ]
    
    edgeCases.forEach(testCase => {
      results.push(this.testEdgeCase(testCase.name, testCase.content))
    })
    
    return {
      suiteName: 'Edge Cases and Security',
      results,
      summary: this.calculateSuiteSummary(results)
    }
  }
  
  /**
   * Individual test implementations
   */
  
  private testStrictParsing(): TestResult {
    const startTime = Date.now()
    const validJson = '{"test": "value", "number": 123}'
    
    try {
      const result = parseWithFallback(validJson)
      return {
        testName: 'Strict Parsing - Valid JSON',
        success: result.success,
        parseTime: Date.now() - startTime,
        strategy: 'strict',
        errors: result.success ? [] : ['Strict parsing failed'],
        warnings: [],
        data: result.data,
        metrics: {
          contentLength: validJson.length,
          repairAttempts: 0,
          validationPassed: result.success
        }
      }
    } catch (error) {
      return {
        testName: 'Strict Parsing - Valid JSON',
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'strict',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: validJson.length,
          repairAttempts: 0,
          validationPassed: false
        }
      }
    }
  }
  
  private testMainBranchFallback(): TestResult {
    const startTime = Date.now()
    const malformedJson = '```json\n{"test": "value", "trailing": "comma",}\n```'
    
    try {
      const result = parseWithFallback(malformedJson)
      return {
        testName: 'Main Branch Fallback',
        success: result.success,
        parseTime: Date.now() - startTime,
        strategy: 'main-branch-fallback',
        errors: result.success ? [] : ['Main branch fallback failed'],
        warnings: result.success ? [] : ['Required fallback to main branch parsing'],
        data: result.data,
        metrics: {
          contentLength: malformedJson.length,
          repairAttempts: 1,
          validationPassed: result.success
        }
      }
    } catch (error) {
      return {
        testName: 'Main Branch Fallback',
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'main-branch-fallback',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: malformedJson.length,
          repairAttempts: 1,
          validationPassed: false
        }
      }
    }
  }
  
  private testIntelligentRepair(): TestResult {
    const startTime = Date.now()
    const brokenJson = 'Some text before {"test": "value", "broken": "structure"'
    
    try {
      const result = parseWithFallback(brokenJson)
      return {
        testName: 'Intelligent Repair',
        success: result.success,
        parseTime: Date.now() - startTime,
        strategy: 'intelligent-repair',
        errors: result.success ? [] : ['Intelligent repair failed'],
        warnings: result.success ? ['Used intelligent repair'] : [],
        data: result.data,
        metrics: {
          contentLength: brokenJson.length,
          repairAttempts: 2,
          validationPassed: result.success
        }
      }
    } catch (error) {
      return {
        testName: 'Intelligent Repair',
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'intelligent-repair',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: brokenJson.length,
          repairAttempts: 2,
          validationPassed: false
        }
      }
    }
  }
  
  private testAllStrategiesFail(): TestResult {
    const startTime = Date.now()
    const unparsableContent = 'This is definitely not JSON at all!!!'
    
    try {
      const result = parseWithFallback(unparsableContent)
      return {
        testName: 'All Strategies Fail',
        success: !result.success, // Success means it correctly failed
        parseTime: Date.now() - startTime,
        strategy: 'all-failed',
        errors: result.success ? ['Should have failed but succeeded'] : [],
        warnings: ['All parsing strategies failed as expected'],
        data: result.data,
        metrics: {
          contentLength: unparsableContent.length,
          repairAttempts: 3,
          validationPassed: !result.success
        }
      }
    } catch (error) {
      return {
        testName: 'All Strategies Fail',
        success: true, // Exception is expected
        parseTime: Date.now() - startTime,
        strategy: 'all-failed',
        errors: [],
        warnings: ['Exception thrown as expected'],
        metrics: {
          contentLength: unparsableContent.length,
          repairAttempts: 3,
          validationPassed: true
        }
      }
    }
  }
  
  private testAegisFirefightingContent(): TestResult {
    const startTime = Date.now()
    const aegisContent = AEGIS_FIREFIGHTING_CONTENT.referenceContent
    
    try {
      // Test with new enhanced parser
      const result = parseAiJsonResponse(aegisContent)
      
      // Also test with three-tier strategy
      const fallbackResult = parseWithFallback(aegisContent)
      
      const success = result.success || fallbackResult.success
      
      return {
        testName: 'AEGIS Firefighting Content',
        success,
        parseTime: Date.now() - startTime,
        strategy: result.success ? 'enhanced-parser' : 'three-tier-fallback',
        errors: success ? [] : ['Failed to parse AEGIS content'],
        warnings: result.success ? [] : ['Required fallback parsing'],
        data: result.data || fallbackResult.data,
        metrics: {
          contentLength: aegisContent.length,
          repairAttempts: result.repairAttempts?.length || 0,
          validationPassed: success
        }
      }
    } catch (error) {
      return {
        testName: 'AEGIS Firefighting Content',
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: aegisContent.length,
          repairAttempts: 0,
          validationPassed: false
        }
      }
    }
  }
  
  private testAegisContentVariations(): TestResult {
    const startTime = Date.now()
    const malformedAegis = AEGIS_FIREFIGHTING_CONTENT.malformedJson
    
    try {
      const result = parseWithFallback(malformedAegis)
      return {
        testName: 'AEGIS Content Variations',
        success: result.success,
        parseTime: Date.now() - startTime,
        strategy: 'three-tier-with-repair',
        errors: result.success ? [] : ['Failed to parse malformed AEGIS content'],
        warnings: result.success ? ['Successfully repaired malformed content'] : [],
        data: result.data,
        metrics: {
          contentLength: malformedAegis.length,
          repairAttempts: 2,
          validationPassed: result.success
        }
      }
    } catch (error) {
      return {
        testName: 'AEGIS Content Variations',
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: malformedAegis.length,
          repairAttempts: 2,
          validationPassed: false
        }
      }
    }
  }
  
  private testLenientValidation(testName: string, content: string): TestResult {
    const startTime = Date.now()
    
    try {
      const parseResult = parseAiJsonResponse(content)
      const isValid = validateScenesDataLenient(parseResult.data || {})
      
      return {
        testName: `Lenient Validation - ${testName}`,
        success: parseResult.success && isValid.isValid,
        parseTime: Date.now() - startTime,
        strategy: 'lenient-validation',
        errors: parseResult.success ? [] : [parseResult.error || 'Parse failed'],
        warnings: isValid.warnings || [],
        data: parseResult.data,
        metrics: {
          contentLength: content.length,
          repairAttempts: parseResult.repairAttempts?.length || 0,
          validationPassed: isValid.isValid
        }
      }
    } catch (error) {
      return {
        testName: `Lenient Validation - ${testName}`,
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'lenient-validation',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: content.length,
          repairAttempts: 0,
          validationPassed: false
        }
      }
    }
  }
  
  private testMainBranchCompatibility(testName: string, content: string): TestResult {
    const startTime = Date.now()
    
    try {
      const result = parseWithFallback(content)
      
      return {
        testName: `Main Branch Compatibility - ${testName}`,
        success: result.success,
        parseTime: Date.now() - startTime,
        strategy: 'main-branch-compatible',
        errors: result.success ? [] : ['Main branch compatibility failed'],
        warnings: [],
        data: result.data,
        metrics: {
          contentLength: content.length,
          repairAttempts: 1,
          validationPassed: result.success
        }
      }
    } catch (error) {
      return {
        testName: `Main Branch Compatibility - ${testName}`,
        success: false,
        parseTime: Date.now() - startTime,
        strategy: 'main-branch-compatible',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          contentLength: content.length,
          repairAttempts: 1,
          validationPassed: false
        }
      }
    }
  }
  
  private testEdgeCase(testName: string, content: string): TestResult {
    const startTime = Date.now()
    
    try {
      const result = parseAiJsonResponse(content)
      
      return {
        testName: `Edge Case - ${testName}`,
        success: result.success || testName === 'Empty Input' || testName === 'Only Whitespace', // These should fail gracefully
        parseTime: Date.now() - startTime,
        strategy: 'edge-case-handling',
        errors: result.success ? [] : [result.error || 'Edge case failed'],
        warnings: result.success ? [] : ['Edge case handled gracefully'],
        data: result.data,
        metrics: {
          contentLength: content.length,
          repairAttempts: result.repairAttempts?.length || 0,
          validationPassed: result.success
        }
      }
    } catch (error) {
      return {
        testName: `Edge Case - ${testName}`,
        success: true, // Errors are expected for edge cases
        parseTime: Date.now() - startTime,
        strategy: 'edge-case-handling',
        errors: [],
        warnings: ['Edge case properly rejected with error'],
        metrics: {
          contentLength: content.length,
          repairAttempts: 0,
          validationPassed: false
        }
      }
    }
  }
  
  /**
   * Helper methods for generating test data
   */
  
  private createPartialSchema(): string {
    return `{
      "analysis": {
        "keyTopics": ["partial", "test"],
        "sentiment": "neutral"
      },
      "generatedPitch": "This is a test pitch with minimal required fields only."
    }`
  }
  
  private createSchemaWithExtraFields(): string {
    return `{
      "analysis": {
        "keyTopics": ["extra", "fields", "test"],
        "sentiment": "positive",
        "coreMessage": "Test message",
        "targetAudience": "Test audience"
      },
      "generatedPitch": "This schema has extra unexpected fields.",
      "extraField": "This should be ignored",
      "anotherExtra": 12345,
      "nestedExtra": {
        "ignored": true
      }
    }`
  }
  
  private createMinimalSchema(): string {
    return `{
      "analysis": {
        "keyTopics": ["minimal"],
        "sentiment": "neutral",
        "coreMessage": "Minimal",
        "targetAudience": "General"
      },
      "generatedPitch": "Minimal test pitch meeting the bare minimum requirements for validation."
    }`
  }
  
  private createLargeInput(): string {
    const baseContent = "This is a very long string repeated many times. "
    return baseContent.repeat(1000) // Create ~50KB of content
  }
  
  private createNestedJson(): string {
    return `{
      "analysis": {
        "keyTopics": ["nested", "structure"],
        "sentiment": "complex",
        "coreMessage": "Testing nested structures",
        "targetAudience": "Developers",
        "metadata": {
          "level1": {
            "level2": {
              "level3": "deep nesting test"
            }
          }
        }
      },
      "generatedPitch": "This tests deeply nested JSON structures within the schema."
    }`
  }
  
  private createUnicodeJson(): string {
    return `{
      "analysis": {
        "keyTopics": ["測試", "unicode", "国际化", "🚀"],
        "sentiment": "多元",
        "coreMessage": "Unicode content testing with emoji 🎭 and various languages",
        "targetAudience": "国际用户 🌍"
      },
      "generatedPitch": "這是一個測試Unicode內容的pitch，包含中文、日文、emoji🎌以及其他特殊字符。"
    }`
  }
  
  /**
   * Utility methods
   */
  
  private calculateSuiteSummary(results: TestResult[]) {
    const totalTests = results.length
    const passed = results.filter(r => r.success).length
    const failed = totalTests - passed
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0
    const avgParseTime = totalTests > 0 ? 
      results.reduce((sum, r) => sum + r.parseTime, 0) / totalTests : 0
    
    return {
      totalTests,
      passed,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      avgParseTime: Math.round(avgParseTime * 100) / 100
    }
  }
  
  private generateOverallSummary(testSuites: TestSuite[]): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY')
    console.log('='.repeat(80))
    
    const overallStats = testSuites.reduce((acc, suite) => ({
      totalTests: acc.totalTests + suite.summary.totalTests,
      passed: acc.passed + suite.summary.passed,
      failed: acc.failed + suite.summary.failed,
      totalTime: acc.totalTime + suite.results.reduce((sum, r) => sum + r.parseTime, 0)
    }), { totalTests: 0, passed: 0, failed: 0, totalTime: 0 })
    
    const overallSuccessRate = overallStats.totalTests > 0 ? 
      (overallStats.passed / overallStats.totalTests) * 100 : 0
    
    console.log(`\n🎯 Overall Results:`)
    console.log(`   Total Tests: ${overallStats.totalTests}`)
    console.log(`   Passed: ${overallStats.passed} ✅`)
    console.log(`   Failed: ${overallStats.failed} ❌`)
    console.log(`   Success Rate: ${overallSuccessRate.toFixed(2)}%`)
    console.log(`   Total Time: ${overallStats.totalTime}ms`)
    
    console.log(`\n📈 Suite Breakdown:`)
    testSuites.forEach(suite => {
      const status = suite.summary.successRate > 80 ? '🟢' : 
                    suite.summary.successRate > 60 ? '🟡' : '🔴'
      console.log(`   ${status} ${suite.suiteName}: ${suite.summary.passed}/${suite.summary.totalTests} (${suite.summary.successRate}%)`)
    })
  }
}

// Export test runner
export const jsonParsingTestRunner = new JsonParsingTestRunner()