#!/bin/bash

echo "=== StoryCraft Google Cloud Permission Fix ==="
echo ""
echo "This script will help diagnose and fix Google Cloud permission issues."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

PROJECT_ID="fechen-aifatory"
echo -e "${YELLOW}Checking project: $PROJECT_ID${NC}"
echo ""

# 1. Check if project exists
echo "1. Checking if project exists..."
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ Project $PROJECT_ID exists${NC}"
else
    echo -e "${RED}✗ Project $PROJECT_ID does not exist or you don't have access${NC}"
    echo ""
    echo "Would you like to:"
    echo "1) Create the project (requires project creation permissions)"
    echo "2) Use a different project"
    echo "3) Exit"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo "Creating project $PROJECT_ID..."
            gcloud projects create $PROJECT_ID --name="StoryCraft AI"
            ;;
        2)
            echo "Available projects:"
            gcloud projects list
            read -p "Enter project ID to use: " PROJECT_ID
            ;;
        3)
            exit 0
            ;;
    esac
fi
echo ""

# 2. Set the project as default
echo "2. Setting project as default..."
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Project set to $PROJECT_ID${NC}"
echo ""

# 3. Check billing status
echo "3. Checking billing status..."
BILLING_INFO=$(gcloud billing projects describe $PROJECT_ID 2>&1)
if [[ $BILLING_INFO == *"billingEnabled: true"* ]]; then
    echo -e "${GREEN}✓ Billing is enabled${NC}"
else
    echo -e "${YELLOW}⚠ Billing might not be enabled${NC}"
    echo "To enable billing:"
    echo "1. Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    echo "2. Or run: gcloud billing accounts list"
    echo "   Then: gcloud billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID"
    echo ""
    read -p "Press Enter to continue after enabling billing..."
fi
echo ""

# 4. Check if required APIs are enabled
echo "4. Checking required APIs..."
APIS_TO_ENABLE=(
    "aiplatform.googleapis.com"
    "storage.googleapis.com"
)

for API in "${APIS_TO_ENABLE[@]}"; do
    if gcloud services list --enabled --project=$PROJECT_ID --filter="name:$API" --format="value(name)" | grep -q $API; then
        echo -e "${GREEN}✓ $API is enabled${NC}"
    else
        echo -e "${YELLOW}✗ $API is not enabled. Enabling...${NC}"
        gcloud services enable $API --project=$PROJECT_ID
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $API enabled successfully${NC}"
        else
            echo -e "${RED}✗ Failed to enable $API${NC}"
        fi
    fi
done
echo ""

# 5. Check current authentication
echo "5. Checking authentication..."
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "Active account: $ACTIVE_ACCOUNT"
echo ""

# 6. Set up Application Default Credentials
echo "6. Setting up Application Default Credentials..."
echo "This will open a browser window for authentication."
read -p "Press Enter to continue..."
gcloud auth application-default login
echo ""

# 7. Check IAM permissions
echo "7. Checking IAM permissions..."
echo "Current user: $ACTIVE_ACCOUNT"
echo ""
echo "Checking roles..."

REQUIRED_ROLES=(
    "roles/aiplatform.user"
    "roles/ml.admin"
)

for ROLE in "${REQUIRED_ROLES[@]}"; do
    if gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:$ACTIVE_ACCOUNT AND bindings.role:$ROLE" --format="value(bindings.role)" | grep -q $ROLE; then
        echo -e "${GREEN}✓ Has $ROLE${NC}"
    else
        echo -e "${YELLOW}✗ Missing $ROLE. Adding...${NC}"
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="user:$ACTIVE_ACCOUNT" \
            --role="$ROLE"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $ROLE added successfully${NC}"
        else
            echo -e "${RED}✗ Failed to add $ROLE${NC}"
        fi
    fi
done
echo ""

# 8. Test API access
echo "8. Testing Vertex AI API access..."
echo "Listing available models..."
if gcloud ai models list --region=us-central1 --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ Vertex AI API access successful${NC}"
else
    echo -e "${RED}✗ Vertex AI API access failed${NC}"
    echo "Please check the error messages above."
fi
echo ""

# 9. Update .env file if needed
echo "9. Checking .env configuration..."
ENV_FILE="/Users/shouian99/Desktop/macmbp/saas_app/storycraft-main/.env"
if [ -f "$ENV_FILE" ]; then
    CURRENT_PROJECT=$(grep "PROJECT_ID=" "$ENV_FILE" | cut -d'=' -f2)
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        echo -e "${YELLOW}Updating PROJECT_ID in .env to $PROJECT_ID${NC}"
        sed -i.bak "s/PROJECT_ID=.*/PROJECT_ID=$PROJECT_ID/" "$ENV_FILE"
        echo -e "${GREEN}✓ .env updated${NC}"
    else
        echo -e "${GREEN}✓ .env already has correct PROJECT_ID${NC}"
    fi
else
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp /Users/shouian99/Desktop/macmbp/saas_app/storycraft-main/.env.example "$ENV_FILE"
    sed -i.bak "s/PROJECT_ID=.*/PROJECT_ID=$PROJECT_ID/" "$ENV_FILE"
    echo -e "${GREEN}✓ .env created${NC}"
fi
echo ""

echo "=== Summary ==="
echo ""
echo "✅ Completed Google Cloud setup for project: $PROJECT_ID"
echo ""
echo "Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Try generating a storyboard again"
echo ""
echo "If you still see errors:"
echo "- Check that billing is enabled: https://console.cloud.google.com/billing?project=$PROJECT_ID"
echo "- Verify API quotas: https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas?project=$PROJECT_ID"
echo "- Check service status: https://status.cloud.google.com/"