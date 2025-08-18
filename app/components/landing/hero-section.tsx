'use client'

export function HeroSection() {
  const handleStartCreating = () => {
    console.log('Start Creating Free clicked')
  }

  const handleWatchDemo = () => {
    console.log('Watch Demo clicked')
  }

  return (
    <section className="container-fluid bg-gradient-to-br text-white py-5" style={{ marginTop: '76px', minHeight: '90vh' }}>
      <div className="container">
        <div className="row align-items-center min-vh-100 py-5">
          <div className="col-lg-6 order-2 order-lg-1">
            <h1 className="display-3 fw-bold mb-4">
              Create Viral Videos That Actually Go Viral
            </h1>
            <h2 className="fs-4 mb-4 text-light">
              AI-powered platform that analyzes millions of successful videos to help you create content with proven viral DNA. From YouTube analysis to trending videos in minutes.
            </h2>
            <p className="fs-5 mb-5 text-light">
              Join 10,000+ creators who've increased their average views by 340% using our viral pattern analysis technology.
            </p>
            <div className="d-flex flex-column flex-sm-row gap-3">
              <button 
                className="btn btn-warning btn-lg px-4 px-sm-5 py-3 fw-semibold"
                onClick={handleStartCreating}
              >
                Start Creating Free
              </button>
              <button 
                className="btn btn-outline-light btn-lg px-4 px-sm-5 py-3"
                onClick={handleWatchDemo}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="me-2">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Watch Demo
              </button>
            </div>
          </div>
          
          <div className="col-lg-6 order-1 order-lg-2 mb-4 mb-lg-0">
            <div className="position-relative">
              {/* YouTube Demo Video */}
              <div className="ratio ratio-16x9 rounded-4 overflow-hidden shadow-lg mb-4">
                <div className="d-flex align-items-center justify-content-center bg-dark text-white position-relative">
                  <div className="text-center">
                    <div className="mb-3">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-danger">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <h5 className="mb-2">ViralCraft Demo Video</h5>
                    <p className="small text-muted mb-3">See how creators transform ordinary content into viral hits</p>
                    <button className="btn btn-danger btn-sm px-4">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="me-2">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Watch Demo
                    </button>
                  </div>
                  
                  {/* Placeholder overlay */}
                  <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-br opacity-75"></div>
                </div>
              </div>
              
              {/* Before/After Stats */}
              <div className="row g-3">
                <div className="col-6">
                  <div className="bg-white rounded-3 p-3 text-center shadow-sm">
                    <div className="text-muted small mb-1">Average Before</div>
                    <div className="fw-bold text-dark h5 mb-0">1.2K views</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="bg-success rounded-3 p-3 text-center text-white shadow-sm">
                    <div className="text-white-50 small mb-1">Average After</div>
                    <div className="fw-bold h5 mb-0">850K views</div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="position-absolute top-0 start-0 translate-middle">
                <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '60px', height: '60px' }}>
                  <span className="fw-bold text-dark small">+340%</span>
                </div>
              </div>
              
              <div className="position-absolute" style={{ bottom: '80px', right: '-20px' }}>
                <div className="bg-primary rounded-pill px-3 py-2 text-white shadow">
                  <small className="fw-semibold">Viral Ready!</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}