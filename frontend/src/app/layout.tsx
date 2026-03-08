import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Project Haven',
  description: 'Real-time Conversation Analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#5A9C8D] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
