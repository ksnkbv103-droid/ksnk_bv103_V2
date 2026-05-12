import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/quan-tri-danh-muc', destination: '/quan-tri-he-thong', permanent: true },
      { source: '/quan-ly-nhan-su', destination: '/quan-tri-he-thong', permanent: true },
      { source: '/quan-tri-phan-quyen', destination: '/quan-tri-he-thong', permanent: true },
    ];
  },
};

export default nextConfig;
