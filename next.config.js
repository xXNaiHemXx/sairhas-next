/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ เพิ่ม origins ที่อนุญาตในโหมดพัฒนา
  allowedDevOrigins: ['localhost', '192.168.235.143', '*.local-origin.dev'],
  
  // ISR configuration
  experimental: {
    staleTimes: {
      dynamic: 60,
    },
  },
  
  // PWA ด้วย Service Worker
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // ❌ ลบ swcMinify ออก (Next.js 16 ไม่รองรับแล้ว)
  // swcMinify: true,  // <-- ลบบรรทัดนี้
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;