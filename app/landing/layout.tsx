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
        crossOrigin="anonymous"
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
          
          .btn {
            transition: all 0.3s ease;
          }
          
          .btn:hover {
            transform: translateY(-2px);
          }
          
          .navbar {
            backdrop-filter: blur(10px);
            background-color: rgba(255, 255, 255, 0.95);
          }
          
          .card {
            transition: all 0.3s ease;
          }
          
          .text-primary {
            color: var(--bs-primary);
          }
          
          .bg-primary {
            background-color: var(--bs-primary);
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
          
          /* Ensure navbar collapse behaves correctly */
          @media (min-width: 992px) {
            .navbar-collapse {
              display: flex !important;
              flex-basis: auto;
            }
            
            .navbar-collapse.collapse {
              display: flex !important;
            }
          }
          
          @media (max-width: 991.98px) {
            .navbar-collapse:not(.show) {
              display: none !important;
            }
            
            .navbar-collapse.show {
              display: block !important;
            }
          }
          
          /* Ensure navigation buttons are visible */
          .navbar-nav .nav-link {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .navbar .btn {
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .modal-content {
            border: none;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          
          .form-control:focus {
            border-color: var(--bs-primary);
            box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25);
          }
          
          .dropdown-menu {
            border: none;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border-radius: 0.75rem;
          }
          
          .dropdown-item {
            transition: all 0.2s ease;
          }
          
          .dropdown-item:hover {
            background-color: var(--bs-primary);
            color: white;
          }
          
          section[id] {
            scroll-margin-top: 80px;
          }
          
          .landing-page {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          @media (max-width: 768px) {
            .display-3 {
              font-size: 2.5rem;
            }
            
            .btn-lg {
              padding: 0.75rem 2rem;
            }
          }
          
          @media (max-width: 576px) {
            .display-3 {
              font-size: 2rem;
            }
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