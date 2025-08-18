'use client'

import { useState } from 'react'

export function SocialProofSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const statistics = [
    { number: "10,000+", label: "Active Creators" },
    { number: "500M+", label: "Views Generated" }, 
    { number: "340%", label: "Average View Increase" },
    { number: "89%", label: "Success Rate" }
  ]

  const testimonials = [
    {
      id: 1,
      name: "Sarah Chen",
      role: "Tech Reviewer",
      avatar: "👩‍💻",
      quote: "My tech reviews went from 50K to 2M views average after using ViralCraft's viral patterns. The AI found elements I never noticed in successful tech content.",
      metrics: "4000% view increase",
      platforms: ["YouTube", "TikTok"],
      beforeViews: "50K",
      afterViews: "2M"
    },
    {
      id: 2,
      name: "Marketing Agency XYZ", 
      role: "Digital Marketing Agency",
      avatar: "🏢",
      quote: "We manage 50+ client accounts and ViralCraft reduced our content creation time by 75% while improving engagement rates across all platforms.",
      metrics: "75% time reduction, 180% engagement boost",
      platforms: ["YouTube", "TikTok", "Instagram", "Facebook"],
      beforeViews: "Mixed Results",
      afterViews: "Consistent Growth"
    },
    {
      id: 3,
      name: "李小明",
      role: "Lifestyle Creator", 
      avatar: "👨‍🎨",
      quote: "在中文市場創作爆款內容變得簡單了。ViralCraft理解文化差異，幫我的內容在兩岸三地都爆紅。",
      translation: "Creating viral content in Chinese markets became simple. ViralCraft understands cultural differences and helped my content go viral across Greater China.",
      metrics: "600% follower growth",
      platforms: ["YouTube", "抖音"],
      beforeViews: "10K",
      afterViews: "70K"
    }
  ]

  const caseStudies = [
    { title: "Tech Review", before: "45K", after: "1.8M", growth: "+3900%" },
    { title: "Cooking Tutorial", before: "12K", after: "680K", growth: "+5567%" },
    { title: "Gaming Content", before: "89K", after: "2.3M", growth: "+2584%" }
  ]

  return (
    <section id="testimonials" className="container-fluid bg-light py-5">
      <div className="container">
        <div className="row">
          <div className="col-12 text-center mb-5">
            <h2 className="display-5 fw-bold text-dark mb-4">
              Join Creators Getting Real Results
            </h2>
          </div>
        </div>
        
        {/* Statistics Bar */}
        <div className="row mb-5">
          <div className="col-12">
            <div className="bg-white rounded-4 shadow-sm p-4">
              <div className="row text-center">
                {statistics.map((stat, index) => (
                  <div key={index} className="col-6 col-lg-3 mb-3 mb-lg-0">
                    <div className="display-6 fw-bold text-primary">{stat.number}</div>
                    <div className="text-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Testimonials */}
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="row g-4">
              {testimonials.map((testimonial, index) => (
                <div key={testimonial.id} className="col-lg-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="display-6 me-3">{testimonial.avatar}</div>
                        <div>
                          <h5 className="card-title mb-1 fw-bold">{testimonial.name}</h5>
                          <small className="text-muted">{testimonial.role}</small>
                        </div>
                      </div>
                      
                      <blockquote className="mb-3">
                        <p className="text-muted small">"{testimonial.quote}"</p>
                        {testimonial.translation && (
                          <p className="text-muted small fst-italic">
                            Translation: "{testimonial.translation}"
                          </p>
                        )}
                      </blockquote>
                      
                      <div className="bg-success bg-opacity-10 rounded-3 p-2 mb-3">
                        <small className="text-success fw-semibold">
                          📈 {testimonial.metrics}
                        </small>
                      </div>
                      
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {testimonial.platforms.map((platform, idx) => (
                          <span key={idx} className="badge bg-primary">{platform}</span>
                        ))}
                      </div>
                      
                      <div className="row text-center">
                        <div className="col-6">
                          <div className="small text-muted">Before</div>
                          <div className="fw-bold">{testimonial.beforeViews}</div>
                        </div>
                        <div className="col-6">
                          <div className="small text-muted">After</div>
                          <div className="fw-bold text-success">{testimonial.afterViews}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Case Study Showcase */}
        <div className="row mt-5">
          <div className="col-12">
            <div className="bg-white rounded-4 shadow-sm p-4">
              <h3 className="h5 fw-bold text-center mb-4">Case Study Showcase</h3>
              <div className="row">
                {caseStudies.map((study, index) => (
                  <div key={index} className="col-md-4 text-center">
                    <div className="p-3 border rounded-3">
                      <h6 className="fw-bold">{study.title}</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="small text-muted">{study.before}</span>
                        <span className="mx-2">→</span>
                        <span className="small fw-bold">{study.after}</span>
                      </div>
                      <div className="badge bg-success mt-2">{study.growth}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}