import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'School Tracker',
    short_name: 'School',
    description: "Track Emmett and Charlotte's school assignments",
    start_url: '/',
    display: 'standalone',
    background_color: '#fff7ed',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
