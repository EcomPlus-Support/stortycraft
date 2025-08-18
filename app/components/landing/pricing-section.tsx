'use client'

export function PricingSection() {
  const handleStartTrial = (plan: string) => {
    console.log(`Start Free Trial clicked for ${plan} plan`)
  }

  const handleContactSales = () => {
    console.log('Contact Sales clicked')
  }

  const plans = [
    {
      name: "Basic",
      price: "$29.99",
      badge: "Most Popular",
      badgeColor: "success",
      credits: "100 credits/month",
      usage: "~20 viral videos OR 100 image generations",
      features: [
        "Viral pattern analysis",
        "Multi-platform optimization", 
        "Basic AI video generation",
        "1GB cloud storage",
        "Email support",
        "Mobile app access"
      ],
      limitations: [
        "Max 10 API calls per hour",
        "30-day file retention", 
        "Standard processing priority"
      ],
      cta: "Start Free Trial",
      ctaStyle: "btn-success"
    },
    {
      name: "Professional", 
      price: "$79.99",
      badge: "Best Value",
      badgeColor: "primary",
      credits: "300 credits/month",
      usage: "~60 viral videos OR 300 image generations",
      features: [
        "Everything in Basic",
        "Advanced viral intelligence",
        "Trend prediction analytics", 
        "A/B testing tools",
        "5GB cloud storage",
        "Priority support",
        "Team collaboration (3 members)",
        "Custom brand integration"
      ],
      limitations: [
        "Max 20 API calls per hour",
        "60-day file retention",
        "Priority processing"
      ],
      cta: "Start Free Trial",
      ctaStyle: "btn-primary"
    },
    {
      name: "Enterprise",
      price: "$199.99", 
      badge: "Maximum Power",
      badgeColor: "warning",
      credits: "800 credits/month",
      usage: "~160 viral videos OR 800 image generations",
      features: [
        "Everything in Professional",
        "White-label options",
        "API access",
        "Custom AI training",
        "20GB cloud storage", 
        "24/7 phone support",
        "Unlimited team members",
        "Advanced analytics dashboard",
        "Dedicated account manager"
      ],
      limitations: [
        "Max 50 API calls per hour",
        "90-day file retention",
        "Highest processing priority"
      ],
      cta: "Contact Sales",
      ctaStyle: "btn-warning"
    }
  ]

  const creditAddons = [
    { credits: "50 credits", price: "$19.99" },
    { credits: "100 credits", price: "$34.99" },
    { credits: "500 credits", price: "$149.99" }
  ]

  return (
    <section id="pricing" className="container py-5 my-5">
      <div className="row">
        <div className="col-12 text-center mb-5">
          <h2 className="display-5 fw-bold text-dark mb-3">
            Choose Your Viral Growth Plan
          </h2>
          <p className="fs-5 text-muted">
            All plans include 7-day free trial. No credit card required.
          </p>
        </div>
      </div>
      
      <div className="row g-4 mb-5">
        {plans.map((plan, index) => (
          <div key={index} className="col-lg-4">
            <div className={`card h-100 border-0 shadow-lg ${plan.name === 'Professional' ? 'border-primary' : ''}`}
                 style={{ position: 'relative' }}>
              
              {/* Badge */}
              <div className={`badge bg-${plan.badgeColor} position-absolute top-0 start-50 translate-middle px-3 py-2`}>
                {plan.badge}
              </div>
              
              <div className="card-header bg-white border-0 text-center pt-4 pb-3">
                <h3 className="card-title h4 fw-bold">{plan.name}</h3>
                <div className="display-4 fw-bold text-primary">{plan.price}</div>
                <div className="text-muted">/month</div>
              </div>
              
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="fw-semibold text-primary">{plan.credits}</div>
                  <small className="text-muted">{plan.usage}</small>
                </div>
                
                <h5 className="h6 fw-bold mb-3">Features Included:</h5>
                <ul className="list-unstyled mb-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="mb-2">
                      <span className="text-success me-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <h5 className="h6 fw-bold mb-3">Limitations:</h5>
                <ul className="list-unstyled mb-4">
                  {plan.limitations.map((limitation, idx) => (
                    <li key={idx} className="mb-2 small text-muted">
                      <span className="me-2">•</span>
                      {limitation}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="card-footer bg-white border-0 p-4">
                <button 
                  className={`btn ${plan.ctaStyle} w-100 py-3 fw-semibold`}
                  onClick={plan.cta === 'Contact Sales' ? handleContactSales : () => handleStartTrial(plan.name)}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Credit Add-ons */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="bg-light rounded-4 p-4">
            <h4 className="h5 fw-bold text-center mb-4">Need more credits?</h4>
            <div className="row text-center">
              {creditAddons.map((addon, index) => (
                <div key={index} className="col-md-4 mb-3">
                  <div className="bg-white rounded-3 p-3 border">
                    <div className="fw-semibold">{addon.credits}</div>
                    <div className="text-primary fw-bold">{addon.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Trust Signals */}
      <div className="row">
        <div className="col-12">
          <div className="text-center">
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className="bg-success bg-opacity-10 rounded-3 p-3">
                  <div className="text-success fw-semibold">
                    💰 30-day money-back guarantee
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="bg-primary bg-opacity-10 rounded-3 p-3">
                  <div className="text-primary fw-semibold">
                    🚫 Cancel anytime
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="bg-warning bg-opacity-10 rounded-3 p-3">
                  <div className="text-warning fw-semibold">
                    📊 ROI guarantee - see results or get refunded
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