import { DM_Sans } from 'next/font/google'
import Image from 'next/image'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  display: 'swap',
})

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.className}>
      <head>
        <link 
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" 
          rel="stylesheet" 
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" 
          crossOrigin="anonymous" 
        />
        <style>{`
          :root {
            --bs-primary: #0070D6;
            --bs-primary-rgb: 0, 112, 214;
          }
          .profile-upload {
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px dashed #dee2e6;
          }
          .profile-upload:hover {
            border-color: var(--bs-primary);
            background-color: #f8f9fa;
          }
          .btn-primary {
            background-color: var(--bs-primary);
            border-color: var(--bs-primary);
          }
          .btn-primary:hover {
            background-color: #5a5fd8;
            border-color: #5a5fd8;
          }
          .text-primary {
            color: var(--bs-primary) !important;
          }
        `}</style>
      </head>
      <body className="bg-light">
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-5">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12 col-sm-8 col-md-6 col-lg-5 col-xl-4">
                <div className="card shadow-lg border-0">
                  {/* Header with Logo */}
                  <div className="card-header bg-white border-0 text-center py-4">
                    <div className="d-flex justify-content-center align-items-center mb-3">
                      <Image 
                        src="/logo.png" 
                        alt="ViralCraft" 
                        width={40} 
                        height={40} 
                        className="me-2" 
                      />
                      <h2 className="text-primary fw-bold mb-0">ViralCraft</h2>
                    </div>
                  </div>
                  
                  {/* Main Content */}
                  <div className="card-body p-4">
                    {children}
                  </div>
                  
                  {/* Footer */}
                  <div className="card-footer bg-light border-0 text-center py-3">
                    <small className="text-muted">
                      By continuing, you agree to our{' '}
                      <a href="/terms" className="text-decoration-none">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" className="text-decoration-none">Privacy Policy</a>
                    </small>
                  </div>
                </div>
                
                {/* Back to Landing Link */}
                <div className="text-center mt-4">
                  <a href="/landing" className="text-decoration-none text-muted">
                    ← Back to Homepage
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" 
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" 
          crossOrigin="anonymous"
        ></script>
      </body>
    </html>
  )
}