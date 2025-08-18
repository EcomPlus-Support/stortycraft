'use client'

export function FinalCTASection() {
  const handleStartCreating = () => {
    console.log('Start Creating Viral Content clicked')
  }

  const handleScheduleDemo = () => {
    console.log('Schedule Demo clicked')
  }

  return (
    <section className="container-fluid bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-5">
      <div className="container">
        <div className="row align-items-center py-5">
          <div className="col-lg-8 mx-auto text-center">
            <h2 className="display-4 fw-bold mb-4">
              Ready to Create Your First Viral Video?
            </h2>
            <p className="fs-4 mb-5 text-light">
              Join 10,000+ creators who've transformed their content strategy with AI-powered viral intelligence.
            </p>
            
            {/* Benefit Reinforcement */}
            <div className="row mb-5">
              <div className="col-md-4 mb-3">
                <div className="bg-white bg-opacity-20 rounded-3 p-3">
                  <div className="fw-semibold">⚡ Start free trial in 30 seconds</div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="bg-white bg-opacity-20 rounded-3 p-3">
                  <div className="fw-semibold">💳 No credit card required</div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="bg-white bg-opacity-20 rounded-3 p-3">
                  <div className="fw-semibold">🎯 First viral video in under 5 minutes</div>
                </div>
              </div>
            </div>
            
            {/* CTAs */}
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mb-5">
              <button 
                className="btn btn-warning btn-lg px-5 py-3 fw-semibold"
                onClick={handleStartCreating}
                style={{ 
                  fontSize: '1.2rem',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)'
                }}
              >
                Start Creating Viral Content
              </button>
              <button 
                className="btn btn-outline-light btn-lg px-5 py-3"
                onClick={handleScheduleDemo}
                style={{ fontSize: '1.1rem' }}
              >
                Schedule Demo
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="row">
              <div className="col-12">
                <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-4">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success">🔒 SSL Secured</span>
                    <span className="badge bg-info">🛡️ Privacy Protected</span>
                  </div>
                  <div className="text-light small">
                    Featured in 
                    <span className="fw-semibold ms-1">TechCrunch, Forbes, Creator Economy Report</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden" style={{ zIndex: -1 }}>
          <div className="position-absolute" style={{ 
            top: '10%', 
            left: '10%', 
            width: '20px', 
            height: '20px', 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite'
          }}></div>
          <div className="position-absolute" style={{ 
            top: '70%', 
            right: '15%', 
            width: '15px', 
            height: '15px', 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite'
          }}></div>
          <div className="position-absolute" style={{ 
            bottom: '20%', 
            left: '20%', 
            width: '25px', 
            height: '25px', 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: '50%',
            animation: 'float 7s ease-in-out infinite'
          }}></div>
        </div>
      </div>
    </section>
  )
}