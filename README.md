# 🎬 StoryCraft AI

**AI-Powered Video Content Creation Platform**

StoryCraft AI is a comprehensive video content creation platform that transforms YouTube videos, text inputs, and audio uploads into professional video pitches and storyboards using Google Vertex AI (Gemini) and advanced video analysis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2.31-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)
![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI-orange)

## ✨ Features

### 🎥 **Multi-Source Content Processing**
- **YouTube Integration**: Extract and analyze YouTube videos (including YouTube Shorts)
- **Audio Upload**: Convert audio files to video concepts
- **Text Input**: Transform written content into visual stories
- **Advanced Video Analysis**: Frame-by-frame analysis with character and scene detection

### 🤖 **AI-Powered Generation**
- **Google Vertex AI Integration**: Powered by Gemini 2.5-flash for content generation
- **Intelligent Content Analysis**: Automatic content complexity assessment
- **Multi-Language Support**: Generate content in Traditional Chinese, English, and more
- **Structured Output**: Consistent story format with characters, scenes, and production notes

### 📊 **Professional Tools**
- **Storyboard Creation**: Visual scene-by-scene breakdowns
- **Video Generation**: AI-powered video creation with Google Veo
- **Image Generation**: High-quality images with Google Imagen
- **Aspect Ratio Support**: Multiple formats (16:9, 9:16, 1:1, 4:3)

### 🚀 **Production Features**
- **YouTube Shorts Optimization**: Specialized processing for viral short-form content
- **Comprehensive Error Handling**: Robust error recovery and user feedback
- **Performance Monitoring**: Built-in analytics and health checks
- **Cloud-Native Deployment**: Optimized for Google Cloud Run

## 🏗️ Architecture

```
StoryCraft AI
├── Frontend (Next.js + React)
│   ├── Multi-tab Interface (YouTube/Text/Audio/Storyboard)
│   ├── Real-time Processing Status
│   └── Responsive Design
├── Backend APIs
│   ├── YouTube Processing (/api/process-youtube)
│   ├── Text Processing (/api/process-text)
│   ├── Video Generation (/api/videos)
│   └── Health Monitoring (/api/health)
├── AI Services
│   ├── Google Vertex AI (Gemini 2.5-flash)
│   ├── Google Imagen (Image Generation)
│   ├── Google Veo (Video Generation)
│   └── YouTube Data API v3
└── Infrastructure
    ├── Google Cloud Run (Production)
    ├── Container Registry (Docker)
    └── Cloud Storage (Media Files)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- npm/yarn/pnpm
- Google Cloud Project with Vertex AI enabled
- YouTube Data API v3 key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/storycraft.git
   cd storycraft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   ```env
   # Google Cloud Configuration
   PROJECT_ID=your-gcp-project-id
   LOCATION=us-central1
   GEMINI_MODEL=gemini-2.5-flash
   
   # YouTube API
   YOUTUBE_API_KEY=your-youtube-api-key
   
   # Optional: Storage
   GCS_VIDEOS_STORAGE_URI=gs://your-bucket/videos/
   ```

5. **Authentication Setup**
   ```bash
   # For local development
   gcloud auth application-default login
   
   # Set your GCP project
   gcloud config set project your-gcp-project-id
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Playwright E2E Testing
npx playwright test  # Run end-to-end tests
npx playwright test --ui # Run tests with UI mode
```

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── process-youtube/  # YouTube processing
│   │   ├── process-text/     # Text processing
│   │   ├── videos/          # Video generation
│   │   └── health/          # Health checks
│   ├── components/        # React Components
│   ├── actions/          # Server Actions
│   └── types.ts          # TypeScript definitions
├── lib/                   # Core Libraries
│   ├── gemini-service.ts    # Vertex AI integration
│   ├── youtube-processing-service.ts # YouTube API
│   ├── video-downloader.ts  # yt-dlp integration
│   ├── structured-output-service.ts # AI formatting
│   └── config.ts           # Configuration
├── tests/                 # E2E Tests
└── __tests__/            # Unit Tests
```

