#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="fechen-aifatory"
REGION="us-central1"

echo -e "${BLUE}=== Google Cloud Project Diagnosis and Fix ===${NC}"
echo -e "${BLUE}Project: $PROJECT_ID${NC}"
echo -e "${BLUE}Region: $REGION${NC}"
echo ""

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        return 0
    else
        echo -e "${RED}✗ $1${NC}"
        return 1
    fi
}

# Check if gcloud is installed
echo "1. Checking gcloud CLI installation..."
if command -v gcloud &> /dev/null; then
    GCLOUD_VERSION=$(gcloud version --format="value(Google Cloud SDK)")
    echo -e "${GREEN}✓ gcloud CLI installed (version: $GCLOUD_VERSION)${NC}"
else
    echo -e "${RED}✗ gcloud CLI not found${NC}"
    echo "Please install Google Cloud CLI: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo ""

# Check current authentication
echo "2. Checking current authentication..."
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -n "$ACTIVE_ACCOUNT" ]; then
    echo -e "${GREEN}✓ Active account: $ACTIVE_ACCOUNT${NC}"
else
    echo -e "${RED}✗ No active account found${NC}"
    echo "Running authentication..."
    gcloud auth login
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
fi
echo ""

# Check project access
echo "3. Checking project access..."
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    PROJECT_NAME=$(gcloud projects describe $PROJECT_ID --format="value(name)")
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    echo -e "${GREEN}✓ Project accessible${NC}"
    echo "  Name: $PROJECT_NAME"
    echo "  Number: $PROJECT_NUMBER"
else
    echo -e "${RED}✗ Cannot access project $PROJECT_ID${NC}"
    echo ""
    echo "Available projects:"
    gcloud projects list --format="table(projectId,name,projectNumber)"
    echo ""
    read -p "Enter the correct project ID or press Enter to create new project: " NEW_PROJECT_ID
    
    if [ -n "$NEW_PROJECT_ID" ]; then
        PROJECT_ID=$NEW_PROJECT_ID
    else
        echo "Creating new project..."
        PROJECT_ID="storycraft-$(date +%s)"
        gcloud projects create $PROJECT_ID --name="StoryCraft AI"
        check_status "Project creation"
    fi
fi
echo ""

# Set default project
echo "4. Setting default project..."
gcloud config set project $PROJECT_ID
check_status "Set default project to $PROJECT_ID"
echo ""

# Check billing
echo "5. Checking billing status..."
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null)
if [ "$BILLING_ENABLED" = "True" ]; then
    BILLING_ACCOUNT=$(gcloud billing projects describe $PROJECT_ID --format="value(billingAccountName)" 2>/dev/null)
    echo -e "${GREEN}✓ Billing enabled${NC}"
    echo "  Account: $BILLING_ACCOUNT"
else
    echo -e "${YELLOW}⚠ Billing not enabled or not accessible${NC}"
    echo ""
    echo "Available billing accounts:"
    gcloud billing accounts list
    echo ""
    read -p "Enter billing account ID to link (or press Enter to skip): " BILLING_ACCOUNT_ID
    
    if [ -n "$BILLING_ACCOUNT_ID" ]; then
        gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID
        check_status "Link billing account"
    else
        echo -e "${YELLOW}⚠ Skipping billing setup. Note: Vertex AI requires billing to be enabled.${NC}"
    fi
fi
echo ""

# Enable required APIs
echo "6. Enabling required APIs..."
REQUIRED_APIS=(
    "aiplatform.googleapis.com"
    "storage.googleapis.com"
    "serviceusage.googleapis.com"
)

for API in "${REQUIRED_APIS[@]}"; do
    echo "Enabling $API..."
    if gcloud services enable $API --project=$PROJECT_ID; then
        echo -e "${GREEN}✓ $API enabled${NC}"
    else
        echo -e "${RED}✗ Failed to enable $API${NC}"
    fi
done
echo ""

# Wait for API propagation
echo "7. Waiting for API propagation..."
echo "Waiting 30 seconds for APIs to propagate..."
sleep 30
echo -e "${GREEN}✓ Wait complete${NC}"
echo ""

# Check IAM permissions
echo "8. Checking and setting IAM permissions..."
REQUIRED_ROLES=(
    "roles/aiplatform.user"
    "roles/ml.admin"
    "roles/serviceusage.serviceUsageConsumer"
)

