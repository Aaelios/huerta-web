// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: "/webinars/:path*",
        destination: "/webinars/oct-2025-01",
        permanent: false, // 307 o 302, temporal
      },
    ];
  },
};
