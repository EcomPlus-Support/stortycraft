export function ProblemSection() {
  const problems = [
    {
      title: "Guessing Game",
      icon: "❓",
      description: "Spending hours analyzing trends without knowing what actually works"
    },
    {
      title: "Algorithm Mystery", 
      icon: "🧩",
      description: "Creating content that gets lost in the platform algorithm maze"
    },
    {
      title: "Inconsistent Results",
      icon: "📉", 
      description: "One viral hit followed by videos that barely get any views"
    }
  ]

  return (
    <section className="container py-5 my-5">
      <div className="row">
        <div className="col-12 text-center mb-5">
          <h2 className="display-5 fw-bold text-dark mb-4">
            Why 67% of Creators Struggle to Go Viral
          </h2>
        </div>
      </div>
      
      <div className="row g-4">
        {problems.map((problem, index) => (
          <div key={index} className="col-md-4">
            <div className="card h-100 border-0 shadow-sm text-center p-4">
              <div className="card-body">
                <div className="display-1 mb-3">{problem.icon}</div>
                <h3 className="card-title h4 fw-bold text-primary mb-3">
                  {problem.title}
                </h3>
                <p className="card-text text-muted fs-5">
                  {problem.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="row mt-5">
        <div className="col-12 text-center">
          <div className="bg-light rounded-4 p-4">
            <div className="row">
              <div className="col-md-6">
                <div className="fs-4 fw-bold text-danger">8 hours</div>
                <div className="text-muted">Average time per video</div>
                <div className="fs-4 fw-bold text-danger mt-2">15%</div>
                <div className="text-muted">Success rate</div>
              </div>
              <div className="col-md-6">
                <div className="fs-4 fw-bold text-primary">73%</div>
                <div className="text-muted">Of viral content follows predictable patterns</div>
                <div className="text-muted mt-2">Most creators miss</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}