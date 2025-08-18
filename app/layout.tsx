import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'ViralCraft',
  description: 'AI-powered viral video creation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.className}>
      <body>{children}</body>
    </html>
  )
}

