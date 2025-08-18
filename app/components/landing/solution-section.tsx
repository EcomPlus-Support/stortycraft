'use client'

import { useState } from 'react'

export function SolutionSection() {
  const [activeStep, setActiveStep] = useState(1)

  const steps = [
    {
      id: 1,
      title: "Input",
      description: "YouTube URL or content idea",
      detail: "Simply paste a YouTube URL or describe your content idea"
    },
    {
      id: 2, 
      title: "Analysis",
      description: "AI breakdown of viral elements",
      detail: "Our AI analyzes millions of viral videos to identify winning patterns"
    },
    {
      id: 3,
      title: "Output", 
      description: "Generated viral-optimized video",
      detail: "Get a complete viral-ready video with optimized title, thumbnail, and content"
    }
  ]

  return (
    <section className="container-fluid bg-light py-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2 text-center mb-5">
            <h2 className="display-5 fw-bold text-dark mb-4">
              ViralCraft Reveals the Viral Formula
            </h2>
            <p className="fs-4 text-muted mb-5">
              Our AI analyzes millions of viral videos across YouTube, TikTok, and Instagram to identify the exact patterns that make content explode. Then we help you apply these patterns to your content.
            </p>
          </div>
        </div>
        
        <div className="row">
          <div className="col-12">
            <div className="bg-white rounded-4 shadow-lg p-5">
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <h3 className="h4 fw-bold mb-4">Interactive Demo</h3>
                  
                  {/* Step Navigation */}
                  <div className="d-flex mb-4">
                    {steps.map((step) => (
                      <button
                        key={step.id}
                        className={`btn me-2 ${activeStep === step.id ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setActiveStep(step.id)}
                      >
                        {step.id}. {step.title}
                      </button>
                    ))}
                  </div>
                  
                  {/* Step Content */}
                  <div className="mb-4">
                    {steps.map((step) => (
                      <div key={step.id} className={activeStep === step.id ? '' : 'd-none'}>
                        <h4 className="h5 fw-bold text-primary">{step.title}</h4>
                        <p className="text-muted mb-3">{step.description}</p>
                        <p className="fs-6">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="progress mb-4" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-primary" 
                      style={{ width: `${(activeStep / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="col-lg-6">
                  <div className="position-relative">
                    {/* Demo Visualization */}
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-4 p-4" style={{ minHeight: '300px' }}>
                      {activeStep === 1 && (
                        <div className="text-center py-5">
                          <div className="bg-white rounded-3 p-4 shadow-sm">
                            <div className="form-group">
                              <input 
                                type="text" 
                                className="form-control form-control-lg"
                                placeholder="Paste YouTube URL here..."
                                defaultValue="https://youtube.com/watch?v=example"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeStep === 2 && (
                        <div className="py-3">
                          <h5 className="fw-bold mb-3">AI Analysis Results:</h5>
                          <div className="row g-2">
                            <div className="col-6">
                              <div className="bg-success text-white rounded p-2 text-center">
                                <small>Viral Score: 8.7/10</small>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="bg-warning text-dark rounded p-2 text-center">
                                <small>Trend Match: 94%</small>
                              </div>
                            </div>
                            <div className="col-12 mt-3">
                              <div className="bg-primary text-white rounded p-3">
                                <small>✓ Hook pattern detected</small><br/>
                                <small>✓ Optimal length identified</small><br/>
                                <small>✓ Trending keywords found</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeStep === 3 && (
                        <div className="text-center py-3">
                          <div className="bg-success text-white rounded-4 p-4">
                            <h5 className="fw-bold mb-3">🎉 Viral Video Ready!</h5>
                            <div className="row g-2">
                              <div className="col-12">
                                <div className="bg-white text-dark rounded p-2">
                                  <small>Predicted Views: 500K - 2M</small>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="bg-light text-dark rounded p-2">
                                  <small>Optimized Title ✓</small>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="bg-light text-dark rounded p-2">
                                  <small>Viral Thumbnail ✓</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}