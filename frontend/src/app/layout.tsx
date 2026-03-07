import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sentinel Command',
  description: 'Real-time Conversation Analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#020617] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  )
}
