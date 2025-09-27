import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Excepción: no redirigir la página real
      {
        source: "/webinars/oct-2025-01",
        destination: "/webinars/oct-2025-01",
        permanent: false,
      },
      // Redirigir la raíz de webinars
      {
        source: "/webinars",
        destination: "/webinars/oct-2025-01",
        permanent: false,
      },
      // Redirigir cualquier otra subruta
      {
        source: "/webinars/:path*",
        destination: "/webinars/oct-2025-01",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
