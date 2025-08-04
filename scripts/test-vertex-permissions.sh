#!/bin/bash

echo "=== Vertex AI Permission Test ==="
echo ""

PROJECT_ID="fechen-aifatory"
LOCATION="us-central1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing project: $PROJECT_ID"
echo "Location: $LOCATION"
echo ""

# 1. Test with gcloud directly
echo "1. Testing Vertex AI with gcloud CLI..."
echo "   Running: gcloud ai models list"
if gcloud ai models list --region=$LOCATION --project=$PROJECT_ID --limit=1 &>/dev/null; then
    echo -e "${GREEN}✓ gcloud can access Vertex AI${NC}"
else
    echo -e "${RED}✗ gcloud cannot access Vertex AI${NC}"
    echo "   Error output:"
    gcloud ai models list --region=$LOCATION --project=$PROJECT_ID --limit=1 2>&1
fi
echo ""

# 2. Test prediction with gcloud
echo "2. Testing Vertex AI prediction with gcloud..."
TEMP_FILE="/tmp/vertex-test-input.json"
cat > $TEMP_FILE << EOF
{
  "instances": [
    {
      "content": "Hello"
    }
  ]
}
EOF

if gcloud ai endpoints predict \
    --project=$PROJECT_ID \
    --region=$LOCATION \
    --endpoint="google/gemini-2.5-flash" \
    --json-request=$TEMP_FILE &>/dev/null 2>&1; then
    echo -e "${GREEN}✓ gcloud can make predictions${NC}"
else
    echo -e "${YELLOW}⚠ Note: Direct endpoint prediction might not work with managed models${NC}"
fi
rm -f $TEMP_FILE
echo ""

# 3. Check current authentication context
echo "3. Current authentication context..."
echo "   Active account:"
gcloud auth list --filter=status:ACTIVE --format="value(account)"
echo ""
echo "   ADC account:"
gcloud auth application-default print-access-token &>/dev/null && echo -e "${GREEN}✓ ADC is configured${NC}" || echo -e "${RED}✗ ADC not configured${NC}"
echo ""

# 4. Check IAM permissions
echo "4. Checking IAM permissions..."
CURRENT_USER=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "   Checking permissions for: $CURRENT_USER"
echo ""

# Test specific permissions
PERMISSIONS=(
    "aiplatform.endpoints.predict"
    "aiplatform.models.predict"
    "serviceusage.services.use"
)

for PERM in "${PERMISSIONS[@]}"; do
    if gcloud projects get-iam-policy $PROJECT_ID \
        --flatten="bindings[].members" \
        --filter="bindings.members:$CURRENT_USER" \
        --format="value(bindings.role)" 2>/dev/null | xargs -I {} gcloud iam roles describe {} --format="value(includedPermissions)" 2>/dev/null | grep -q "$PERM"; then
        echo -e "   ${GREEN}✓ Has permission: $PERM${NC}"
    else
        echo -e "   ${YELLOW}? Cannot verify: $PERM${NC}"
    fi
done
echo ""

# 5. Test with curl
echo "5. Testing direct API access with curl..."
ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null)
if [ -n "$ACCESS_TOKEN" ]; then
    RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models/gemini-2.5-flash:generateContent" \
        -d '{
            "contents": [{
                "parts": [{
                    "text": "Hello"
                }]
            }]
        }')
    
    if echo "$RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ API call failed${NC}"
        echo "   Response: $RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        echo -e "${GREEN}✓ API call successful${NC}"
    fi
else
    echo -e "${RED}✗ Could not get access token${NC}"
fi
echo ""

# 6. Additional checks
echo "6. Additional diagnostics..."
echo "   Project number:"
gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>/dev/null || echo "Could not get project number"
echo ""
echo "   Service account used by ADC:"
gcloud auth application-default print-access-token &>/dev/null && \
    (ACCESS_TOKEN=$(gcloud auth application-default print-access-token) && \
     curl -s -H "Authorization: Bearer $ACCESS_TOKEN" https://www.googleapis.com/oauth2/v1/tokeninfo | jq -r '.email' 2>/dev/null || echo "Could not determine")
echo ""

echo "=== Summary ==="
echo ""
echo "If you're seeing permission errors despite everything looking correct:"
echo ""
echo "1. The AI SDK might be using a different authentication method"
echo "2. Try setting these environment variables:"
echo "   export GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
echo "   export GCLOUD_PROJECT=$PROJECT_ID"
echo ""
echo "3. Consider using a service account key:"
echo "   - Create a service account with Vertex AI permissions"
echo "   - Download the key file"
echo "   - Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json"
echo ""
echo "4. Check if there are organization policies blocking access"
echo "5. Verify the model 'gemini-2.5-flash' is available in your region"