// Debug script to test Gemini response parsing
const fs = require('fs');

// Read the last few lines of the log to find the actual Gemini response
const logContent = fs.readFileSync('/Users/shouian99/Desktop/macmbp/saas_app/storycraft-main/server-dev.log', 'utf8');
const lines = logContent.split('\n').slice(-100); // Get last 100 lines

// Find the textPreview content
let geminiResponse = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('textPreview:') || line.includes("'```json\\n' +")) {
    // Try to reconstruct the full response
    let fullResponse = '';
    let j = i;
    while (j < lines.length && (lines[j].includes("'") || lines[j].includes('"') || lines[j].includes('+'))) {
      const cleanLine = lines[j].replace(/.*textPreview:\s*/, '').replace(/.*'/, '').replace(/'.*/, '').replace(/\s*\+\s*/, '');
      if (cleanLine.includes('```json') || cleanLine.includes('{') || cleanLine.includes('"')) {
        fullResponse += cleanLine.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
      j++;
      if (lines[j] && lines[j].includes('}') && !lines[j].includes('{')) break;
    }
    
    console.log('=== FOUND GEMINI RESPONSE ===');
    console.log(fullResponse);
    
    // Try to parse it
    try {
      const cleaned = fullResponse.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
      console.log('\n=== CLEANED RESPONSE ===');
      console.log(cleaned);
      
      const parsed = JSON.parse(cleaned);
      console.log('\n=== PARSED SUCCESSFULLY ===');
      console.log('Analysis:', parsed.analysis);
      console.log('Generated Pitch Length:', parsed.generatedPitch?.length || 'NOT FOUND');
      console.log('Generated Pitch:', parsed.generatedPitch?.substring(0, 200) + '...');
      
    } catch (error) {
      console.log('\n=== PARSING FAILED ===');
      console.log('Error:', error.message);
    }
    break;
  }
}

if (!geminiResponse) {
  console.log('No Gemini response found in recent logs');
  // Show recent log entries that might contain the response
  const recentLines = lines.filter(line => 
    line.includes('Generated text successfully') || 
    line.includes('textLength') || 
    line.includes('textPreview') ||
    line.includes('Raw AI response')
  );
  console.log('Recent relevant log entries:');
  recentLines.forEach(line => console.log(line));
}