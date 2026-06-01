import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/quan-tri-danh-muc", destination: "/quan-tri-he-thong", permanent: true },
      { source: "/quan-ly-nhan-su", destination: "/quan-tri-he-thong", permanent: true },
      { source: "/quan-tri-phan-quyen", destination: "/quan-tri-he-thong", permanent: true },

      // CSSD canonical map — bookmark cũ → route pilot
      { source: "/cssd-tiep-nhan", destination: "/cssd-quy-trinh", permanent: true },
      { source: "/cssd-dong-goi", destination: "/cssd-quy-trinh", permanent: true },
      { source: "/cssd-cap-phat", destination: "/cssd-quy-trinh", permanent: true },
      { source: "/cssd-quan-tri", destination: "/cssd-dung-cu", permanent: true },
      { source: "/cssd-erp", destination: "/cssd-quy-trinh", permanent: true },
      { source: "/cssd-erp/catalog", destination: "/cssd-dung-cu", permanent: true },
      { source: "/cssd-erp/inventory", destination: "/cssd-quy-trinh?tab=kho", permanent: true },
      { source: "/cssd-erp/kho-hoa-chat", destination: "/cssd-hoa-chat", permanent: true },
      { source: "/cssd-erp/equipment-maintenance", destination: "/cssd-thiet-bi", permanent: true },
      { source: "/cssd-erp/su-co", destination: "/cssd-su-co", permanent: true },
    ];
  },
};

export default nextConfig;
