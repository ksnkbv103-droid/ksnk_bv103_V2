#!/usr/bin/env node
/**
 * Ghi skills-lock.json từ mọi SKILL.md trong .agents/skills/
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", ".agents", "skills");
const outPath = path.join(__dirname, "..", "skills-lock.json");

const bv103Local = new Set([
  "smart-db-bv103",
  "giam-sat-pilot",
  "qlcv-pilot",
]);
const supabaseAgent = new Set(["supabase"]);
const softaworksAgentToolkit = new Set(["react-dev"]);
const awesomeCursorSkills = new Set(["reviewing-code"]);

function sourceFor(dir) {
  if (bv103Local.has(dir)) return "local/bv103";
  if (supabaseAgent.has(dir)) return "supabase/agent-skills";
  if (awesomeCursorSkills.has(dir)) return "spencerpauly/awesome-cursor-skills";
  if (softaworksAgentToolkit.has(dir)) return "softaworks/agent-toolkit";
  throw new Error(
    `[skills-lock] Thư mục skill chưa map nguồn: "${dir}". Cập nhật scripts/skills-lock.mjs.`,
  );
}

if (!fs.existsSync(root)) {
  console.error("[skills-lock] Không thấy:", root);
  process.exit(1);
}

const dirs = fs
  .readdirSync(root)
  .filter((d) => {
    const skillMd = path.join(root, d, "SKILL.md");
    return fs.statSync(path.join(root, d)).isDirectory() && fs.existsSync(skillMd);
  })
  .sort();

const skills = {};
for (const dir of dirs) {
  const skillPath = `.agents/skills/${dir}/SKILL.md`;
  const buf = fs.readFileSync(path.join(root, dir, "SKILL.md"));
  const computedHash = crypto.createHash("sha256").update(buf).digest("hex");
  skills[dir] = {
    source: sourceFor(dir),
    sourceType: "github",
    skillPath,
    computedHash,
  };
}

const payload = { version: 1, skills };
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(
  `[skills-lock] Đã ghi ${outPath} (${Object.keys(skills).length} skill).`,
);
