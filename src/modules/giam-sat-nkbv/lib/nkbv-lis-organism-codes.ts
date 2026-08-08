/**
 * Mã vi khuẩn ngắn (cột rộng LIS BV103) → tên chuẩn để lưu tac_nhan.
 * Chỉ map các mã thường gặp trên export LIS; mã lạ giữ nguyên code.
 */
export const NKBV_LIS_ORGANISM_CODE_NAMES: Record<string, string> = {
  esccol: "Escherichia coli",
  acibcx: "Acinetobacter baumannii complex",
  acibau: "Acinetobacter baumannii",
  acilwo: "Acinetobacter lwoffii",
  pseaer: "Pseudomonas aeruginosa",
  pseflu: "Pseudomonas fluorescens",
  pseput: "Pseudomonas putida",
  psestu: "Pseudomonas stutzeri",
  psecep: "Burkholderia cepacia",
  klepne: "Klebsiella pneumoniae",
  klpnsp: "Klebsiella pneumoniae ssp",
  kleoxy: "Klebsiella oxytoca",
  kleaer: "Klebsiella aerogenes",
  staaur: "Staphylococcus aureus",
  staepi: "Staphylococcus epidermidis",
  stahae: "Staphylococcus haemolyticus",
  stahsh: "Staphylococcus haemolyticus",
  sau: "Staphylococcus aureus",
  strpyo: "Streptococcus pyogenes",
  strpne: "Streptococcus pneumoniae",
  straga: "Streptococcus agalactiae",
  strfac: "Enterococcus faecalis",
  strfae: "Enterococcus faecium",
  entfecal: "Enterococcus faecalis",
  strmut: "Streptococcus mutans",
  strsui: "Streptococcus suis",
  streqs: "Streptococcus equisimilis",
  strcsc: "Streptococcus constellatus",
  entcla: "Enterobacter cloacae",
  entaer: "Enterobacter aerogenes",
  entcas: "Enterobacter cancerogenus",
  entcpx: "Enterobacter cloacae complex",
  prohau: "Proteus hauseri",
  promir: "Proteus mirabilis",
  propen: "Proteus penneri",
  sermar: "Serratia marcescens",
  moracat: "Moraxella catarrhalis",
  mormom: "Morganella morganii",
  morgrp: "Moraxella group",
  neigon: "Neisseria gonorrhoeae",
  aerdro: "Aeromonas dhakensis",
  aersob: "Aeromonas sobria",
  aeruri: "Aeromonas veronii",
  shison: "Shigella sonnei",
  salgrp: "Salmonella group",
  pasteu: "Pasteurella",
  kockri: "Kocuria kristinae",
  flamen: "Flavobacterium meningosepticum",
  chrvio: "Chromobacterium violaceum",
  achxyl: "Achromobacter xylosoxidans",
  psemal: "Pseudomonas maltophilia",
  nam1: "Nấm men",
  tkga: "Trực khuẩn Gram (-)",
  tkgd: "Trực khuẩn Gram (+)",
  ckgd: "Cầu khuẩn Gram (+)",
  ctkga: "Trực khuẩn Gram (-)",
  ns: "Không xác định",
  bca: "Bacillus",
  "103": "Mã nội bộ 103",
};

/** Cột mã VK trên export LIS (chữ thường). */
export const NKBV_LIS_WIDE_ORGANISM_HEADERS = new Set(
  Object.keys(NKBV_LIS_ORGANISM_CODE_NAMES),
);

export function resolveLisOrganismCode(code: string): string {
  const key = code.trim().toLowerCase();
  return NKBV_LIS_ORGANISM_CODE_NAMES[key] || code.trim();
}
