#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = join(root, ".env.example");
const target = join(root, ".env.local");

if (existsSync(target)) {
  console.log("[env:bootstrap] .env.local da ton tai.");
  process.exit(0);
}

if (!existsSync(source)) {
  console.error("[env:bootstrap] Khong tim thay .env.example");
  process.exit(1);
}

copyFileSync(source, target);
console.log("[env:bootstrap] Da tao .env.local tu .env.example");
console.log("-> Dien gia tri that roi chay: npm run env:check");
