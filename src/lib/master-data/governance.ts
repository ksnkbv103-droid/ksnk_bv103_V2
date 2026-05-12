export type MdmFieldRegistryRow = {
  id: string;
  table_name: string;
  column_name: string;
  field_role: "FK_TO_DM" | "FK_TO_SPECIALIZED" | "TEXT_ENUM" | "DOMAIN_ATTRIBUTE" | "FACT_REFERENCE";
  source_table: string | null;
  source_column: string | null;
  source_loai_danh_muc: string | null;
  owner_module: string | null;
  suggestion_policy: "MANUAL_REVIEW" | "AUTO_SUGGEST" | "AUTO_ENFORCE";
  is_required: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MdmSuggestionRow = {
  id: string;
  table_name: string;
  column_name: string;
  suggestion_type: "REGISTER_FK" | "CONSIDER_ENUM_TO_DM" | "REVIEW_SOURCE_OF_TRUTH";
  confidence: number;
  reason: string;
  proposed_field_role: string | null;
  proposed_source_table: string | null;
  proposed_source_loai_danh_muc: string | null;
  status: "OPEN" | "APPROVED" | "REJECTED" | "DONE";
  created_at: string;
  updated_at: string;
};

export type MdmCoverageRow = {
  table_name: string;
  total_candidate_fields: number;
  registered_fields: number;
  missing_fields: number;
};
