import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
        rel="stylesheet" 
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --bs-primary: #6366F1;
            --bs-secondary: #8B5CF6;
            --bs-success: #10B981;
            --bs-warning: #F59E0B;
            --bs-light: #F8FAFC;
            --bs-dark: #1F2937;
          }
          
          .bg-gradient-to-br {
            background: linear-gradient(135deg, var(--bs-primary), var(--bs-secondary));
          }
          
          .bg-gradient-to-r {
            background: linear-gradient(90deg, var(--bs-primary), var(--bs-secondary));
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          .feature-card {
            transition: all 0.3s ease;
          }
          
          .btn {
            transition: all 0.3s ease;
          }
          
          .btn:hover {
            transform: translateY(-2px);
          }
          
          .navbar {
            backdrop-filter: blur(10px);
            background-color: rgba(255, 255, 255, 0.95) !important;
          }
          
          .card {
            transition: all 0.3s ease;
          }
          
          .text-primary {
            color: var(--bs-primary) !important;
          }
          
          .bg-primary {
            background-color: var(--bs-primary) !important;
          }
          
          .btn-primary {
            background-color: var(--bs-primary);
            border-color: var(--bs-primary);
          }
          
          .btn-primary:hover {
            background-color: #5856EB;
            border-color: #5856EB;
          }
          
          html {
            scroll-behavior: smooth;
          }
          
          .landing-page {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          /* Mobile Responsiveness Enhancements */
          @media (max-width: 768px) {
            .display-3 {
              font-size: 2.5rem !important;
              line-height: 1.2;
            }
            
            .display-5 {
              font-size: 2rem !important;
            }
            
            .fs-4 {
              font-size: 1.1rem !important;
            }
            
            .fs-5 {
              font-size: 1rem !important;
            }
            
            .btn-lg {
              padding: 0.75rem 2rem !important;
              font-size: 1rem !important;
            }
            
            .card-body {
              padding: 1.5rem !important;
            }
            
            .py-5 {
              padding-top: 3rem !important;
              padding-bottom: 3rem !important;
            }
            
            .my-5 {
              margin-top: 2rem !important;
              margin-bottom: 2rem !important;
            }
            
            /* Hero section mobile adjustments */
            .min-vh-100 {
              min-height: auto !important;
              padding-top: 2rem !important;
              padding-bottom: 2rem !important;
            }
            
            /* Example cards mobile optimization */
            .example-card {
              margin-bottom: 2rem;
            }
            
            /* Video container mobile */
            .ratio-16x9 {
              margin-bottom: 2rem !important;
            }
            
            /* Floating elements adjustment */
            .position-absolute {
              position: relative !important;
              transform: none !important;
              margin: 0.5rem 0 !important;
            }
          }
          
          @media (max-width: 576px) {
            .container {
              padding-left: 1rem;
              padding-right: 1rem;
            }
            
            .display-3 {
              font-size: 2rem !important;
            }
            
            .btn {
              width: 100%;
              margin-bottom: 0.5rem;
            }
            
            .d-flex.flex-column.flex-sm-row {
              flex-direction: column !important;
            }
            
            .gap-3 {
              gap: 0.75rem !important;
            }
          }
          
          /* Enhanced hover effects */
          .example-card:hover {
            transform: translateY(-8px) !important;
            box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
          }
          
          /* Video placeholder styling */
          .ratio {
            position: relative;
            width: 100%;
          }
          
          .ratio::before {
            display: block;
            padding-top: var(--bs-aspect-ratio);
            content: "";
          }
          
          .ratio > * {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          
          .ratio-16x9 {
            --bs-aspect-ratio: 56.25%;
          }
          
          /* 9:16 aspect ratio for shorts format */
          .ratio-9x16 {
            --bs-aspect-ratio: 177.78%;
          }
        `
      }} />
      <div className="landing-page">
        {children}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </>
  )
}