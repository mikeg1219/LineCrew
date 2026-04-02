import type { NextConfig } from "next";

const defaultSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

const handoffSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
] as const;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/dashboard/customer/jobs/:path*",
        headers: [...handoffSecurityHeaders],
      },
      {
        source: "/dashboard/waiter/jobs/:path*",
        headers: [...handoffSecurityHeaders],
      },
      {
        source: "/:path*",
        headers: [...defaultSecurityHeaders],
      },
    ];
  },
};

export default nextConfig;
