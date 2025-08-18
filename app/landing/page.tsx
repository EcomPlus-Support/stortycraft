import { Metadata } from 'next'
import { HeroSection } from '../components/landing/hero-section'
import { ProblemSection } from '../components/landing/problem-section'
import { SolutionSection } from '../components/landing/solution-section'
import { GeneratedExamplesSection } from '../components/landing/generated-examples-section'
import { FeaturesSection } from '../components/landing/features-section'
import { SocialProofSection } from '../components/landing/social-proof-section'
import { PricingSection } from '../components/landing/pricing-section'
import { FAQSection } from '../components/landing/faq-section'
import { FinalCTASection } from '../components/landing/final-cta-section'
import { Footer } from '../components/landing/footer'
import { Navigation } from '../components/landing/navigation'

export const metadata: Metadata = {
  title: 'ViralCraft - From Inspiration to Viral in Minutes',
  description: 'AI-powered video creation platform that transforms any reference content into viral-ready videos optimized for social media platforms. Join 10,000+ creators who\'ve increased their average views by 340%.',
  openGraph: {
    title: 'ViralCraft - Create Viral Videos That Actually Go Viral',
    description: 'AI-powered platform that analyzes millions of successful videos to help you create content with proven viral DNA. From YouTube analysis to trending videos in minutes.',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViralCraft - From Inspiration to Viral in Minutes',
    description: 'AI-powered video creation platform that transforms any reference content into viral-ready videos optimized for social media platforms.',
  },
}

export default function LandingPage() {
  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <GeneratedExamplesSection />
        <FeaturesSection />
        <SocialProofSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  )
}