#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const rootArg = process.argv[2];

if (!rootArg) {
  console.error("Usage: node unpin-semver-ranges.mjs <repo-root>");
  process.exit(1);
}

const rootDir = path.resolve(rootArg);
const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const skipDirs = new Set([
  ".git",
  ".hg",
  ".next",
  ".nuxt",
  ".pnpm-store",
  ".turbo",
  ".yarn",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "out",
]);
const exactSemverPattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const preservePrefixes = [
  "^",
  "~",
  ">",
  "<",
  "=",
  "*",
  "workspace:",
  "file:",
  "link:",
  "portal:",
  "catalog:",
  "patch:",
  "git+",
  "github:",
  "http:",
  "https:",
  "npm:",
  "jsr:",
];
const preserveValues = new Set([
  "",
  "*",
  "next",
  "beta",
  "alpha",
  "canary",
  "rc",
]);

function writeStdout(line) {
  process.stdout.write(`${line}\n`);
}

async function walk(dir, found = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (skipDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath, found);
      continue;
    }

    if (entry.isFile() && entry.name === "package.json") {
      found.push(fullPath);
    }
  }

  return found;
}

function shouldPreserve(version) {
  if (preserveValues.has(version)) {
    return true;
  }

  return preservePrefixes.some((prefix) => version.startsWith(prefix));
}

async function resolveInstalledVersion(packageName, manifestDir) {
  const searchDirs = [];
  let currentDir = manifestDir;

  while (true) {
    searchDirs.push(currentDir);
    if (currentDir === rootDir) {
      break;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  for (const dir of searchDirs) {
    const packageJsonPath = path.join(dir, "node_modules", packageName, "package.json");

    try {
      const raw = await fs.readFile(packageJsonPath, "utf8");
      const parsed = JSON.parse(raw);

      if (
        typeof parsed.version === "string" &&
        exactSemverPattern.test(parsed.version)
      ) {
        return parsed.version;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function normalizeSection(section, manifestDir) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return { changed: false, updatedEntries: [], unresolvedLatest: [] };
  }

  let changed = false;
  const updatedEntries = [];
  const unresolvedLatest = [];

  for (const [name, version] of Object.entries(section)) {
    if (typeof version !== "string") {
      continue;
    }

    if (version === "latest") {
      const installedVersion = await resolveInstalledVersion(name, manifestDir);

      if (!installedVersion) {
        unresolvedLatest.push(`${name}: latest`);
        continue;
      }

      section[name] = `^${installedVersion}`;
      changed = true;
      updatedEntries.push(`${name}: latest -> ^${installedVersion}`);
      continue;
    }

    if (shouldPreserve(version) || !exactSemverPattern.test(version)) {
      continue;
    }

    section[name] = `^${version}`;
    changed = true;
    updatedEntries.push(`${name}: ${version} -> ^${version}`);
  }

  return { changed, updatedEntries, unresolvedLatest };
}

async function updatePackageJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const updates = [];
  const unresolvedLatest = [];
  let changed = false;

  for (const sectionName of dependencySections) {
    const result = await normalizeSection(parsed[sectionName], path.dirname(filePath));
    unresolvedLatest.push(
      ...result.unresolvedLatest.map((entry) => `${sectionName}.${entry}`),
    );
    if (result.changed) {
      changed = true;
      updates.push(...result.updatedEntries.map((entry) => `${sectionName}.${entry}`));
    }
  }

  if (!changed) {
    if (unresolvedLatest.length === 0) {
      return null;
    }

    return { filePath, updates, unresolvedLatest };
  }

  await fs.writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
  return { filePath, updates, unresolvedLatest };
}

const manifests = await walk(rootDir);
const results = [];
let unresolvedLatestCount = 0;

for (const manifestPath of manifests) {
  const result = await updatePackageJson(manifestPath);
  if (result) {
    results.push(result);
    unresolvedLatestCount += result.unresolvedLatest.length;
  }
}

if (results.length === 0) {
  writeStdout("No exact semver dependency ranges or latest tags found.");
  process.exit(0);
}

for (const result of results) {
  writeStdout(result.filePath);
  for (const update of result.updates) {
    writeStdout(`  ${update}`);
  }
  for (const entry of result.unresolvedLatest) {
    writeStdout(`  unresolved latest: ${entry}`);
  }
}

if (unresolvedLatestCount > 0) {
  console.error(
    "Unable to resolve one or more latest tags from installed packages. Install dependencies first, then rerun this script.",
  );
  process.exit(2);
}
