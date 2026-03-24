import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "School Tracker",
  description: "Track Emmett and Charlotte's school assignments",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <nav className="border-b bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl">🎒</span>
              <span className="text-base font-bold text-gray-800">School Tracker</span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/upload"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Upload PDF
              </a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
