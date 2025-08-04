#!/bin/bash

echo "=== StoryCraft Authentication Setup ==="
echo ""
echo "This script will help you set up Google Cloud authentication for StoryCraft."
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "📋 Current authentication status:"
gcloud auth list

echo ""
echo "🔐 Setting up Application Default Credentials..."
echo "This will open a browser window for authentication."
echo ""

# Revoke existing credentials to ensure fresh authentication
gcloud auth application-default revoke --quiet 2>/dev/null

# Set up new ADC
gcloud auth application-default login

echo ""
echo "✅ Authentication setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure your .env file has the correct PROJECT_ID and LOCATION"
echo "2. Ensure your Google Cloud project has the necessary APIs enabled:"
echo "   - Vertex AI API"
echo "   - Google Cloud Storage API"
echo "3. Restart your development server"
echo ""
echo "If you continue to see authentication errors, you may need to:"
echo "- Use a service account key instead of ADC"
echo "- Check your project permissions"
echo "- Verify API quotas and billing"