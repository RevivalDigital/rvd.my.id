// next.config.js (Aplikasi Dashboard)
module.exports = {
  async rewrites() {
    return [
      {
        source: '/_next/:path*',
        destination: 'https://revival-erp.vercel.app/_next/:path*',
      },
      {
        source: '/shop/:path*',
        destination: 'https://revival-erp.vercel.app/:path*',
      },
    ]
  },
}
