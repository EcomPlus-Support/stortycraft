'use client'

import { useState } from 'react'

export function FeaturesSection() {
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null)

  const features = [
    {
      id: 1,
      icon: "🧠",
      title: "AI-Powered Viral Intelligence",
      headline: "Viral Pattern Analysis",
      description: "Analyzes 10M+ viral videos to identify winning patterns and trends before they peak",
      benefit: "Know what will go viral before everyone else",
      details: "Our advanced AI processes millions of data points from successful videos, identifying micro-patterns in timing, content structure, and engagement triggers that human analysis would miss."
    },
    {
      id: 2,
      icon: "📱",
      title: "One Video, Every Platform", 
      headline: "Multi-Platform Optimization",
      description: "Automatically optimizes your content for YouTube Shorts, TikTok, Instagram Reels, and more",
      benefit: "3x your reach with zero extra work",
      details: "Each platform has unique algorithmic preferences. Our AI automatically adjusts aspect ratios, pacing, captions, and content focus to maximize performance on each platform."
    },
    {
      id: 3,
      icon: "✨",
      title: "Turn Any Idea Into Viral Gold",
      headline: "Instant Content Transformation", 
      description: "Transform YouTube videos, text ideas, or audio clips into viral-ready scripts and visuals",
      benefit: "From concept to viral video in under 5 minutes",
      details: "Upload any reference material and watch our AI extract the viral essence, restructure the content, and generate compelling visuals that capture attention in the first 3 seconds."
    },
    {
      id: 4,
      icon: "🏆",
      title: "Studio-Grade Production",
      headline: "Professional Quality Output",
      description: "AI-generated visuals, voice-overs, and editing that rivals professional studios", 
      benefit: "Professional quality without the professional budget",
      details: "Advanced AI creates broadcast-quality visuals, natural-sounding voiceovers in multiple languages, and seamless editing with transitions and effects that keep viewers engaged."
    },
    {
      id: 5,
      icon: "📈", 
      title: "Stay Ahead of Trends",
      headline: "Trend Intelligence",
      description: "Real-time trend analysis with early trend detection and recommendations",
      benefit: "Ride the wave before it's mainstream", 
      details: "Our trend detection algorithm monitors content velocity, engagement patterns, and cross-platform signals to identify emerging trends 2-3 days before they hit mainstream awareness."
    },
    {
      id: 6,
      icon: "🌍",
      title: "Global Reach", 
      headline: "Bilingual Support",
      description: "Create viral content in English and Traditional Chinese with cultural adaptation",
      benefit: "Double your market reach instantly",
      details: "Beyond translation, our AI understands cultural nuances, local humor, and platform preferences in different markets to ensure your content resonates authentically."
    }
  ]

  const toggleExpand = (featureId: number) => {
    setExpandedFeature(expandedFeature === featureId ? null : featureId)
  }

  return (
    <section id="features" className="container py-5 my-5">
      <div className="row">
        <div className="col-12 text-center mb-5">
          <h2 className="display-5 fw-bold text-dark mb-4">
            Everything You Need to Create Viral Content
          </h2>
        </div>
      </div>
      
      <div className="row g-4">
        {features.map((feature) => (
          <div key={feature.id} className="col-md-6">
            <div className="card h-100 border-0 shadow-sm feature-card" 
                 style={{ transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.transform = 'translateY(-5px)'
                   e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.transform = 'translateY(0)'
                   e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                 }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="display-4 me-3">{feature.icon}</div>
                  <div>
                    <h3 className="card-title h5 fw-bold text-primary mb-1">
                      {feature.headline}
                    </h3>
                    <h4 className="h6 text-muted mb-0">{feature.title}</h4>
                  </div>
                </div>
                
                <p className="card-text text-muted mb-3">
                  {feature.description}
                </p>
                
                <div className="bg-light rounded-3 p-3 mb-3">
                  <small className="text-success fw-semibold">
                    ✓ {feature.benefit}
                  </small>
                </div>
                
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => toggleExpand(feature.id)}
                >
                  {expandedFeature === feature.id ? 'Show Less' : 'Learn More'}
                </button>
                
                {expandedFeature === feature.id && (
                  <div className="mt-3 p-3 bg-primary bg-opacity-10 rounded-3">
                    <p className="small text-dark mb-0">
                      {feature.details}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}