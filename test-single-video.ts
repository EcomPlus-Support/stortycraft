import { extractYouTubeMetadata } from "./app/actions/process-reference";

async function testSingleVideo() {
  console.log("Testing single video metadata extraction...");
  try {
    const metadata = await extractYouTubeMetadata("https://www.youtube.com/shorts/VgdCsCqvQdk");
    
    if (metadata.processingStatus === "error") {
      console.error("❌ Metadata extraction failed:", metadata.errorMessage);
      return;
    }
    
    console.log("✅ Metadata extraction successful");
    console.log("Title:", metadata.title);
    console.log("Duration:", metadata.duration);
    console.log("Has complexity metrics:", Boolean(metadata.complexityMetrics));
    
    if (metadata.complexityMetrics) {
      console.log("Complexity level:", metadata.complexityMetrics.level);
      console.log("Complexity score:", metadata.complexityMetrics.totalScore);
      console.log("Is NaN:", isNaN(metadata.complexityMetrics.totalScore));
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testSingleVideo();
