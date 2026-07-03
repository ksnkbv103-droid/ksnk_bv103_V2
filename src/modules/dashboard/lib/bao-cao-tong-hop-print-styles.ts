export const PRINT_STYLES = `
    :root { --primary: #065f46; --primary-light: #ecfdf5; }
    @page { size: A4 portrait; margin: 18mm 15mm 22mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      padding: 0 0 14mm;
    }
    .page-break { page-break-before: always; break-before: page; }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5pt solid var(--primary);
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header-left { text-align: center; width: 45%; }
    .header-right { text-align: center; width: 45%; }
    .report-title { text-align: center; margin: 24px 0 18px; }
    .report-title h1 {
      font-size: 18px;
      margin: 0;
      color: var(--primary);
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 0.02em;
    }
    .report-title p { margin: 6px 0 0; font-style: italic; font-size: 13px; }
    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      border: 1pt solid #cbd5e1;
      background: var(--primary-light);
      padding: 14px 16px;
      margin-bottom: 22px;
      font-size: 12px;
    }
    .cover-meta-row { display: contents; }
    .cover-meta-wide { grid-column: 1 / -1; }
    .cover-meta dt { font-weight: bold; color: #0f172a; margin: 0; }
    .cover-meta dd { margin: 0; text-align: justify; }
    h2 {
      font-size: 14px;
      color: var(--primary);
      border-left: 4pt solid var(--primary);
      padding-left: 10px;
      margin: 22px 0 12px;
      text-transform: uppercase;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    h3 {
      font-size: 13px;
      color: #334155;
      margin: 14px 0 8px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    h4.bk-title { font-size: 12px; color: #0f172a; margin: 12px 0 6px; font-weight: bold; }
    .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .summary-box p { margin: 5px 0; font-size: 13px; }
    .muted { font-size: 12px; color: #64748b; font-style: italic; }
    .table-wrap { overflow: visible; width: 100%; margin: 8px 0 16px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 11px;
      table-layout: fixed;
    }
    table.wide-table { table-layout: auto; font-size: 11px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th, td {
      border: 1px solid #94a3b8;
      padding: 5px 7px;
      text-align: center;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      vertical-align: top;
    }
    th { background: #f1f5f9; font-weight: bold; color: #0f172a; font-size: 11px; }
    td.text-left, th.text-left { text-align: left; }
    td.matrix-cell { font-size: 11px; line-height: 1.35; }
    .text-danger { color: #dc2626; font-weight: bold; }
    .text-warning { color: #ca8a04; font-weight: bold; }
    .text-success { color: #166534; font-weight: bold; }
    .bg-highlight { background-color: #fef2f2; }
    .section-iii { margin-top: 8px; }
    .section-iii-lead { margin-bottom: 14px; }
    .narrative-block { margin-top: 12px; page-break-inside: avoid; break-inside: avoid; }
    .narrative-label { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #0f172a; }
    .section-box {
      border: 1pt solid #94a3b8;
      padding: 14px 16px;
      background: #fff;
      min-height: 110px;
      text-align: justify;
      line-height: 1.65;
      font-size: 13px;
    }
    .section-box.empty { color: #94a3b8; }
    .empty-placeholder { color: #94a3b8; font-style: italic; }
    .issue-date { margin-top: 28px; font-style: italic; text-align: right; font-size: 13px; }
    .signature-block { page-break-inside: avoid; break-inside: avoid; margin-top: 8px; }
    .signature { margin-top: 18px; display: flex; justify-content: space-between; gap: 24px; }
    .signature-box { text-align: center; width: 42%; }
    .signature-role { font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .signature-line { margin-top: 72px; font-size: 12px; }
    .print-page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 18mm 4px;
      font-size: 10px;
      color: #64748b;
      border-top: 0.5pt solid #cbd5e1;
      background: #fff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-page-footer { position: fixed; }
    }
`;
