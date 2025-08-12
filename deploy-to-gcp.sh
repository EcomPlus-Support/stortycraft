#!/bin/bash

# StoryCraft GCP Deployment Script

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="fechen-aifactory"
REGION="us-central1"
SERVICE_NAME="storycraft"
SERVICE_ACCOUNT="storycraft-service-account"

echo -e "${GREEN}🚀 Starting StoryCraft deployment to Google Cloud Platform${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}📋 Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    aiplatform.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com

# Create service account if it doesn't exist
echo -e "${YELLOW}👤 Checking service account...${NC}"
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com &> /dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
        --display-name="StoryCraft Service Account"
    
    # Grant necessary permissions
    echo "Granting permissions..."
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/aiplatform.user"
    
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/storage.objectAdmin"
    
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor"
else
    echo "Service account already exists."
fi

# Create storage bucket for videos if it doesn't exist
BUCKET_NAME="${PROJECT_ID}-storycraft-videos"
echo -e "${YELLOW}🗄️  Checking storage bucket...${NC}"
if ! gsutil ls -b gs://${BUCKET_NAME} &> /dev/null; then
    echo "Creating storage bucket..."
    gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_NAME}
    gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin gs://${BUCKET_NAME}
else
    echo "Storage bucket already exists."
fi

# Store YouTube API key in Secret Manager
echo -e "${YELLOW}🔐 Storing secrets in Secret Manager...${NC}"
if [[ -n "$YOUTUBE_API_KEY" ]]; then
    echo "Storing YouTube API key..."
    echo -n "$YOUTUBE_API_KEY" | gcloud secrets create youtube-api-key \
        --data-file=- \
        --replication-policy="automatic" 2>/dev/null || \
    echo -n "$YOUTUBE_API_KEY" | gcloud secrets versions add youtube-api-key --data-file=-
    
    # Grant access to service account
    gcloud secrets add-iam-policy-binding youtube-api-key \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor"
else
    echo -e "${YELLOW}⚠️  YOUTUBE_API_KEY not set. You'll need to add it manually to Secret Manager.${NC}"
fi

# Build and deploy using Cloud Build
echo -e "${YELLOW}🏗️  Starting Cloud Build deployment...${NC}"
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_ACCOUNT="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com",_BUCKET_NAME="${BUCKET_NAME}" \
    .

# Get the service URL
echo -e "${YELLOW}🔍 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update YOUTUBE_API_KEY in Secret Manager if not already set"
echo "2. Configure custom domain if needed"
echo "3. Monitor the service at: https://console.cloud.google.com/run"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "- View logs: gcloud run services logs read ${SERVICE_NAME} --region=${REGION}"
echo "- Update service: gcloud run deploy ${SERVICE_NAME} --region=${REGION} --source ."
echo "- Check status: gcloud run services describe ${SERVICE_NAME} --region=${REGION}"