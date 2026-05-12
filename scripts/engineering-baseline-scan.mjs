#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.cwd();
const target = join(root, "src", "modules");

function walk(dir, out = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const p = join(dir, item);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return p.replace(`${root}/`, "");
}

const files = walk(target).filter((p) => [".ts", ".tsx"].includes(extname(p)));
const actionFiles = files.filter((p) => p.includes("/actions/") && p.endsWith(".ts"));
const readActionFiles = actionFiles.filter((p) => p.endsWith("read.actions.ts"));

let verifyPermissionCalls = 0;
let verifyPermissionsCalls = 0;
let rangeCalls = 0;
let limitCalls = 0;
let rpcCalls = 0;
const potentialFullFactReads = [];

for (const file of actionFiles) {
  const content = readFileSync(file, "utf8");
  verifyPermissionCalls += (content.match(/verifyPermission\(/g) || []).length;
  verifyPermissionsCalls += (content.match(/verifyPermissions\(/g) || []).length;
  rangeCalls += (content.match(/\.range\(/g) || []).length;
  limitCalls += (content.match(/\.limit\(/g) || []).length;
  rpcCalls += (content.match(/\.rpc\(/g) || []).length;
}

for (const file of readActionFiles) {
  const content = readFileSync(file, "utf8");
  const usesFact = /\.from\("fact_/g.test(content);
  if (!usesFact) continue;
  const hasPageGuard =
    /\.range\(/g.test(content) || /\.limit\(/g.test(content) || /\.rpc\(/g.test(content);
  const looksDetailOnly = /\.eq\("id"/g.test(content) || /\.maybeSingle\(/g.test(content) || /\.single\(/g.test(content);
  if (!hasPageGuard && !looksDetailOnly) {
    potentialFullFactReads.push(rel(file));
  }
}

console.log("=== Engineering Baseline Scan ===");
console.log(`Action files: ${actionFiles.length}`);
console.log(`Read action files: ${readActionFiles.length}`);
console.log(`verifyPermission() calls: ${verifyPermissionCalls}`);
console.log(`verifyPermissions() calls: ${verifyPermissionsCalls}`);
console.log(`.range() calls: ${rangeCalls}`);
console.log(`.limit() calls: ${limitCalls}`);
console.log(`.rpc() calls: ${rpcCalls}`);
console.log(`Potential full fact reads: ${potentialFullFactReads.length}`);
for (const p of potentialFullFactReads) {
  console.log(`- ${p}`);
}

