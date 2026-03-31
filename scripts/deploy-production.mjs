#!/usr/bin/env node
/**
 * Commits pending changes, pushes to origin, deploys Vercel production.
 *
 * Usage:
 *   npm run deploy:prod
 *   npm run deploy:prod -- "fix: profile page"
 *
 * Requires: git remote, Vercel CLI auth (`npx vercel login` once), linked project.
 */

import { execSync } from "node:child_process";

function exec(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

function porcelain() {
  return execSync("git status --porcelain", {
    encoding: "utf8",
    shell: true,
  }).trim();
}

const message =
  process.argv.slice(2).join(" ").trim() || "chore: deploy production";

if (porcelain()) {
  exec("git add -A");
  exec(`git commit -m ${JSON.stringify(message)}`);
} else {
  console.log("No local changes to commit; continuing with push + deploy.");
}

try {
  exec("git push");
} catch {
  console.error("git push failed. Fix remote/branch/auth and retry.");
  process.exit(1);
}

console.log("Deploying to Vercel production…");
exec("npx vercel deploy --prod --yes");
