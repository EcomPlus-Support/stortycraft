// Debug script to extract complete Gemini response
const fs = require('fs');

// Read the log file
const logContent = fs.readFileSync('/Users/shouian99/Desktop/macmbp/saas_app/storycraft-main/server-dev.log', 'utf8');

// Find the most recent successful generation with textLength: 870
const lines = logContent.split('\n');
let foundTextLength870 = false;
let startExtraction = false;

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  
  if (line.includes('textLength: 870')) {
    foundTextLength870 = true;
    console.log('Found 870-character response at line:', i);
    
    // Look for the start of the response content
    for (let j = i; j < Math.min(i + 50, lines.length); j++) {
      const responseLine = lines[j];
      if (responseLine.includes('textPreview:') || responseLine.includes('"analysis"') || responseLine.includes('keyTopics')) {
        console.log('\n=== FOUND RESPONSE START ===');
        console.log('Starting from line:', j);
        
        // Extract the response - it might be spread across multiple log lines
        let fullResponse = '';
        for (let k = j; k < Math.min(j + 30, lines.length); k++) {
          const extractLine = lines[k].trim();
          if (extractLine.includes('textPreview:')) {
            // Remove the prefix
            const cleaned = extractLine.replace(/.*textPreview:\s*/, '').replace(/^['"]/, '').replace(/['"].*$/, '');
            fullResponse += cleaned;
          } else if (extractLine.includes('Raw AI response') || extractLine.includes('Starting enhanced JSON parsing')) {
            break;
          } else if (extractLine.includes('"') && (extractLine.includes('analysis') || extractLine.includes('keyTopics') || extractLine.includes('sentiment'))) {
            // This might be part of the response
            fullResponse += extractLine;
          }
        }
        
        // Try to clean and parse
        console.log('\n=== EXTRACTED RESPONSE ===');
        console.log('Length:', fullResponse.length);
        console.log('Content:', fullResponse.substring(0, 500) + '...');
        
        // Try to find JSON boundaries
        const jsonStart = fullResponse.indexOf('{');
        const jsonEnd = fullResponse.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonContent = fullResponse.substring(jsonStart, jsonEnd);
          console.log('\n=== EXTRACTED JSON ===');
          console.log(jsonContent);
          
          try {
            const parsed = JSON.parse(jsonContent);
            console.log('\n=== PARSING SUCCESSFUL ===');
            console.log('Keys:', Object.keys(parsed));
            if (parsed.analysis) console.log('Analysis keys:', Object.keys(parsed.analysis));
            if (parsed.generatedPitch) console.log('Pitch length:', parsed.generatedPitch.length);
          } catch (error) {
            console.log('\n=== PARSING FAILED ===');
            console.log('Error:', error.message);
          }
        }
        
        return;
      }
    }
  }
}

if (!foundTextLength870) {
  console.log('Could not find the 870-character response in recent logs');
  // Look for any recent Gemini responses
  const recentResponses = lines.filter(line => line.includes('Generated text successfully')).slice(-5);
  console.log('Recent Gemini responses found:');
  recentResponses.forEach((line, idx) => {
    console.log(`${idx + 1}:`, line);
  });
}