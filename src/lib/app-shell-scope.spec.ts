import { describe, expect, it } from "vitest";
import { getKsnkAppHeaderBreadcrumb } from "./app-shell-scope";

describe("getKsnkAppHeaderBreadcrumb — CSSD per-route (P0-1)", () => {
  it("maps each major CSSD path to a distinct clinical page label", () => {
    expect(getKsnkAppHeaderBreadcrumb("/cssd-quy-trinh")).toEqual({ zone: "CSSD", page: "Quy trình" });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-dung-cu")).toEqual({ zone: "CSSD", page: "Dụng cụ" });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-dung-cu/")).toEqual({ zone: "CSSD", page: "Dụng cụ" });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-su-co")).toEqual({ zone: "CSSD", page: "Sự cố" });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-thiet-bi")).toEqual({ zone: "CSSD", page: "Thiết bị" });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-hoa-chat")).toEqual({ zone: "CSSD", page: "Hóa chất" });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-erp/batch")).toEqual({
      zone: "CSSD",
      page: "Mẻ tiệt khuẩn",
    });
    expect(getKsnkAppHeaderBreadcrumb("/cssd-erp/report")).toEqual({ zone: "CSSD", page: "Báo cáo" });
  });

  it("does not coarsen all CSSD routes to Quản lý CSSD", () => {
    const pages = [
      "/cssd-quy-trinh",
      "/cssd-dung-cu",
      "/cssd-su-co",
      "/cssd-thiet-bi",
      "/cssd-hoa-chat",
      "/cssd-erp/batch",
      "/cssd-erp/report",
    ].map((p) => getKsnkAppHeaderBreadcrumb(p).page);
    expect(pages).not.toContain("Quản lý CSSD");
    expect(new Set(pages).size).toBeGreaterThanOrEqual(5);
  });

  it("keeps non-CSSD fine-grained labels", () => {
    expect(getKsnkAppHeaderBreadcrumb("/giam-sat-chung")).toEqual({
      zone: "Giám sát",
      page: "Form giám sát chung",
    });
    expect(getKsnkAppHeaderBreadcrumb("/giam-sat-chung/tuan-thu")).toEqual({
      zone: "Giám sát",
      page: "Giám sát tuân thủ",
    });
    expect(getKsnkAppHeaderBreadcrumb("/thong-ke/vst")).toEqual({
      zone: "Tra cứu",
      page: "Thống kê khoa",
    });
    expect(getKsnkAppHeaderBreadcrumb("/thong-ke/cssd")).toEqual({ zone: "CSSD", page: "Báo cáo" });
    expect(getKsnkAppHeaderBreadcrumb("/giam-sat-vst")).toEqual({ zone: "Giám sát", page: "Vệ sinh tay" });
    expect(getKsnkAppHeaderBreadcrumb("/quan-ly-cong-viec")).toEqual({ zone: "Vận hành", page: "Công việc" });
    expect(getKsnkAppHeaderBreadcrumb("/bao-cao-tong-hop")).toEqual({
      zone: "Điều hành",
      page: "Báo cáo chính thức",
    });
  });

  it("H2 one door — `/` breadcrumb matches Báo cáo chính thức (not Tổng quan)", () => {
    expect(getKsnkAppHeaderBreadcrumb("/")).toEqual({
      zone: "Điều hành",
      page: "Báo cáo chính thức",
    });
    expect(getKsnkAppHeaderBreadcrumb("")).toEqual({
      zone: "Điều hành",
      page: "Báo cáo chính thức",
    });
  });
});
