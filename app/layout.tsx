import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mapper - Article Place Extractor',
  description: 'Extract places from articles and see them on a map',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
