'use client'

import { useState } from 'react'

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const faqs = [
    {
      id: 1,
      question: "How does the viral pattern analysis work?",
      answer: "Our AI analyzes millions of viral videos across platforms to identify patterns in thumbnails, titles, content structure, timing, and engagement tactics. It then provides specific recommendations for your content."
    },
    {
      id: 2, 
      question: "What's included in the free trial?",
      answer: "Full access to all features for 7 days with 25 free credits. No credit card required. You can create up to 5 viral videos to test our platform."
    },
    {
      id: 3,
      question: "Can I use this for multiple social media platforms?",
      answer: "Yes! ViralCraft optimizes your content for YouTube Shorts, TikTok, Instagram Reels, Facebook, and other platforms simultaneously."
    },
    {
      id: 4,
      question: "Do you support languages other than English?", 
      answer: "We fully support Traditional Chinese with cultural adaptation for Chinese-speaking markets. Additional languages are coming soon."
    },
    {
      id: 5,
      question: "What happens if I exceed my credit limit?",
      answer: "You can purchase additional credit packs or upgrade your plan. The system will notify you when you're approaching your limit."
    },
    {
      id: 6,
      question: "How accurate is the viral prediction?",
      answer: "Our AI has an 89% accuracy rate in predicting viral potential based on our analysis of over 10 million viral videos."
    },
    {
      id: 7,
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
    },
    {
      id: 8,
      question: "Is there an API for developers?",
      answer: "API access is available with Enterprise plans. Contact our sales team for custom integration options."
    }
  ]

  const toggleItem = (itemId: number) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  return (
    <section id="faq" className="container py-5 my-5">
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold text-dark mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="accordion">
            {faqs.map((faq) => (
              <div key={faq.id} className="accordion-item border-0 shadow-sm mb-3 rounded-3">
                <h3 className="accordion-header">
                  <button 
                    className={`accordion-button ${openItems.includes(faq.id) ? '' : 'collapsed'} fw-semibold rounded-3`}
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    style={{ 
                      backgroundColor: openItems.includes(faq.id) ? '#f8f9fa' : 'white',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    {faq.question}
                  </button>
                </h3>
                <div className={`accordion-collapse collapse ${openItems.includes(faq.id) ? 'show' : ''}`}>
                  <div className="accordion-body text-muted">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-5">
            <p className="text-muted">
              Still have questions? 
              <a href="#" className="text-primary text-decoration-none ms-2">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}