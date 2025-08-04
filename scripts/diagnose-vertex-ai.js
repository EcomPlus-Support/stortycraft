#!/usr/bin/env node

const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');

async function diagnoseVertexAI() {
  console.log('=== Vertex AI Diagnosis ===\n');

  const projectId = process.env.PROJECT_ID || 'fechen-aifatory';
  const location = process.env.LOCATION || 'us-central1';
  
  console.log(`Project ID: ${projectId}`);
  console.log(`Location: ${location}\n`);

  // Test 1: Check Google Auth
  console.log('1. Testing Google Auth Library...');
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const projectIdFromAuth = await auth.getProjectId();
    console.log(`   ✓ Auth successful, detected project: ${projectIdFromAuth}`);
    
    const accessToken = (await client.getAccessToken()).token;
    console.log(`   ✓ Access token obtained: ${accessToken.substring(0, 20)}...`);
  } catch (error) {
    console.log(`   ✗ Auth failed: ${error.message}`);
  }
  console.log('');

  // Test 2: Check ADC
  console.log('2. Testing Application Default Credentials...');
  try {
    const auth = new GoogleAuth();
    const client = await auth.getClient();
    const projectIdFromADC = await auth.getProjectId();
    console.log(`   ✓ ADC project: ${projectIdFromADC}`);
    
    if (projectIdFromADC !== projectId) {
      console.log(`   ⚠ WARNING: ADC project (${projectIdFromADC}) doesn't match expected project (${projectId})`);
    }
  } catch (error) {
    console.log(`   ✗ ADC failed: ${error.message}`);
  }
  console.log('');

  // Test 3: Direct API call
  console.log('3. Testing direct Vertex AI API call...');
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const response = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello'
            }]
          }]
        })
      }
    );

    const result = await response.json();
    
    if (response.ok) {
      console.log('   ✓ API call successful');
    } else {
      console.log(`   ✗ API call failed: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ✗ API test failed: ${error.message}`);
  }
  console.log('');

  // Test 4: Check environment
  console.log('4. Checking environment variables...');
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set'}`);
  console.log(`   GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT || 'Not set'}`);
  console.log(`   GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || 'Not set'}`);
  console.log('');

  // Test 5: AI SDK specific check
  console.log('5. Testing @ai-sdk/google-vertex configuration...');
  console.log('   Note: The AI SDK might use different auth mechanisms.');
  console.log('   Common issues:');
  console.log('   - SDK might not respect ADC project settings');
  console.log('   - SDK might require explicit project in environment');
  console.log('   - SDK might have different permission requirements');
  console.log('');

  console.log('=== Recommendations ===');
  console.log('1. Set explicit environment variables:');
  console.log(`   export GOOGLE_CLOUD_PROJECT=${projectId}`);
  console.log(`   export GCLOUD_PROJECT=${projectId}`);
  console.log('');
  console.log('2. Try using service account key:');
  console.log('   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json');
  console.log('');
  console.log('3. Ensure the user/service account has these roles:');
  console.log('   - Vertex AI User (roles/aiplatform.user)');
  console.log('   - Service Usage Consumer (roles/serviceusage.serviceUsageConsumer)');
}

// Run diagnosis
diagnoseVertexAI().catch(console.error);