#!/bin/bash

echo "=== Quick Google Cloud Status Check ==="
echo ""

PROJECT_ID="fechen-aifatory"

# Check project
echo "1. Project Status:"
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo "   ✓ Project exists: $PROJECT_ID"
else
    echo "   ✗ Project not found or no access: $PROJECT_ID"
fi

# Check APIs
echo ""
echo "2. API Status:"
if gcloud services list --enabled --project=$PROJECT_ID --filter="name:aiplatform.googleapis.com" --format="value(name)" 2>/dev/null | grep -q aiplatform; then
    echo "   ✓ Vertex AI API: Enabled"
else
    echo "   ✗ Vertex AI API: Not enabled or no access"
fi

# Check auth
echo ""
echo "3. Authentication:"
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -n "$ACTIVE_ACCOUNT" ]; then
    echo "   ✓ Active account: $ACTIVE_ACCOUNT"
else
    echo "   ✗ No active account"
fi

# Check ADC
echo ""
echo "4. Application Default Credentials:"
if gcloud auth application-default print-access-token &>/dev/null; then
    echo "   ✓ ADC configured"
else
    echo "   ✗ ADC not configured"
fi

echo ""
echo "To fix issues, run: ./scripts/fix-gcp-permissions.sh"