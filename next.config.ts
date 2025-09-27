import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/webinars",
        destination: "/webinars/oct-2025-01",
        permanent: false,
      },
      {
        source: "/webinars/:slug((?!oct-2025-01$).*)",
        destination: "/webinars/oct-2025-01",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
