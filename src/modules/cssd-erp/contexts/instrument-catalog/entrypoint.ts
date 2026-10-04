/**
 * Bounded context entrypoint: Instrument catalog / physical label registration.
 * Route /cssd-dung-cu lấy hook qua entrypoint; tab views lazy-import riêng.
 */
export { registerPhysicalBoLabelFromDmAction } from "../../actions/cssd-register-label.actions";
export { useCssdCatalogPage } from "../../hooks/use-cssd-catalog-page";
