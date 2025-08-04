#!/usr/bin/env node

console.log('=== Environment Variable Verification ===\n');

const envVars = [
  'PROJECT_ID',
  'LOCATION',
  'GOOGLE_CLOUD_PROJECT',
  'GCLOUD_PROJECT',
  'GOOGLE_APPLICATION_CREDENTIALS'
];

console.log('Current environment variables:');
envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✓ ${varName}: ${value}`);
  } else {
    console.log(`✗ ${varName}: Not set`);
  }
});

console.log('\n=== Expected Configuration ===');
console.log('PROJECT_ID: fechen-aifatory');
console.log('LOCATION: us-central1');
console.log('GOOGLE_CLOUD_PROJECT: fechen-aifatory');
console.log('GCLOUD_PROJECT: fechen-aifatory');

// Check if .env file exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');

console.log('\n=== .env File Status ===');
if (fs.existsSync(envPath)) {
  console.log('✓ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasGoogleCloudProject = envContent.includes('GOOGLE_CLOUD_PROJECT=');
  const hasGcloudProject = envContent.includes('GCLOUD_PROJECT=');
  
  console.log(`${hasGoogleCloudProject ? '✓' : '✗'} GOOGLE_CLOUD_PROJECT defined in .env`);
  console.log(`${hasGcloudProject ? '✓' : '✗'} GCLOUD_PROJECT defined in .env`);
} else {
  console.log('✗ .env file not found');
}