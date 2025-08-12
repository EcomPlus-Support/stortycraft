# StoryCraft Production Setup Guide

## Prerequisites

1. Google Cloud Project: `fechen-aifactory`
2. gcloud CLI authenticated with appropriate permissions
3. YouTube API Key from Google Cloud Console

## Critical Environment Configuration

### YouTube API Key Setup (REQUIRED)

The YouTube API key MUST be configured in Google Cloud Secret Manager before deployment:

```bash
# 1. Create the secret with your YouTube API key
echo -n "YOUR_YOUTUBE_API_KEY" | gcloud secrets create youtube-api-key \
  --data-file=- \
  --project=fechen-aifactory

# 2. Grant permissions to service accounts
# For the application service account
gcloud secrets add-iam-policy-binding youtube-api-key \
  --member="serviceAccount:storycraft-service-account@fechen-aifactory.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=fechen-aifactory

# For the default compute engine service account
gcloud secrets add-iam-policy-binding youtube-api-key \
  --member="serviceAccount:852240148558-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=fechen-aifactory
```

### Deployment Command

After setting up the YouTube API key, deploy using:

```bash
# Using Cloud Build
gcloud builds submit --config=cloudbuild.yaml .

# Or direct deployment
gcloud run deploy storycraft \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=4 \
  --timeout=900 \
  --max-instances=5 \
  --port=3000 \
  --update-secrets=YOUTUBE_API_KEY=youtube-api-key:latest
```

## Environment Variables

The following environment variables are automatically configured:

- `PROJECT_ID`: fechen-aifactory
- `LOCATION`: us-central1
- `MODEL`: veo-001
- `GEMINI_MODEL`: gemini-2.5-flash
- `NODE_ENV`: production
- `YOUTUBE_API_KEY`: Loaded from Secret Manager

## Verification

After deployment, verify the service:

```bash
# Check service status
gcloud run services describe storycraft --region=us-central1

# Verify YouTube API key is configured
gcloud run services describe storycraft \
  --region=us-central1 \
  --format=json | grep -A 3 "YOUTUBE_API_KEY"
```

## Troubleshooting

### YouTube Processing Errors

If you see "Invalid YouTube URL" errors:
1. Verify the YouTube API key is properly set in Secret Manager
2. Check that service accounts have proper permissions
3. Ensure the API key has YouTube Data API v3 enabled in Google Cloud Console

### Service Account Issues

If deployment fails with permission errors:
1. Ensure both service accounts have Secret Manager access
2. Check that the service account has proper Cloud Run permissions

## Important Notes

- **NEVER** commit API keys directly to the repository
- Always use Secret Manager for sensitive data
- The YouTube API key is essential for the Reference tab functionality
- Keep the API key quota limits in mind for production usage