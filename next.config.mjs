/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse tries to load test files; tell webpack to ignore them
      config.externals = [...(config.externals || []), { 'pdf-parse': 'commonjs pdf-parse' }]
    }
    return config
  },
}

export default nextConfig
