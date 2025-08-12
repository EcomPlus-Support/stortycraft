/**
 * Performance benchmark tests for aspect ratio functionality
 * Tests performance across different aspect ratios and scenarios
 */

import { ASPECT_RATIOS, getAspectRatioById, analyzeAspectRatio, estimateCost } from '@/app/constants/aspectRatios'
import { validateAspectRatio, validateVideoGenerationRequest } from '@/lib/validation'
import type { VideoGenerationRequest } from '@/app/types'

describe('Aspect Ratio Performance Benchmarks', () => {
  const BENCHMARK_ITERATIONS = 10000
  const PERFORMANCE_THRESHOLD_MS = 100
  
  const createTestRequest = (aspectRatio = ASPECT_RATIOS[0]): VideoGenerationRequest => ({
    scenes: [
      {
        imagePrompt: 'A performance test scene with detailed description',
        videoPrompt: 'Camera movement for performance testing',
        description: 'Benchmark scene for performance validation',
        voiceover: 'Performance testing voiceover text',
        charactersPresent: ['character1', 'character2']
      }
    ],
    aspectRatio,
    options: {
      quality: 'medium',
      enableCaching: true
    }
  })

  describe('Validation Performance', () => {
    it('validates aspect ratios quickly at scale', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
        validateAspectRatio(aspectRatio)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = (BENCHMARK_ITERATIONS / duration) * 1000
      
      console.log(`Aspect ratio validation: ${operationsPerSecond.toFixed(0)} ops/sec`)
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
      expect(operationsPerSecond).toBeGreaterThan(50000) // Should be very fast
    })

    it('validates video generation requests efficiently', () => {
      const testRequests = ASPECT_RATIOS.map(createTestRequest)
      
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        const request = testRequests[i % testRequests.length]
        validateVideoGenerationRequest(request)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = (1000 / duration) * 1000
      
      console.log(`Request validation: ${operationsPerSecond.toFixed(0)} requests/sec`)
      
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(operationsPerSecond).toBeGreaterThan(500)
    })

    it('handles concurrent validation efficiently', async () => {
      const concurrentValidations = []
      const batchSize = 100
      
      const startTime = performance.now()
      
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = []
        
        for (let i = 0; i < batchSize; i++) {
          const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
          const request = createTestRequest(aspectRatio)
          
          batchPromises.push(
            Promise.resolve().then(() => {
              validateAspectRatio(aspectRatio)
              validateVideoGenerationRequest(request)
            })
          )
        }
        
        concurrentValidations.push(Promise.all(batchPromises))
      }
      
      await Promise.all(concurrentValidations)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const totalOperations = 10 * batchSize * 2 // 2 validations per iteration
      const operationsPerSecond = (totalOperations / duration) * 1000
      
      console.log(`Concurrent validation: ${operationsPerSecond.toFixed(0)} ops/sec`)
      
      expect(duration).toBeLessThan(2000)
      expect(operationsPerSecond).toBeGreaterThan(1000)
    })
  })

  describe('Utility Function Performance', () => {
    it('performs aspect ratio lookups quickly', () => {
      const aspectRatioIds = ASPECT_RATIOS.map(ar => ar.id)
      
      const startTime = performance.now()
      
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const id = aspectRatioIds[i % aspectRatioIds.length]
        const result = getAspectRatioById(id)
        expect(result).toBeDefined()
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = (BENCHMARK_ITERATIONS / duration) * 1000
      
      console.log(`Aspect ratio lookup: ${operationsPerSecond.toFixed(0)} lookups/sec`)
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
      expect(operationsPerSecond).toBeGreaterThan(100000) // Lookups should be extremely fast
    })

    it('analyzes aspect ratios efficiently', () => {
      const testDimensions = [
        [1920, 1080], [1080, 1920], [1024, 1024], [2560, 1440],
        [1366, 768], [640, 480], [800, 600], [1600, 900]
      ]
      
      const startTime = performance.now()
      
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const [width, height] = testDimensions[i % testDimensions.length]
        const analysis = analyzeAspectRatio(width, height)
        expect(analysis.ratio).toBe(width / height)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = (BENCHMARK_ITERATIONS / duration) * 1000
      
      console.log(`Aspect ratio analysis: ${operationsPerSecond.toFixed(0)} analyses/sec`)
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2) // Allow slightly more time for calculations
      expect(operationsPerSecond).toBeGreaterThan(50000)
    })

    it('calculates costs efficiently for all aspect ratios', () => {
      const baseCost = 1.0
      
      const startTime = performance.now()
      
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
        const cost = estimateCost(aspectRatio, baseCost)
        expect(cost).toBeGreaterThanOrEqual(0)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = (BENCHMARK_ITERATIONS / duration) * 1000
      
      console.log(`Cost calculation: ${operationsPerSecond.toFixed(0)} calculations/sec`)
      
      expect(duration).toBeLessThan(50) // Cost calculation should be very fast
      expect(operationsPerSecond).toBeGreaterThan(200000)
    })
  })

  describe('Memory Usage Performance', () => {
    it('maintains efficient memory usage with large datasets', () => {
      const initialMemory = process.memoryUsage()
      
      // Create large dataset
      const largeDataset = []
      for (let i = 0; i < 10000; i++) {
        const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
        const request = createTestRequest(aspectRatio)
        largeDataset.push(request)
      }
      
      // Process the dataset
      const startTime = performance.now()
      
      for (const request of largeDataset) {
        validateVideoGenerationRequest(request)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      console.log(`Large dataset processing: ${duration.toFixed(0)}ms`)
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
      
      expect(duration).toBeLessThan(5000) // Should process 10k items in under 5 seconds
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Should use less than 100MB additional memory
    })

    it('handles memory efficiently with concurrent operations', async () => {
      const initialMemory = process.memoryUsage()
      
      const concurrentTasks = []
      for (let i = 0; i < 100; i++) {
        concurrentTasks.push(
          Promise.resolve().then(() => {
            const dataset = []
            for (let j = 0; j < 100; j++) {
              const aspectRatio = ASPECT_RATIOS[j % ASPECT_RATIOS.length]
              dataset.push(createTestRequest(aspectRatio))
            }
            
            return dataset.map(request => validateVideoGenerationRequest(request))
          })
        )
      }
      
      const startTime = performance.now()
      
      await Promise.all(concurrentTasks)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      console.log(`Concurrent processing: ${duration.toFixed(0)}ms`)
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
      
      expect(duration).toBeLessThan(10000)
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024)
    })
  })

  describe('Stress Testing', () => {
    it('maintains performance under extreme load', () => {
      const extremeIterations = 100000
      const startTime = performance.now()
      
      for (let i = 0; i < extremeIterations; i++) {
        const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
        
        // Perform multiple operations per iteration
        validateAspectRatio(aspectRatio)
        getAspectRatioById(aspectRatio.id)
        estimateCost(aspectRatio, 1.0)
        analyzeAspectRatio(aspectRatio.width, aspectRatio.height)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = ((extremeIterations * 4) / duration) * 1000
      
      console.log(`Extreme load test: ${operationsPerSecond.toFixed(0)} ops/sec`)
      
      expect(duration).toBeLessThan(10000) // Should complete in under 10 seconds
      expect(operationsPerSecond).toBeGreaterThan(10000)
    })

    it('handles edge cases efficiently', () => {
      const edgeCases = [
        // Very large dimensions
        [99999, 99999],
        [1, 99999],
        [99999, 1],
        // Very small dimensions
        [1, 1],
        [2, 1],
        [1, 2],
        // Prime number dimensions
        [1009, 1013],
        [2027, 2029],
        // Common problematic ratios
        [1366, 768],
        [1440, 900]
      ]
      
      const startTime = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        const [width, height] = edgeCases[i % edgeCases.length]
        const analysis = analyzeAspectRatio(width, height)
        expect(analysis.ratio).toBeGreaterThan(0)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Edge case processing: ${duration.toFixed(0)}ms`)
      
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('Real-world Scenario Performance', () => {
    it('simulates typical user workflow efficiently', () => {
      const workflows = [
        // Social media workflow
        () => {
          const socialRatios = ['9:16', '1:1', '16:9']
          return socialRatios.map(id => {
            const aspectRatio = getAspectRatioById(id)
            if (!aspectRatio) throw new Error(`Ratio ${id} not found`)
            
            const request = createTestRequest(aspectRatio)
            validateVideoGenerationRequest(request)
            return estimateCost(aspectRatio, 2.5)
          })
        },
        
        // Professional video workflow
        () => {
          const professionalRatios = ['16:9', '21:9', '4:3']
          return professionalRatios.map(id => {
            const aspectRatio = getAspectRatioById(id)
            if (!aspectRatio) return null
            
            if (aspectRatio) {
              const request = createTestRequest(aspectRatio)
              request.options = { quality: 'high', enableCaching: false }
              validateVideoGenerationRequest(request)
              return estimateCost(aspectRatio, 5.0)
            }
            return 0
          }).filter(Boolean)
        },
        
        // Multi-format campaign workflow
        () => {
          return ASPECT_RATIOS.map(aspectRatio => {
            const request = createTestRequest(aspectRatio)
            request.scenes = [
              ...request.scenes,
              { ...request.scenes[0], description: 'Additional scene for campaign' }
            ]
            
            validateVideoGenerationRequest(request)
            return estimateCost(aspectRatio, 1.5)
          })
        }
      ]
      
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        const workflow = workflows[i % workflows.length]
        const results = workflow()
        expect(results.length).toBeGreaterThan(0)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const workflowsPerSecond = (1000 / duration) * 1000
      
      console.log(`Workflow simulation: ${workflowsPerSecond.toFixed(0)} workflows/sec`)
      
      expect(duration).toBeLessThan(5000)
      expect(workflowsPerSecond).toBeGreaterThan(200)
    })

    it('handles batch processing efficiently', () => {
      const batchSize = 50
      const batchCount = 20
      
      const startTime = performance.now()
      
      for (let batch = 0; batch < batchCount; batch++) {
        const batchRequests = []
        
        for (let i = 0; i < batchSize; i++) {
          const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
          const request = createTestRequest(aspectRatio)
          
          // Add some complexity to the request
          if (i % 3 === 0) {
            request.scenes.push({
              imagePrompt: `Batch scene ${i}`,
              videoPrompt: `Batch video ${i}`,
              description: `Batch description ${i}`,
              voiceover: `Batch voiceover ${i}`,
              charactersPresent: [`character${i}`]
            })
          }
          
          batchRequests.push(request)
        }
        
        // Process the batch
        batchRequests.forEach(request => {
          validateVideoGenerationRequest(request)
          estimateCost(request.aspectRatio, 2.0)
        })
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const totalProcessed = batchSize * batchCount
      const requestsPerSecond = (totalProcessed / duration) * 1000
      
      console.log(`Batch processing: ${requestsPerSecond.toFixed(0)} requests/sec`)
      
      expect(duration).toBeLessThan(10000)
      expect(requestsPerSecond).toBeGreaterThan(100)
    })
  })

  describe('Performance Regression Detection', () => {
    it('maintains consistent performance across test runs', () => {
      const runCount = 5
      const iterationsPerRun = 1000
      const durations = []
      
      for (let run = 0; run < runCount; run++) {
        const startTime = performance.now()
        
        for (let i = 0; i < iterationsPerRun; i++) {
          const aspectRatio = ASPECT_RATIOS[i % ASPECT_RATIOS.length]
          validateAspectRatio(aspectRatio)
          const request = createTestRequest(aspectRatio)
          validateVideoGenerationRequest(request)
        }
        
        const endTime = performance.now()
        durations.push(endTime - startTime)
      }
      
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / runCount
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)
      const variability = ((maxDuration - minDuration) / avgDuration) * 100
      
      console.log(`Performance consistency:`)
      console.log(`  Average: ${avgDuration.toFixed(0)}ms`)
      console.log(`  Min: ${minDuration.toFixed(0)}ms`)
      console.log(`  Max: ${maxDuration.toFixed(0)}ms`)
      console.log(`  Variability: ${variability.toFixed(1)}%`)
      
      // Performance should be consistent (less than 50% variability)
      expect(variability).toBeLessThan(50)
      expect(avgDuration).toBeLessThan(5000)
    })

    it('detects performance bottlenecks in complex scenarios', () => {
      const complexScenario = () => {
        // Simulate a complex workflow with multiple operations
        const results = []
        
        for (const aspectRatio of ASPECT_RATIOS) {
          // Multiple validation operations
          validateAspectRatio(aspectRatio)
          
          // Create complex request
          const request = createTestRequest(aspectRatio)
          request.scenes = Array.from({ length: 5 }, (_, i) => ({
            imagePrompt: `Complex scene ${i} with detailed description and multiple elements`,
            videoPrompt: `Complex video prompt ${i} with camera movements and transitions`,
            description: `Detailed scene description ${i} for complex workflow testing`,
            voiceover: `Extended voiceover text ${i} for performance testing purposes`,
            charactersPresent: [`character${i}`, `supporting${i}`, `background${i}`]
          }))
          
          validateVideoGenerationRequest(request)
          
          // Cost calculations
          const cost = estimateCost(aspectRatio, 3.5)
          results.push({ aspectRatio: aspectRatio.id, cost })
          
          // Analysis operations
          analyzeAspectRatio(aspectRatio.width * 2, aspectRatio.height * 2)
        }
        
        return results
      }
      
      const startTime = performance.now()
      
      for (let i = 0; i < 100; i++) {
        complexScenario()
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const scenariosPerSecond = (100 / duration) * 1000
      
      console.log(`Complex scenario performance: ${scenariosPerSecond.toFixed(2)} scenarios/sec`)
      
      expect(duration).toBeLessThan(30000) // Should complete in under 30 seconds
      expect(scenariosPerSecond).toBeGreaterThan(3) // At least 3 complex scenarios per second
    })
  })
})