### Key Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **AI/ML**: Google Vertex AI, Gemini 2.5-flash, Imagen, Veo
- **Video Processing**: yt-dlp, FFmpeg
- **Testing**: Jest, Playwright, Testing Library
- **Deployment**: Docker, Google Cloud Run

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PROJECT_ID` | Google Cloud Project ID | ✅ | - |
| `LOCATION` | GCP Region | ✅ | us-central1 |
| `GEMINI_MODEL` | Gemini model version | ✅ | gemini-2.5-flash |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | ✅ | - |
| `GCS_VIDEOS_STORAGE_URI` | Cloud Storage URI | ❌ | - |
| `NODE_ENV` | Environment mode | ❌ | development |

### Google Cloud Setup

1. **Enable APIs**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   gcloud services enable youtube.googleapis.com
   gcloud services enable storage-api.googleapis.com
   ```

2. **Create Service Account** (for production)
   ```bash
   gcloud iam service-accounts create storycraft-ai \
     --display-name="StoryCraft AI Service Account"
   
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:storycraft-ai@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

3. **Create YouTube API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Credentials
   - Create API Key and restrict to YouTube Data API v3

## 🚀 Deployment

### Docker Deployment

1. **Build container**
   ```bash
   docker build -t storycraft .
   ```

2. **Run locally**
   ```bash
   docker run -p 3000:3000 \
     -e PROJECT_ID=your-project \
     -e YOUTUBE_API_KEY=your-key \
     storycraft
   ```

### Google Cloud Run

1. **Build and deploy**
   ```bash
   gcloud run deploy storycraft \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 300 \
     --set-env-vars PROJECT_ID=your-project \
     --set-secrets YOUTUBE_API_KEY=youtube-api-key:latest
   ```

2. **Configure secrets**
   ```bash
   echo "your-youtube-api-key" | gcloud secrets create youtube-api-key --data-file=-
   ```

### Health Checks

Monitor your deployment:
- **Basic Health**: `GET /api/health`
- **System Status**: `GET /api/health/system`
- **Gemini Status**: `GET /api/health/gemini`

## 📖 API Documentation

### YouTube Processing

**POST** `/api/process-youtube`

```json
{
  "url": "https://youtube.com/watch?v=...",
  "targetLanguage": "繁體中文",
  "useStructuredOutput": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "result_123",
    "source": {
      "type": "youtube",
      "title": "Video Title",
      "duration": 60,
      "hasVideoAnalysis": true
    },
    "generatedPitch": "Complete story structure...",
    "contentQuality": "full"
  }
}
```

### Text Processing

**POST** `/api/process-text`

```json
{
  "content": "Your text content here",
  "targetLanguage": "繁體中文",
  "targetStyle": "viral"
}
```

## 🧪 Testing

### Unit Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### E2E Tests
```bash
npx playwright test                    # Run all E2E tests
npx playwright test --ui              # Interactive mode
npx playwright test --headed          # With browser UI
npx playwright test tests/youtube.spec.ts  # Specific test
```

### Test Coverage
- API Routes: YouTube processing, text processing, health checks
- Components: Video player, storyboard, aspect ratio handling
- Services: Gemini integration, YouTube API, video analysis
- Error Handling: Network failures, invalid inputs, timeout scenarios

## 🔧 Troubleshooting

### Common Issues

**1. Authentication Errors**
```bash
# Re-authenticate with Google Cloud
gcloud auth application-default login
gcloud config set project your-project-id
```

**2. YouTube API Quota**
- Check [quota limits](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
- Monitor usage in Google Cloud Console

**3. Video Download Issues**
```bash
# Test yt-dlp installation
yt-dlp --version
python3 --version
```

**4. Memory Issues in Production**
- Increase Cloud Run memory allocation
- Monitor `/api/health/system` for resource usage

### Debug Mode

Enable verbose logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Add tests for new features
- Update documentation
- Ensure health checks pass
- Test with multiple video formats

## 📊 Performance

### Benchmarks
- **YouTube Processing**: ~5-15 seconds (depending on video length)
- **Text Processing**: ~2-5 seconds
- **Video Generation**: ~30-60 seconds
- **Image Generation**: ~3-10 seconds

### Optimization Features
- **Adaptive Token Management**: Smart token allocation based on content complexity
- **Intelligent Caching**: Redis-based caching for repeated requests
- **Parallel Processing**: Concurrent API calls where possible
- **Resource Monitoring**: Real-time performance metrics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Vertex AI](https://cloud.google.com/vertex-ai) for powerful AI capabilities
- [Next.js](https://nextjs.org/) for the excellent React framework
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for video download functionality
- [YouTube Data API](https://developers.google.com/youtube/v3) for video metadata

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-username/storycraft/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/storycraft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/storycraft/discussions)

---

**Built with ❤️ by the StoryCraft Team**

Transform your ideas into compelling visual stories with the power of AI.