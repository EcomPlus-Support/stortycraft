import { extractYouTubeMetadata, processReferenceContent } from "./app/actions/process-reference";

async function quickTest() {
  console.log("🧪 Quick Content Complexity Test");
  console.log("=" .repeat(50));
  
  try {
    // Test metadata extraction
    console.log("📋 Step 1: Extracting metadata...");
    const metadata = await extractYouTubeMetadata("https://www.youtube.com/shorts/VgdCsCqvQdk");
    
    if (metadata.processingStatus === "error") {
      console.error("❌ Metadata extraction failed:", metadata.errorMessage);
      return;
    }
    
    console.log("✅ Metadata extraction successful");
    console.log(`   - Title: ${metadata.title}`);
    console.log(`   - Duration: ${metadata.duration}s`);
    console.log(`   - Complexity Level: ${metadata.complexityMetrics?.level}`);
    console.log(`   - Complexity Score: ${metadata.complexityMetrics?.totalScore}`);
    console.log(`   - Token Budget: ${metadata.complexityMetrics?.recommendedTokenBudget}`);
    
    // Prepare for processing
    if (!metadata.id) metadata.id = `test-${Date.now()}`;
    if (!metadata.type) metadata.type = 'youtube';
    
    // Test content processing  
    console.log("\n🔄 Step 2: Processing content...");
    const startTime = Date.now();
    const processResult = await processReferenceContent(
      metadata as any,
      'cinematic',
      'zh-TW',
      true
    );
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Content processed in ${processingTime}ms`);
    console.log(`   - Pitch length: ${processResult.generatedPitch.length}`);
    console.log(`   - Content quality: ${processResult.contentQuality}`);
    console.log(`   - Warning: ${processResult.warning || 'None'}`);
    
    console.log("\n🎯 Test Result: SUCCESS");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

quickTest();