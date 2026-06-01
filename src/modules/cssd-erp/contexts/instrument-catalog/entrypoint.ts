/**
 * Bounded context entrypoint: Instrument catalog / physical label registration.
 */
export { registerPhysicalBoLabelFromDmAction } from "../../actions/cssd-register-label.actions";
export { useCssdCatalogPage } from "../../hooks/use-cssd-catalog-page";
export { CSSDCatalogBoTab } from "../../views/CSSDCatalogBoTab";
export { CSSDCatalogLoaiTab } from "../../views/CSSDCatalogLoaiTab";
export { CSSDCatalogChiTietTab } from "../../views/CSSDCatalogChiTietTab";
export { CSSDCatalogQuickActions } from "../../views/CSSDCatalogQuickActions";
