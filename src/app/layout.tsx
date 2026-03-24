import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { NavClient } from '@/components/NavClient'
import { BackgroundDecor } from '@/components/BackgroundDecor'
import './globals.css'

export const metadata: Metadata = {
  title: 'School Tracker ✏️',
  description: "Track Emmett and Charlotte's school assignments",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'School Tracker',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen antialiased"
        style={{
          background: `
            radial-gradient(ellipse at 12% 50%, rgba(239, 68, 68, 0.09) 0%, transparent 55%),
            radial-gradient(ellipse at 88% 50%, rgba(168, 85, 247, 0.09) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 0%,  rgba(250, 204, 21, 0.12) 0%, transparent 40%),
            linear-gradient(160deg, #fff7ed 0%, #fef9c3 22%, #f0fdf4 50%, #fdf4ff 75%, #fce7f3 100%)
          `,
        }}
      >
        {/* Floating themed decorations — behind all content */}
        <BackgroundDecor />

        {/* Content layer sits above the decorations */}
        <div className="relative" style={{ zIndex: 1 }}>
          {/* Rainbow stripe */}
          <div
            className="h-3 w-full"
            style={{
              background:
                'repeating-linear-gradient(90deg, #f97316 0px, #f97316 40px, #facc15 40px, #facc15 80px, #4ade80 80px, #4ade80 120px, #60a5fa 120px, #60a5fa 160px, #c084fc 160px, #c084fc 200px)',
            }}
          />

          {/* Nav */}
          <nav className="bg-white/75 backdrop-blur-md shadow-sm border-b-4 border-yellow-300 px-4 py-3">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <a href="/" className="flex items-center gap-2 group">
                <span className="text-3xl group-hover:rotate-12 transition-transform inline-block">🎒</span>
                <span className="text-xl font-black text-indigo-700 tracking-tight">School Tracker</span>
              </a>
              <NavClient />
            </div>
          </nav>

          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

          <footer className="text-center py-6 text-xs text-gray-400 font-medium">
            ⭐ It&apos;s-a me, Emmett! · ✨ Shake it off, Charlotte! ✨
          </footer>
        </div>

        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
