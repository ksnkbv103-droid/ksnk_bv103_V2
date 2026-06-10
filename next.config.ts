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

      // Giám sát KSNK - Redirect function-based
      { source: "/giam-sat-vst/lich-su", destination: "/lich-su/vst", permanent: true },
      { source: "/giam-sat-vst/thong-ke", destination: "/thong-ke/vst", permanent: true },
      { source: "/giam-sat-chung/lich-su", destination: "/lich-su/gsc", permanent: true },
      { source: "/giam-sat-chung/thong-ke", destination: "/thong-ke/gsc", permanent: true },
      { source: "/giam-sat-chung/tuan-thu/lich-su", destination: "/lich-su/gsc", permanent: true },
      { source: "/giam-sat-chung/nhat-ky/lich-su", destination: "/lich-su/gsc", permanent: true },
      { source: "/giam-sat-chung/he-thong/lich-su", destination: "/lich-su/gsc", permanent: true },
    ];
  },
};

export default nextConfig;
