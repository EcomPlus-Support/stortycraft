'use client'

import { useState } from 'react'

export function GeneratedExamplesSection() {
  const [selectedExample, setSelectedExample] = useState<number | null>(null)

  const examples = [
    {
      id: 1,
      title: "Tech Review",
      category: "Technology",
      beforeViews: "2.1K",
      afterViews: "1.2M", 
      description: "iPhone review transformed into viral comparison format",
      thumbnail: "/api/placeholder/300/533", // 9:16 aspect ratio
      style: "Split-screen comparison with dynamic text overlays"
    },
    {
      id: 2,
      title: "Cooking Hack",
      category: "Food & Lifestyle", 
      beforeViews: "850",
      afterViews: "680K",
      description: "Simple recipe turned into trending cooking hack",
      thumbnail: "/api/placeholder/300/533",
      style: "Quick cuts with suspenseful timing and hook text"
    },
    {
      id: 3,
      title: "Fitness Tip",
      category: "Health & Fitness",
      beforeViews: "1.5K", 
      afterViews: "950K",
      description: "Exercise demonstration with viral transformation",
      thumbnail: "/api/placeholder/300/533",
      style: "Before/after progression with motivational copy"
    },
    {
      id: 4,
      title: "Business Insight",
      category: "Business",
      beforeViews: "3.2K",
      afterViews: "2.1M",
      description: "Marketing tip restructured for maximum engagement", 
      thumbnail: "/api/placeholder/300/533",
      style: "Story-driven format with data visualization"
    },
    {
      id: 5,
      title: "Travel Secret",
      category: "Travel",
      beforeViews: "1.8K",
      afterViews: "1.5M",
      description: "Hidden destination revealed through viral storytelling",
      thumbnail: "/api/placeholder/300/533", 
      style: "Mystery reveal format with stunning visuals"
    },
    {
      id: 6,
      title: "Life Hack",
      category: "Lifestyle",
      beforeViews: "920",
      afterViews: "800K",
      description: "Daily routine tip transformed into viral life hack",
      thumbnail: "/api/placeholder/300/533",
      style: "Problem/solution format with relatable scenarios"
    }
  ]

  return (
    <section id="examples" className="container py-5 my-5">
      <div className="row">
        <div className="col-12 text-center mb-5">
          <h2 className="display-5 fw-bold text-dark mb-4">
            Real Examples, Real Results
          </h2>
          <p className="fs-5 text-muted mb-4">
            See how creators transformed ordinary content into viral sensations using ViralCraft
          </p>
          <div className="bg-primary bg-opacity-10 rounded-pill d-inline-block px-4 py-2">
            <span className="text-primary fw-semibold">All videos generated in under 5 minutes</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {examples.map((example) => (
          <div key={example.id} className="col-lg-4 col-md-6 col-sm-12">
            <div 
              className="card border-0 shadow-sm h-100 example-card"
              style={{ 
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedExample(selectedExample === example.id ? null : example.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)'
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'
              }}
            >
              {/* Video Thumbnail - 9:16 Aspect Ratio */}
              <div className="position-relative">
                <div 
                  className="bg-gradient-to-br rounded-top d-flex align-items-center justify-content-center text-white position-relative"
                  style={{ aspectRatio: '9/16', minHeight: '280px' }}
                >
                  {/* Placeholder Video Content */}
                  <div className="text-center px-3">
                    <div className="mb-3">
                      <div className="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: '60px', height: '60px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    <h5 className="fw-bold mb-2">{example.title}</h5>
                    <span className="badge bg-white bg-opacity-20 mb-2">{example.category}</span>
                    <p className="small mb-0 text-white-75">{example.style}</p>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="position-absolute top-0 start-0 m-3">
                    <span className="badge bg-dark bg-opacity-50 text-white">
                      {example.category}
                    </span>
                  </div>
                  
                  {/* Play Button */}
                  <div className="position-absolute bottom-0 end-0 m-3">
                    <div className="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Gradient overlay for better text readability */}
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-br opacity-75 rounded-top"></div>
              </div>

              <div className="card-body p-4">
                <h5 className="card-title fw-bold text-dark mb-2">{example.title}</h5>
                <p className="card-text text-muted mb-3">{example.description}</p>
                
                {/* Before/After Stats */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <div className="bg-light rounded-2 p-2 text-center">
                      <small className="text-muted d-block">Before</small>
                      <span className="fw-semibold text-dark">{example.beforeViews}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-success bg-opacity-10 rounded-2 p-2 text-center">
                      <small className="text-success d-block">After</small>
                      <span className="fw-bold text-success">{example.afterViews}</span>
                    </div>
                  </div>
                </div>

                {selectedExample === example.id && (
                  <div className="mt-3 p-3 bg-primary bg-opacity-5 rounded-3 border border-primary border-opacity-20">
                    <h6 className="fw-semibold text-primary mb-2">Viral Strategy Applied:</h6>
                    <p className="small text-dark mb-2">{example.style}</p>
                    <div className="d-flex align-items-center text-success small">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="me-1">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      Generated with ViralCraft AI
                    </div>
                  </div>
                )}
                
                <button className="btn btn-outline-primary btn-sm w-100 mt-2">
                  {selectedExample === example.id ? 'Hide Details' : 'View Strategy'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="row mt-5">
        <div className="col-12 text-center">
          <div className="bg-primary bg-opacity-5 rounded-4 p-5 border border-primary border-opacity-20">
            <h3 className="fw-bold text-dark mb-3">Ready to Create Your Own Viral Content?</h3>
            <p className="text-muted mb-4">
              Join thousands of creators who've transformed their content strategy with ViralCraft
            </p>
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              <button className="btn btn-primary btn-lg px-4 px-sm-5">
                Start Creating Free
              </button>
              <button className="btn btn-outline-primary btn-lg px-3 px-sm-4">
                View More Examples
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}