for ROLE in "${REQUIRED_ROLES[@]}"; do
    echo "Checking role: $ROLE"
    if gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:user:$ACTIVE_ACCOUNT AND bindings.role:$ROLE" --format="value(bindings.role)" | grep -q "$ROLE"; then
        echo -e "${GREEN}✓ User has $ROLE${NC}"
    else
        echo "Adding role: $ROLE"
        if gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:$ACTIVE_ACCOUNT" --role="$ROLE"; then
            echo -e "${GREEN}✓ Added $ROLE${NC}"
        else
            echo -e "${RED}✗ Failed to add $ROLE${NC}"
        fi
    fi
done
echo ""

# Set up Application Default Credentials
echo "9. Setting up Application Default Credentials..."
echo "This will open a browser for authentication..."
read -p "Press Enter to continue..."

# Revoke existing ADC to ensure clean setup
gcloud auth application-default revoke --quiet 2>/dev/null

# Set up new ADC
if gcloud auth application-default login --project=$PROJECT_ID; then
    echo -e "${GREEN}✓ Application Default Credentials configured${NC}"
else
    echo -e "${RED}✗ Failed to configure Application Default Credentials${NC}"
    exit 1
fi
echo ""

# Test API access
echo "10. Testing Vertex AI API access..."
echo "Testing with gcloud CLI..."
if gcloud ai models list --region=$REGION --project=$PROJECT_ID --limit=1 &>/dev/null; then
    echo -e "${GREEN}✓ Vertex AI API accessible via gcloud${NC}"
else
    echo -e "${RED}✗ Vertex AI API not accessible via gcloud${NC}"
fi

echo ""
echo "Testing with direct API call..."
ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null)
if [ -n "$ACCESS_TOKEN" ]; then
    API_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_test_response.json \
        -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "https://$REGION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/publishers/google/models/gemini-2.5-flash:generateContent" \
        -d '{
            "contents": [{
                "parts": [{
                    "text": "Hello"
                }]
            }]
        }')
    
    HTTP_CODE="${API_RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Direct API call successful${NC}"
    else
        echo -e "${YELLOW}⚠ API call returned HTTP $HTTP_CODE${NC}"
        echo "Response:"
        cat /tmp/api_test_response.json | jq '.' 2>/dev/null || cat /tmp/api_test_response.json
    fi
    rm -f /tmp/api_test_response.json
else
    echo -e "${RED}✗ Could not get access token${NC}"
fi
echo ""

# Update .env file
echo "11. Updating application configuration..."
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    # Update PROJECT_ID
    if grep -q "PROJECT_ID=" "$ENV_FILE"; then
        sed -i.bak "s/PROJECT_ID=.*/PROJECT_ID=$PROJECT_ID/" "$ENV_FILE"
    else
        echo "PROJECT_ID=$PROJECT_ID" >> "$ENV_FILE"
    fi
    
    # Update other Google Cloud variables
    if grep -q "GOOGLE_CLOUD_PROJECT=" "$ENV_FILE"; then
        sed -i.bak "s/GOOGLE_CLOUD_PROJECT=.*/GOOGLE_CLOUD_PROJECT=$PROJECT_ID/" "$ENV_FILE"
    else
        echo "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" >> "$ENV_FILE"
    fi
    
    if grep -q "GCLOUD_PROJECT=" "$ENV_FILE"; then
        sed -i.bak "s/GCLOUD_PROJECT=.*/GCLOUD_PROJECT=$PROJECT_ID/" "$ENV_FILE"
    else
        echo "GCLOUD_PROJECT=$PROJECT_ID" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✓ Updated .env file with project: $PROJECT_ID${NC}"
else
    echo -e "${YELLOW}⚠ .env file not found${NC}"
fi
echo ""

# Final summary
echo -e "${BLUE}=== Setup Summary ===${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Active Account: $ACTIVE_ACCOUNT"
echo "Billing: $([ "$BILLING_ENABLED" = "True" ] && echo "Enabled" || echo "Check required")"
echo ""
echo -e "${GREEN}Setup completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test the application at http://localhost:3000"
echo "3. If you still see errors, check the server logs"
echo ""
echo "Troubleshooting:"
echo "- If billing errors occur, ensure billing is enabled in Google Cloud Console"
echo "- If quota errors occur, request quota increases in Google Cloud Console"
echo "- For organization policy restrictions, contact your Google Cloud admin"