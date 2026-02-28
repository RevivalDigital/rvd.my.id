// next.config.js (Aplikasi Dashboard)
module.exports = {
  async rewrites() {
    return [
      {
        source: '/shop/_next/:path*',
        destination: 'https://revival-erp.vercel.app/shop/_next/:path*',
      },
      {
        source: '/shop/:path*',
        destination: 'https://revival-erp.vercel.app/shop/:path*',
      },
    ]
  },
}
