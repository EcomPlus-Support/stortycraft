# StoryCraft GCP Deployment Guide

## Prerequisites

1. **Google Cloud SDK** installed and configured
2. **GCP Project** with billing enabled
3. **Required APIs** enabled (will be done by script)
4. **Environment Variables** configured
5. **YouTube API Key** - See [Production Setup Guide](./docs/PRODUCTION_SETUP.md) for critical setup steps

## Quick Deployment

1. **Set up environment variables**:
   ```bash
   export YOUTUBE_API_KEY="your-youtube-api-key"
   ```

2. **Make deployment script executable**:
   ```bash
   chmod +x deploy-to-gcp.sh
   ```

3. **Run deployment**:
   ```bash
   ./deploy-to-gcp.sh
   ```

## Manual Deployment Steps

### 1. Configure GCP Project
```bash
gcloud config set project fechen-aifactory
```

### 2. Enable Required APIs
```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    aiplatform.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com
```

### 3. Create Service Account
```bash
gcloud iam service-accounts create storycraft-service-account \
    --display-name="StoryCraft Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding fechen-aifactory \
    --member="serviceAccount:storycraft-service-account@fechen-aifactory.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding fechen-aifactory \
    --member="serviceAccount:storycraft-service-account@fechen-aifactory.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

### 4. Create Storage Bucket
```bash
gsutil mb -p fechen-aifactory -l us-central1 gs://fechen-aifactory-storycraft-videos
```

### 5. Store Secrets
```bash
# Store YouTube API Key
echo -n "your-youtube-api-key" | gcloud secrets create youtube-api-key --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding youtube-api-key \
    --member="serviceAccount:storycraft-service-account@fechen-aifactory.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 6. Deploy with Cloud Build
```bash
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_ACCOUNT="storycraft-service-account@fechen-aifactory.iam.gserviceaccount.com",_BUCKET_NAME="fechen-aifactory-storycraft-videos"
```

## Environment Variables

### Required in Production:
- `PROJECT_ID`: GCP Project ID
- `LOCATION`: GCP Region (us-central1)
- `MODEL`: Veo model (veo-001)
- `GEMINI_MODEL`: Gemini model (gemini-2.5-flash)
- `GCS_VIDEOS_STORAGE_URI`: Storage bucket URI
- `YOUTUBE_API_KEY`: YouTube API key (from Secret Manager)

### Service Configuration:
- Memory: 2Gi
- CPU: 2
- Timeout: 300s
- Concurrency: 100
- Max Instances: 10
- Min Instances: 0

## Post-Deployment

### Check Service Status
```bash
gcloud run services describe storycraft --region=us-central1
```

### View Logs
```bash
gcloud run services logs read storycraft --region=us-central1
```

### Update Service
```bash
gcloud run deploy storycraft --region=us-central1 --source .
```

## Custom Domain Setup

1. **Verify domain ownership** in Google Cloud Console
2. **Map domain** to Cloud Run service:
   ```bash
   gcloud run domain-mappings create --service=storycraft --domain=yourdomain.com --region=us-central1
   ```
3. **Update DNS records** with provided values

## Monitoring

- **Cloud Run Console**: https://console.cloud.google.com/run
- **Logs Explorer**: https://console.cloud.google.com/logs
- **Monitoring Dashboard**: https://console.cloud.google.com/monitoring

## Troubleshooting

### Common Issues:

1. **Authentication errors**: Ensure service account has correct permissions
2. **Storage errors**: Check bucket permissions and URI format
3. **API errors**: Verify all required APIs are enabled
4. **Memory issues**: Increase memory allocation if needed

### Debug Commands:
```bash
# Check service details
gcloud run services describe storycraft --region=us-central1

# Check recent logs
gcloud run services logs read storycraft --region=us-central1 --limit=50

# Check service account permissions
gcloud projects get-iam-policy fechen-aifactory \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:storycraft-service-account@"
```

## Security Best Practices

1. **Use Secret Manager** for sensitive data
2. **Enable VPC connector** for private resources
3. **Configure Cloud Armor** for DDoS protection
4. **Set up Cloud IAP** for access control
5. **Enable audit logging** for compliance

## Cost Optimization

1. **Set max instances** to control costs
2. **Use min instances = 0** for development
3. **Configure autoscaling** based on traffic
4. **Monitor usage** in billing dashboard
5. **Set up budget alerts**