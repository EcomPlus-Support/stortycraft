'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingStage = void 0;
exports.extractYouTubeMetadata = extractYouTubeMetadata;
exports.processReferenceContent = processReferenceContent;
const gemini_service_1 = require("@/lib/gemini-service");
const auth_1 = require("@/lib/auth");
const youtube_transcript_1 = require("@/lib/youtube-transcript");
const performance_monitor_1 = require("@/lib/performance-monitor");
const error_utils_1 = require("@/lib/error-utils");
const logger_1 = require("@/lib/logger");
const content_complexity_analyzer_1 = require("@/lib/content-complexity-analyzer");
const adaptive_content_processor_1 = require("@/lib/adaptive-content-processor");
const token_allocation_manager_1 = require("@/lib/token-allocation-manager");
const json_parser_simplified_1 = require("@/lib/json-parser-simplified");
const structured_output_service_1 = require("@/lib/structured-output-service");
const gemini_direct_1 = require("@/lib/gemini-direct");
const youtube_processing_service_1 = require("@/lib/youtube-processing-service");
// Add timeout configuration for external APIs
const API_TIMEOUT = 30000; // 30 seconds
// Simple in-memory cache for development (use Redis in production)
const contentCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
// Helper function to get proper language display name
function getLanguageDisplayName(language) {
    const languageMap = {
        '繁體中文': 'Traditional Chinese',
        '简体中文': 'Simplified Chinese',
        'English': 'English',
        'zh-TW': 'Traditional Chinese',
        'zh-CN': 'Simplified Chinese',
        'en-US': 'English'
    };
    return languageMap[language || ''] || 'English';
}
// Processing stage definitions
var ProcessingStage;
(function (ProcessingStage) {
    ProcessingStage["YOUTUBE_METADATA"] = "YouTube\u5143\u6578\u64DA\u63D0\u53D6";
    ProcessingStage["VIDEO_ANALYSIS"] = "\u8996\u983B\u5167\u5BB9\u5206\u6790";
    ProcessingStage["CONTENT_PROCESSING"] = "\u5167\u5BB9\u8655\u7406";
    ProcessingStage["STRUCTURED_GENERATION"] = "\u7D50\u69CB\u5316\u751F\u6210";
    ProcessingStage["GEMINI_TEXT_GENERATION"] = "Gemini\u6587\u5B57\u751F\u6210";
    ProcessingStage["JSON_PARSING"] = "JSON\u89E3\u6790";
    ProcessingStage["CHARACTERS_GENERATION"] = "\u89D2\u8272\u751F\u6210";
    ProcessingStage["SCENES_GENERATION"] = "\u5834\u666F\u751F\u6210";
    ProcessingStage["FINAL_PITCH_COMPILATION"] = "\u6700\u7D42pitch\u7DE8\u8B6F";
})(ProcessingStage || (exports.ProcessingStage = ProcessingStage = {}));
async function extractYouTubeMetadata(url) {
    return performance_monitor_1.performanceMonitor.trackOperation('youtube_metadata_extraction', async () => {
        try {
            console.log('🚀 Starting YouTube metadata extraction with enhanced service');
            // Initialize enhanced processing service
            const processingService = new youtube_processing_service_1.YouTubeProcessingService();
            // Use the enhanced service for processing - supports both shorts and regular videos
            const isShorts = /youtube\.com\/shorts\//.test(url);
            console.log(`Processing URL: ${url} (${isShorts ? 'Shorts' : 'Video'} detected)`);
            const result = await processingService.processYouTubeContent(url, isShorts ? 'shorts' : 'auto');
            console.log(`✅ Processing complete. Strategy: ${result.processingStrategy}, Confidence: ${result.confidence}`);
            if (result.error) {
                console.error('❌ Processing service returned error:', result.error);
                throw new Error(result.error);
            }
            // Convert ProcessingResult to ReferenceSource format
            const referenceSource = {
                title: result.title,
                description: result.description,
                duration: result.duration,
                thumbnail: result.thumbnail,
                // 🎥 使用視頻分析的腳本（如果有的話）
                transcript: result.transcript || result.description,
                processingStatus: 'completed',
                // 🎯 保留視頻分析數據以用於角色描述
                videoAnalysis: result.videoAnalysis,
                hasVideoAnalysis: result.hasVideoAnalysis,
                videoAnalysisQuality: result.videoAnalysisQuality
            };
            // 🧠 分析內容複雜度
            if (referenceSource.videoAnalysis || referenceSource.transcript) {
                console.log('🔍 Analyzing content complexity...');
                referenceSource.complexityMetrics = content_complexity_analyzer_1.contentComplexityAnalyzer.analyzeComplexity(referenceSource.videoAnalysis, referenceSource);
                console.log(`📊 Content complexity: ${referenceSource.complexityMetrics.level} (score: ${referenceSource.complexityMetrics.totalScore})`);
            }
            console.log('🎯 Converted to ReferenceSource format:', {
                title: referenceSource.title?.substring(0, 50) + '...',
                hasDescription: !!referenceSource.description,
                hasTranscript: !!referenceSource.transcript,
                duration: referenceSource.duration,
                hasVideoAnalysis: !!referenceSource.hasVideoAnalysis,
                videoAnalysisQuality: referenceSource.videoAnalysisQuality,
                charactersFound: referenceSource.videoAnalysis?.characters?.length || 0,
                scenesFound: referenceSource.videoAnalysis?.sceneBreakdown?.length || 0
            });
            return referenceSource;
            // This code block is now replaced by the enhanced service above
        }
        catch (error) {
            console.error('❌ Enhanced YouTube processing failed:', error);
            logger_1.logger.error('Error extracting YouTube metadata with enhanced service', error);
            // Provide user-friendly error message based on error type
            let errorMessage = 'Failed to process YouTube content';
            if (error instanceof Error) {
                if (error.message.includes('quota exceeded')) {
                    errorMessage = 'YouTube API quota exceeded. Please try again later.';
                }
                else if (error.message.includes('not found')) {
                    errorMessage = 'Video not found or not accessible. Please check the URL.';
                }
                else if (error.message.includes('API key')) {
                    errorMessage = 'YouTube API configuration error. Please contact support.';
                }
                else if (error.message.includes('temporarily unavailable')) {
                    errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
                }
                else {
                    errorMessage = error.message;
                }
            }
            return {
                processingStatus: 'error',
                errorMessage
            };
        }
    }, { url });
}
async function processReferenceContent(source, targetStyle, targetLanguage, useStructuredOutput) {
    return await performance_monitor_1.performanceMonitor.trackOperation('reference_content_processing', async () => {
        const startTime = Date.now();
        try {
            console.log('Processing reference content with enhanced Gemini service');
            console.log('Source type:', source.type);
            console.log('Has transcript:', !!source.transcript);
            console.log('Description length:', source.description?.length || 0);
            console.log('Has video analysis:', !!source.hasVideoAnalysis);
            console.log('Video analysis quality:', source.videoAnalysisQuality);
            console.log('Characters in analysis:', source.videoAnalysis?.characters?.length || 0);
            console.log('Scenes in analysis:', source.videoAnalysis?.sceneBreakdown?.length || 0);
            // First, check Gemini service health
            const healthStatus = await (0, gemini_service_1.checkGeminiHealth)();
            console.log('Gemini Health Check:', healthStatus);
            if (!healthStatus.healthy) {
                console.warn('Gemini service is not healthy, proceeding with fallback approach');
            }
            // Check cache for identical processing requests
            const cacheKey = `processed_content_${generateContentHash(source, targetStyle, targetLanguage)}`;
            const cached = getCachedContent(cacheKey);
            if (cached) {
                console.log('Using cached processed content');
                return cached;
            }
            // Determine content quality level with improved logic
            let contentQuality = 'full';
            let warning;
            let content = '';
            // 🧠 Use adaptive content processing based on complexity
            let processedContent;
            let complexityMetrics;
            if (source.complexityMetrics) {
                console.log('🔄 Using existing complexity metrics');
                complexityMetrics = source.complexityMetrics;
            }
            else {
                console.log('🔍 Analyzing content complexity for processing...');
                complexityMetrics = content_complexity_analyzer_1.contentComplexityAnalyzer.analyzeComplexity(source.videoAnalysis, source);
            }
            console.log('📊 Processing with complexity-based strategy:', {
                level: complexityMetrics.level,
                score: complexityMetrics.totalScore,
                tokenBudget: complexityMetrics.recommendedTokenBudget,
                useStructuredOutput: complexityMetrics.shouldUseStructuredOutput
            });
            // 使用適應性內容處理
            processedContent = adaptive_content_processor_1.adaptiveContentProcessor.processContent(source, complexityMetrics);
            content = processedContent.content;
            contentQuality = processedContent.contentQuality;
            warning = processedContent.warning;
            console.log(`🎯 Adaptive processing completed: ${processedContent.processingStrategy}`);
            console.log(`   - Content length: ${content.length}`);
            console.log(`   - Token estimate: ${processedContent.tokenEstimate}`);
            console.log(`   - Simplification applied: ${processedContent.simplificationApplied}`);
            // Validate content length to avoid excessive processing time
            if (content.length > 50000) {
                console.log('Content too long, truncating for optimal processing');
                content = content.substring(0, 50000) + '\n\n[Content truncated for processing efficiency]';
                warning = (warning || '') + ' Content was truncated due to length for optimal processing.';
            }
            // For text input, always use full quality
            if (source.type === 'text_input') {
                content = source.transcript || source.description || '';
                contentQuality = 'full';
                warning = undefined;
            }
            // 🎯 Use new token allocation system based on complexity
            const tokenAllocation = useStructuredOutput && complexityMetrics.shouldUseStructuredOutput
                ? token_allocation_manager_1.tokenAllocationManager.allocateForStructuredOutput(complexityMetrics)
                : token_allocation_manager_1.tokenAllocationManager.allocateForStandardOutput(complexityMetrics);
            console.log('Token Allocation Analysis:', {
                level: complexityMetrics.level,
                totalScore: complexityMetrics.totalScore,
                tokenAllocation: tokenAllocation.maxTokens,
                temperature: tokenAllocation.temperature,
                timeout: tokenAllocation.timeout,
                reasoning: tokenAllocation.reasoning,
                useStructuredOutput: complexityMetrics.shouldUseStructuredOutput && useStructuredOutput
            });
            // Check if we should use structured output (Traditional Chinese) and complexity allows
            if (useStructuredOutput && complexityMetrics.shouldUseStructuredOutput && (targetLanguage === '繁體中文' || targetLanguage === 'Traditional Chinese' || targetLanguage === 'zh-TW')) {
                console.log('🏗️ Using enhanced structured output system for Traditional Chinese generation');
                let structuredAttempts = 0;
                const maxStructuredAttempts = 3;
                while (structuredAttempts < maxStructuredAttempts) {
                    structuredAttempts++;
                    console.log(`🔄 Structured output attempt ${structuredAttempts}/${maxStructuredAttempts}`);
                    try {
                        // Create instance of GeminiDirectService
                        const geminiDirect = new gemini_direct_1.GeminiDirectService();
                        const structuredService = new structured_output_service_1.StructuredOutputService(geminiDirect);
                        const structuredPitch = await structuredService.generateStructuredPitch(content, contentQuality);
                        if (structuredPitch && structuredPitch.finalPitch && structuredPitch.finalPitch.length > 50) {
                            console.log('✅ Structured output generation successful!');
                            const referenceContent = {
                                id: generateId(),
                                source: {
                                    ...source,
                                    processingStatus: 'completed'
                                },
                                extractedContent: {
                                    title: source.title || 'Untitled',
                                    description: source.description || '',
                                    transcript: source.transcript || '',
                                    keyTopics: structuredPitch.tags || structuredPitch.characters.map(c => c.name),
                                    sentiment: 'positive',
                                    duration: source.duration || 0
                                },
                                generatedPitch: structuredPitch.finalPitch,
                                contentQuality,
                                warning: warning ? warning + ' [Enhanced structured output]' : '[Enhanced structured output]',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                // Structured output specific fields
                                structuredPitch: structuredPitch,
                                isStructuredOutput: true
                            };
                            // Cache the processed result
                            setCachedContent(cacheKey, referenceContent);
                            const processingTime = Date.now() - startTime;
                            console.log(`Structured content processing completed in ${processingTime}ms`);
                            return referenceContent;
                        }
                        else {
                            console.log(`⚠️ Structured output attempt ${structuredAttempts} returned incomplete result`);
                            if (structuredAttempts === maxStructuredAttempts) {
                                console.log('🔄 All structured attempts failed');
                                return {
                                    id: generateId(),
                                    source: {
                                        ...source,
                                        processingStatus: 'error',
                                        processingError: {
                                            stage: ProcessingStage.STRUCTURED_GENERATION,
                                            message: `${maxStructuredAttempts}次結構化嘗試後失敗`,
                                            originalContent: content
                                        }
                                    },
                                    extractedContent: {
                                        title: source.title || 'Untitled',
                                        description: source.description || '',
                                        transcript: source.transcript || '',
                                        keyTopics: [],
                                        sentiment: 'positive',
                                        duration: source.duration || 0
                                    },
                                    generatedPitch: `處理階段失敗：${ProcessingStage.STRUCTURED_GENERATION}\n\n原因：${maxStructuredAttempts}次結構化嘗試後失敗\n\n原始內容：\n${content}`,
                                    contentQuality,
                                    warning: `在 ${ProcessingStage.STRUCTURED_GENERATION} 階段失敗：${maxStructuredAttempts}次結構化嘗試後失敗`,
                                    processingError: {
                                        stage: ProcessingStage.STRUCTURED_GENERATION,
                                        message: `${maxStructuredAttempts}次結構化嘗試後失敗`,
                                        originalContent: content
                                    },
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                    isStructuredOutput: false
                                };
                            }
                            // Wait before retry
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                    catch (structuredError) {
                        console.log(`❌ Structured output attempt ${structuredAttempts} error:`, structuredError);
                        if (structuredAttempts === maxStructuredAttempts) {
                            console.log('🔄 All structured attempts failed');
                            return {
                                id: generateId(),
                                source: {
                                    ...source,
                                    processingStatus: 'error',
                                    processingError: {
                                        stage: ProcessingStage.STRUCTURED_GENERATION,
                                        message: `結構化生成錯誤：${structuredError instanceof Error ? structuredError.message : String(structuredError)}`,
                                        originalContent: content
                                    }
                                },
                                extractedContent: {
                                    title: source.title || 'Untitled',
                                    description: source.description || '',
                                    transcript: source.transcript || '',
                                    keyTopics: [],
                                    sentiment: 'positive',
                                    duration: source.duration || 0
                                },
                                generatedPitch: `處理階段失敗：${ProcessingStage.STRUCTURED_GENERATION}\n\n原因：結構化生成錯誤\n錯誤詳情：${structuredError instanceof Error ? structuredError.message : String(structuredError)}\n\n原始內容：\n${content}`,
                                contentQuality,
                                warning: `在 ${ProcessingStage.STRUCTURED_GENERATION} 階段失敗：結構化生成錯誤`,
                                processingError: {
                                    stage: ProcessingStage.STRUCTURED_GENERATION,
                                    message: `結構化生成錯誤：${structuredError instanceof Error ? structuredError.message : String(structuredError)}`,
                                    originalContent: content
                                },
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                isStructuredOutput: false
                            };
                        }
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            const contentQualityContext = contentQuality === 'full'
                ? 'You have access to the full transcript/content.'
                : contentQuality === 'partial'
                    ? 'You have access to the title, description, and enhanced metadata. Work with what is available to create the best possible pitch.'
                    : 'You have limited information (basic metadata only). Be creative but stay grounded in the available information and focus on what can be inferred from the title and description.';
            const basePrompt = `Create a video pitch based on this content. CRITICAL: Return ONLY pure JSON without any markdown formatting, code blocks, or backticks.

Title: ${source.title || 'Untitled'}
Content: ${content}
Type: ${(source.duration || 0) <= 60 ? 'YouTube Shorts (viral, 15-60s)' : 'Standard Video'}

Create a detailed story pitch for ${getLanguageDisplayName(targetLanguage)} audience. Even with limited info, be creative and elaborate.

Return EXACTLY this JSON structure (no \`\`\`json, no backticks, PURE JSON ONLY):
{
  "analysis": {
    "keyTopics": ["topic1", "topic2", "topic3"],
    "sentiment": "positive",
    "coreMessage": "Brief core message",
    "targetAudience": "Target demographic"
  },
  "generatedPitch": "Detailed video pitch with characters, story, scenes, emotions. Minimum 200 words in ${getLanguageDisplayName(targetLanguage)}.",
  "rationale": "Why this pitch works"
}`;
            // Generate base prompt for standard processing
            const optimizedPrompt = basePrompt; // Use the base prompt directly
            // Use the adaptive token allocation with retry logic
            let text;
            let attempts = 0;
            const maxAttempts = 3;
            let currentTokenAllocation = tokenAllocation;
            while (attempts < maxAttempts && !text) {
                attempts++;
                console.log(`🔄 Gemini generation attempt ${attempts}/${maxAttempts}`);
                console.log(`   - Tokens: ${currentTokenAllocation.maxTokens}`);
                console.log(`   - Temperature: ${currentTokenAllocation.temperature}`);
                try {
                    const response = await (0, gemini_service_1.generateTextWithGemini)(optimizedPrompt, {
                        temperature: currentTokenAllocation.temperature,
                        maxTokens: currentTokenAllocation.maxTokens,
                        timeout: currentTokenAllocation.timeout
                    });
                    if (response && response.trim().length > 0) {
                        text = response;
                        console.log(`✅ Gemini generation successful on attempt ${attempts}`);
                    }
                    else {
                        console.log(`⚠️ Attempt ${attempts}: Empty response from Gemini`);
                    }
                }
                catch (geminiError) {
                    console.log(`❌ Attempt ${attempts} failed:`, geminiError);
                    // Check if it's a token limit issue
                    const errorMessage = geminiError instanceof Error ? geminiError.message : String(geminiError);
                    const isTokenIssue = errorMessage.includes('MAX_TOKENS') || errorMessage.includes('token limit');
                    if (isTokenIssue && attempts < maxAttempts) {
                        // Adjust token allocation for next attempt
                        currentTokenAllocation = token_allocation_manager_1.tokenAllocationManager.adjustAllocation(currentTokenAllocation, {
                            wasTokenLimitHit: true,
                            finishReason: 'MAX_TOKENS',
                            isStructuredOutput: false
                        });
                        console.log(`🔧 Adjusted tokens to ${currentTokenAllocation.maxTokens} for next attempt`);
                    }
                    if (attempts === maxAttempts) {
                        console.log('❌ All Gemini attempts failed, using enhanced fallback');
                    }
                }
            }
            if (!text || text.trim().length === 0) {
                console.log('❌ All Gemini generation attempts failed');
                return {
                    id: generateId(),
                    source: {
                        ...source,
                        processingStatus: 'error',
                        processingError: {
                            stage: ProcessingStage.GEMINI_TEXT_GENERATION,
                            message: `${attempts}次嘗試後生成失敗`,
                            originalContent: content
                        }
                    },
                    extractedContent: {
                        title: source.title || 'Untitled',
                        description: source.description || '',
                        transcript: source.transcript || '',
                        keyTopics: extractKeywordsFromContent(content),
                        sentiment: 'positive',
                        duration: source.duration || 0
                    },
                    generatedPitch: `處理階段失敗：${ProcessingStage.GEMINI_TEXT_GENERATION}\n\n原因：${attempts}次嘗試後生成失敗\n\n原始內容：\n${content}`,
                    contentQuality,
                    warning: `在 ${ProcessingStage.GEMINI_TEXT_GENERATION} 階段失敗：${attempts}次嘗試後生成失敗`,
                    processingError: {
                        stage: ProcessingStage.GEMINI_TEXT_GENERATION,
                        message: `${attempts}次嘗試後生成失敗`,
                        originalContent: content
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
            // Enhanced JSON parsing using new intelligent parser (Solution 1 + 5)
            console.log('🔧 Starting enhanced JSON parsing for AI response');
            console.log('Raw AI response length:', text.length);
            console.log('First 200 chars:', text.substring(0, 200));
            // Use the new enhanced JSON parser
            const parseResult = (0, json_parser_simplified_1.parseAiJsonResponse)(text);
            let result;
            if (parseResult.success && parseResult.data) {
                console.log('✅ Enhanced JSON parsing successful!');
                console.log('Repair attempts:', parseResult.repairAttempts?.length || 0);
                console.log('Parse time:', parseResult.parseTime + 'ms');
                result = parseResult.data;
            }
            else {
                // Check if Gemini actually returned content
                console.log('⚠️ JSON parsing failed, checking raw response...');
                console.log('Parse errors:', parseResult.repairAttempts);
                // Try one more time with a simpler extraction
                const simplePitchMatch = text.match(/"generatedPitch"\s*:\s*"([\s\S]+?)"/);
                if (simplePitchMatch && simplePitchMatch[1] && simplePitchMatch[1].length > 100) {
                    console.log('✅ Found pitch content using simple extraction');
                    result = {
                        generatedPitch: simplePitchMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                        analysis: {
                            keyTopics: extractKeywordsFromContent(content),
                            sentiment: 'positive',
                            coreMessage: `Content analysis for: ${source.title}`,
                            targetAudience: 'Social media users, entertainment seekers'
                        },
                        rationale: 'Extracted using simple pattern matching after JSON parse failure'
                    };
                }
                else {
                    // No valid content found - return parsing failure
                    console.log('❌ No valid pitch content found');
                    return {
                        id: generateId(),
                        source: {
                            ...source,
                            processingStatus: 'error',
                            processingError: {
                                stage: ProcessingStage.JSON_PARSING,
                                message: 'JSON解析失敗，無法提取有效內容',
                                originalContent: text
                            }
                        },
                        extractedContent: {
                            title: source.title || 'Untitled',
                            description: source.description || '',
                            transcript: source.transcript || '',
                            keyTopics: extractKeywordsFromContent(content),
                            sentiment: 'positive',
                            duration: source.duration || 0
                        },
                        generatedPitch: `處理階段失敗：${ProcessingStage.JSON_PARSING}\n\n原因：JSON解析失敗，無法提取有效內容\n\n原始回應：\n${text}`,
                        contentQuality,
                        warning: `在 ${ProcessingStage.JSON_PARSING} 階段失敗：JSON解析失敗`,
                        processingError: {
                            stage: ProcessingStage.JSON_PARSING,
                            message: 'JSON解析失敗，無法提取有效內容',
                            originalContent: text
                        },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                }
            }
            // Additional validation for completeness
            if (!result.generatedPitch || result.generatedPitch.length < 50) {
                console.log('⚠️ Generated pitch too short, enhancing...');
                result.generatedPitch = createEnhancedFallbackPitch(source, targetStyle, targetLanguage, complexityMetrics);
                result.rationale = (result.rationale || '') + ' [Enhanced due to short pitch]';
            }
            const referenceContent = {
                id: generateId(),
                source: {
                    ...source,
                    processingStatus: 'completed'
                },
                extractedContent: {
                    title: source.title || 'Untitled',
                    description: source.description || '',
                    transcript: source.transcript || '',
                    keyTopics: result.analysis.keyTopics || [],
                    sentiment: result.analysis.sentiment || 'neutral',
                    duration: source.duration || 0
                },
                generatedPitch: result.generatedPitch,
                contentQuality,
                warning,
                createdAt: new Date(),
                updatedAt: new Date(),
                // Standard output fields
                isStructuredOutput: false
            };
            // Cache the processed result
            setCachedContent(cacheKey, referenceContent);
            const processingTime = Date.now() - startTime;
            console.log(`Content processing completed in ${processingTime}ms`);
            return referenceContent;
        }
        catch (error) {
            logger_1.logger.error('Error processing reference content', error, {
                additionalData: {
                    sourceType: source.type,
                    hasTranscript: !!source.transcript,
                    contentLength: (source.transcript || source.description || '').length,
                    targetStyle,
                    targetLanguage
                }
            });
            // Handle Gemini service errors with specific messaging
            if (error instanceof gemini_service_1.GeminiServiceError) {
                console.error('Gemini Service Error:', {
                    code: error.code,
                    isRetryable: error.isRetryable,
                    originalError: error.originalError?.message
                });
                // If it's a model availability issue, create fallback content
                if (error.code === 'NO_MODELS_AVAILABLE' || error.code === 'MODEL_UNAVAILABLE') {
                    console.log('Creating fallback content due to model unavailability');
                    const fallbackPitch = createFallbackPitch(source, targetStyle, targetLanguage);
                    return {
                        id: generateId(),
                        source: {
                            ...source,
                            processingStatus: 'error',
                            processingError: {
                                stage: ProcessingStage.GEMINI_TEXT_GENERATION,
                                message: '模型不可用',
                                originalContent: source.transcript || source.description || ''
                            }
                        },
                        extractedContent: {
                            title: source.title || 'Untitled',
                            description: source.description || '',
                            transcript: source.transcript || '',
                            keyTopics: extractKeywordsFromContent(source.transcript || source.description || ''),
                            sentiment: 'neutral',
                            duration: source.duration || 0
                        },
                        generatedPitch: `處理階段失敗：${ProcessingStage.GEMINI_TEXT_GENERATION}\n\n原因：模型不可用\n\n原始內容：\n${source.transcript || source.description || source.title || '無可用內容'}`,
                        contentQuality: 'metadata-only',
                        warning: `在 ${ProcessingStage.GEMINI_TEXT_GENERATION} 階段失敗：模型不可用`,
                        processingError: {
                            stage: ProcessingStage.GEMINI_TEXT_GENERATION,
                            message: '模型不可用',
                            originalContent: source.transcript || source.description || ''
                        },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                }
                // For auth errors, provide specific guidance
                if (error.code === 'AUTH_ERROR') {
                    throw new Error('Authentication failed: Please ask your administrator to run "gcloud auth application-default login" to reauthenticate.');
                }
                throw new Error(`Gemini service error: ${error.message}`);
            }
            if (error instanceof auth_1.AuthenticationError) {
                throw error;
            }
            // Use the error translation utility for user-friendly messages
            const friendlyError = (0, error_utils_1.translateError)(error);
            throw new Error(`${friendlyError.title}: ${friendlyError.message}${friendlyError.actionable ? ` ${friendlyError.actionable}` : ''}`);
        }
    });
}
// Helper functions
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        // Add support for YouTube Shorts URLs
        /youtube\.com\/shorts\/([^&\n?#]+)/,
        // Add support for live and mobile URLs
        /youtube\.com\/live\/([^&\n?#]+)/,
        /m\.youtube\.com\/watch\?v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            // Remove any additional query parameters from the video ID
            return match[1].split('?')[0];
        }
    }
    return null;
}
function parseDuration(duration) {
    // Convert ISO 8601 duration (PT4M13S) to seconds
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match)
        return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
// Enhanced helper functions for performance optimization
/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'ViralCraft/1.0'
            }
        });
        clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}
// Retry function removed - now handled by GeminiService
/**
 * Simple cache management
 */
function getCachedContent(key) {
    const cached = contentCache.get(key);
    if (!cached)
        return null;
    const { data, timestamp } = cached;
    if (Date.now() - timestamp > CACHE_TTL) {
        contentCache.delete(key);
        return null;
    }
    return data;
}
function setCachedContent(key, data) {
    contentCache.set(key, {
        data,
        timestamp: Date.now()
    });
    // Simple cache size management
    if (contentCache.size > 100) {
        const firstKey = contentCache.keys().next().value;
        if (firstKey) {
            contentCache.delete(firstKey);
        }
    }
}
/**
 * Generate hash for content caching
 */
function generateContentHash(source, style, language) {
    const content = JSON.stringify({
        url: source.url,
        transcript: source.transcript,
        description: source.description,
        style,
        language
    });
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}
/**
 * Create an enhanced fallback pitch with rich content for Shorts
 */
function createEnhancedFallbackPitch(source, targetStyle, targetLanguage, complexity) {
    const title = source.title || 'Untitled Content';
    const isShorts = (source.duration || 0) <= 60;
    const displayLanguage = getLanguageDisplayName(targetLanguage);
    // Check if we have video analysis data
    const hasVideoAnalysis = source.hasVideoAnalysis && source.videoAnalysis;
    const videoAnalysis = source.videoAnalysis;
    console.log('🎬 Creating enhanced fallback with video analysis:', {
        hasVideoAnalysis,
        charactersCount: videoAnalysis?.characters?.length || 0,
        scenesCount: videoAnalysis?.sceneBreakdown?.length || 0,
        title
    });
    // If we have video analysis, use it to create a content-specific pitch
    if (hasVideoAnalysis && videoAnalysis && displayLanguage === 'Traditional Chinese') {
        const characters = videoAnalysis.characters || [];
        const scenes = videoAnalysis.sceneBreakdown || [];
        const transcript = videoAnalysis.generatedTranscript || '';
        // Determine content type from title and transcript
        const isProductAnalysis = title.includes('產品') || title.includes('亞馬遜') || title.includes('利潤') || transcript.includes('產品');
        const isLifePhilosophy = title.includes('人生') || title.includes('時間') || transcript.includes('人生') || transcript.includes('時間');
        const isComedy = title.includes('😂') || title.includes('太扯') || title.includes('爆笑');
        if (isProductAnalysis) {
            return `【電商揭密】${title.substring(0, 30)}...

🎬 故事概念：
一位資深電商分析師透過實際數據分析，揭露網路熱銷產品背後的利潤秘密。

角色設定：
- 主角：${characters[0]?.description || '專業電商分析師'}
- 特質：善於數據分析，能將複雜資訊簡化說明
- 目標：幫助創業者了解真實的電商生態

場景架構：${scenes.length > 0 ? `
${scenes.slice(0, 3).map((scene, i) => `${i + 1}. ${scene.description}`).join('\n')}` : `
1. 開場：展示熱銷產品列表
2. 分析：詳細拆解成本與售價
3. 結論：給出實用建議`}

核心洞察：
透過真實數據讓觀眾了解電商產業的運作模式，幫助有志創業者做出明智決策。

視覺呈現：
- 數據圖表動畫展示
- 產品成本分解說明
- 清晰的結論和建議`;
        }
        if (isLifePhilosophy) {
            return `【人生思考】${title.substring(0, 30)}...

🎬 故事概念：
透過獨特的視角重新審視時間與人生的關係，帶給觀眾深刻的反思。

角色設定：
- 敘述者：${characters[0]?.description || '深思的觀察者'}
- 特質：善於哲學思辨，能將抽象概念具象化
- 使命：引導觀眾思考生命的本質

內容結構：${scenes.length > 0 ? `
${scenes.slice(0, 3).map((scene, i) => `${i + 1}. ${scene.description}`).join('\n')}` : `
1. 引入：提出發人深省的問題
2. 展開：用視覺化方式呈現概念
3. 昇華：給出思考的方向`}

核心價值：
讓觀眾重新思考時間的珍貴，以及如何更有意義地度過每一天。

情感共鳴：
透過簡單但深刻的比喻，觸動觀眾內心對生命意義的思考。`;
        }
        if (isComedy) {
            return `【爆笑發現】${title.substring(0, 30)}...

🎬 故事概念：
主角意外發現生活中令人捧腹的巧合或現象，與觀眾分享這個有趣的發現。

角色設定：
- 發現者：${characters[0]?.description || '幽默的觀察家'}
- 特質：善於發現生活趣事，表達生動有趣
- 魅力：能將平凡事物變得引人發笑

場景展開：${scenes.length > 0 ? `
${scenes.slice(0, 3).map((scene, i) => `${i + 1}. ${scene.description}`).join('\n')}` : `
1. 設置：日常場景中的意外發現
2. 對比：展示令人驚訝的相似性
3. 反應：主角和觀眾的爆笑時刻`}

娛樂效果：
透過出人意料的對比和巧合，創造讓人忍不住分享的歡樂時刻。

病毒潛力：
適合引發討論和模仿，容易在社群媒體上廣泛傳播。`;
        }
        // General video analysis based fallback
        return `【精彩內容】${title.substring(0, 30)}...

🎬 基於影片分析：
本影片包含${characters.length}個角色和${scenes.length}個場景，展現了豐富的內容層次。

主要角色：${characters.length > 0 ? `
- ${characters[0].description}` : '\n- 內容中的關鍵人物'}

場景概覽：${scenes.length > 0 ? `
${scenes.slice(0, 3).map((scene, i) => `${i + 1}. ${scene.description}`).join('\n')}` : `
1. 開場場景
2. 主要內容展開
3. 結尾場景`}

內容特色：
透過${source.duration}秒的緊湊節奏，傳達核心訊息給目標觀眾。

觀看價值：
結合視覺呈現和內容深度，為觀眾帶來既有趣又有價值的觀看體驗。`;
    }
    // Enhanced Shorts-specific pitch templates (original logic)
    if (isShorts && (title.includes('😂') || title.includes('太扯'))) {
        if (displayLanguage === 'Traditional Chinese') {
            return `【驚喜發現】「${title}」- 一個讓人忍不住爆笑的意外發現

🎬 故事概念：
開場：主角無意間發現兩個看似完全不相關的事物，卻有著令人震驚的相似性

角色設定：
- 主角：好奇心旺盛的年輕人，善於觀察生活細節
- 背景：現代都市生活場景，充滿驚喜的日常瞬間

場景描述：
1. 開頭3秒：快速剪接展示兩個物品/場景的對比
2. 中段：主角的表情變化 - 從困惑到驚訝再到爆笑
3. 結尾：加入趣味文字特效和音效，強化視覺衝擊

視覺風格：
- 使用分屏對比手法，突出相似性
- 明亮的色調搭配，營造輕鬆愉快氛围
- 快節奏剪接配合節奏感強的背景音樂
- 手持攝影風格，增加真實感和親近感

情感曲線：
好奇 → 疑惑 → 恍然大悟 → 歡樂分享
整個故事在11秒內完成情感轉換，讓觀眾產生強烈的共鳴和分享慾望

病毒潜力：
- 利用視覺錯覺和認知偏差創造話題性
- 鼓勵觀眾在評論區分享類似發現
- 適合製作系列內容，形成持續關注`;
        }
    }
    return createFallbackPitch(source, targetStyle, targetLanguage);
}
/**
 * Create a structured fallback pitch when all AI generation fails
 */
function createStructuredFallbackPitch(source, content, complexity) {
    const title = source.title || '未命名內容';
    const isShorts = (source.duration || 0) <= 60;
    const hasDescription = source.description && source.description.length > 20;
    // Check if we have video analysis data to create more specific content
    const hasVideoAnalysis = source.hasVideoAnalysis && source.videoAnalysis;
    const videoAnalysis = source.videoAnalysis;
    console.log('🎥 Creating structured fallback with video analysis:', {
        hasVideoAnalysis,
        charactersCount: videoAnalysis?.characters?.length || 0,
        scenesCount: videoAnalysis?.sceneBreakdown?.length || 0,
        title
    });
    // Use video analysis data if available
    let coreStory = '在現代社會的背景下，一位主角面對着人生的重要轉折。';
    let characterInfo = '28歲專業人士，內心堅定卻面對不確定性';
    let personality = '理性中帶有情感的繰細';
    let motivation = '尋找在變化中的平衡與方向';
    if (hasVideoAnalysis && videoAnalysis) {
        const characters = videoAnalysis.characters || [];
        const transcript = videoAnalysis.generatedTranscript || '';
        // Determine content type from title and transcript
        const isProductContent = title.includes('產品') || title.includes('亞馬遜') || transcript.includes('產品');
        const isLifeContent = title.includes('人生') || title.includes('時間') || transcript.includes('人生');
        if (isProductContent) {
            coreStory = '透過專業分析師的視角，深入探討商業世界的運作模式和策略。';
            characterInfo = '資深電商分析師，擅長數據分析和市場洞察';
            personality = '邏輯清晰且善於用數據說故事';
            motivation = '揭露商業真相，幫助創業者做出明智決策';
        }
        else if (isLifeContent) {
            coreStory = '通過深刻的思考和獨特的視角，重新審視時間與人生的關係。';
            characterInfo = '哲學思考者，善於將抽象概念具象化';
            personality = '理性思辨且富有同理心';
            motivation = '引導觀眾思考生命的本質和意義';
        }
        else if (characters.length > 0) {
            const mainChar = characters[0];
            characterInfo = mainChar.description || '影片中的關鍵人物';
            coreStory = '基於真實影片內容，展現主角的成長與發現之旅。';
        }
    }
    // Create a more structured Traditional Chinese pitch
    const structuredPitch = `【故事大綱】${title}

🎥 故事核心：
${coreStory}${hasDescription ? '透過 ' + source.description?.substring(0, 100) + '的情節設定，' : ''}故事展現了獨特的視角和深度內容。

角色設定：
- 主角：${characterInfo}
- 性格：${personality}
- 動機：${motivation}

場景架構：${isShorts ? `
1. 開場（0-10秒）：快速建立情境和主角形象
2. 轉折（10-40秒）：展示核心衝突和挑戰
3. 結尾（40-60秒）：情感高潮和啟發性結尾` : `
1. 前導：背景設定和角色介紹
2. 發展：故事衝突和情節進展
3. 高潮：最大挑戰和情感衝擊
4. 結尾：解決方案和深層意義`}

視覺風格：
- 現代簡約風格，強調人物情感表達
- 温暖色調搭配，營造親密安全的觀影體驗
- ${isShorts ? '快節奏剪接，緊抓觀眾注意力' : '穩定鏡頭語言，給予觀眾時間思考'}

核心訊息：
這是一個關於勇氣、成長和自我探索的故事。在人生的十字路口，每個人都需要找到屬於自己的答案。

目標觀眾：
25-35歲中青年群體，關注個人成長和職場發展的觀眾。`;
    return structuredPitch;
}
/**
 * Create a fallback pitch when AI processing fails
 */
function createFallbackPitch(source, targetStyle, targetLanguage) {
    const title = source.title || 'Untitled Content';
    const hasDescription = source.description && source.description.length > 20;
    const displayLanguage = getLanguageDisplayName(targetLanguage);
    // Language-specific fallback pitches
    const pitchTemplates = {
        'Traditional Chinese': (title, desc, style) => {
            if (hasDescription) {
                return `探索「${title}」背後的故事 - 一個引人入勝的敘事，探討${desc}${desc.length >= 100 ? '...' : ''}。這部${style}將內容以視覺化的方式生動呈現。`;
            }
            return `以全新的方式體驗「${title}」。這部${style}將原始內容轉化為引人入勝的視覺故事，捕捉您的注意力並有效傳達訊息。`;
        },
        'Simplified Chinese': (title, desc, style) => {
            if (hasDescription) {
                return `探索「${title}」背后的故事 - 一个引人入胜的叙事，探讨${desc}${desc.length >= 100 ? '...' : ''}。这部${style}将内容以视觉化的方式生动呈现。`;
            }
            return `以全新的方式体验「${title}」。这部${style}将原始内容转化为引人入胜的视觉故事，捕捉您的注意力并有效传达信息。`;
        },
        'English': (title, desc, style) => {
            if (hasDescription) {
                return `Discover the story behind "${title}" - a compelling narrative that explores ${desc}${desc.length >= 100 ? '...' : ''}. This ${style} brings the content to life in a visually engaging way.`;
            }
            return `Experience "${title}" in a new way. This ${style} transforms the original content into a compelling visual story that captures your attention and delivers the message effectively.`;
        }
    };
    const shortDesc = hasDescription ? (source.description || '').substring(0, 100).replace(/\s+/g, ' ').trim() : '';
    const styleText = targetStyle?.toLowerCase() || 'video';
    const pitchGenerator = pitchTemplates[displayLanguage] || pitchTemplates['English'];
    return pitchGenerator(title, shortDesc, styleText);
}
/**
 * Extract keywords from content for analysis
 */
function extractKeywordsFromContent(content) {
    if (!content || content.length < 10)
        return [];
    // Simple keyword extraction
    const words = content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
    // Count word frequency
    const wordCount = new Map();
    words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    // Return top 5 most frequent words
    return Array.from(wordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}
/**
 * Extract YouTube transcript using the dedicated transcript library with improved error handling
 */
async function extractYouTubeTranscriptInternal(videoId, apiKey) {
    try {
        console.log(`Attempting transcript extraction for video: ${videoId}`);
        const transcriptResult = await (0, youtube_transcript_1.extractYouTubeTranscript)(videoId, apiKey);
        if (transcriptResult && transcriptResult.fullText && transcriptResult.fullText.trim().length > 0) {
            console.log(`Transcript extracted successfully (${transcriptResult.fullText.length} characters)`);
            return transcriptResult.fullText;
        }
        console.log('No usable transcript content available for this video');
        return undefined;
    }
    catch (error) {
        // This is expected for most videos due to OAuth requirements
        console.log('Transcript extraction failed (expected):', error instanceof Error ? error.message : error);
        return undefined;
    }
}
