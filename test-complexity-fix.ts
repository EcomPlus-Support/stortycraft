
import { contentComplexityAnalyzer } from "./lib/content-complexity-analyzer";

// Test the complexity analyzer directly
const testVideoAnalysis = {
  characters: [{ name: "Test" }],
  sceneBreakdown: [{ scene: "test" }],
  dialogues: [{ text: "test" }],
  generatedTranscript: "This is a test transcript"
};

const testSource = {
  duration: 30,
  transcript: "Test transcript",
  description: "Test description"
};

console.log("Testing complexity analyzer...");
try {
  const result = contentComplexityAnalyzer.analyzeComplexity(testVideoAnalysis, testSource);
  console.log("✅ Success:", {
    totalScore: result.totalScore,
    level: result.level,
    isNaN: isNaN(result.totalScore)
  });
} catch (error) {
  console.error("❌ Error:", error.message);
}

