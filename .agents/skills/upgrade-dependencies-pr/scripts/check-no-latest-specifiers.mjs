#!/usr/bin/env node

import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const rootArg = process.argv[2];

if (!rootArg) {
  console.error("Usage: node check-no-latest-specifiers.mjs <repo-root>");
  process.exit(1);
}

const rootDir = path.resolve(rootArg);
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
const trackedFileNames = new Set([
  "package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
]);
const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const execFileAsync = promisify(execFile);
const textLockfilePattern = /@latest(?=[:\s,"'])|"latest"/;

function writeStdout(line) {
  process.stdout.write(`${line}\n`);
}

function isInsideSkippedDir(relativePath) {
  return relativePath.split(path.sep).some((segment) => skipDirs.has(segment));
}

async function listTrackedFiles(rootDir) {
  const { stdout } = await execFileAsync("git", ["-C", rootDir, "ls-files", "-z"]);
  const trackedPaths = stdout.split("\0").filter(Boolean);

  return trackedPaths
    .filter((relativePath) => trackedFileNames.has(path.basename(relativePath)))
    .filter((relativePath) => !isInsideSkippedDir(relativePath))
    .map((relativePath) => path.join(rootDir, relativePath));
}

function collectLatestValues(value, currentPath = "$", findings = []) {
  if (value === "latest") {
    findings.push(currentPath);
    return findings;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectLatestValues(entry, `${currentPath}[${index}]`, findings),
    );
    return findings;
  }

  if (!value || typeof value !== "object") {
    return findings;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    collectLatestValues(nestedValue, `${currentPath}.${key}`, findings);
  }

  return findings;
}

async function scanPackageJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const findings = [];

  for (const sectionName of dependencySections) {
    const section = parsed[sectionName];
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      continue;
    }

    for (const [packageName, version] of Object.entries(section)) {
      if (version === "latest") {
        findings.push(`${sectionName}.${packageName}`);
      }
    }
  }

  return findings;
}

async function scanJsonLockfile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return collectLatestValues(JSON.parse(raw));
}

async function scanPnpmLockfile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const findings = [];
  const lines = raw.split("\n");

  lines.forEach((line, index) => {
    if (/\bspecifier:\s*["']?latest["']?\s*$/.test(line)) {
      findings.push(`line ${index + 1}`);
    }
  });

  return findings;
}

async function scanTextLockfile(filePath, pattern) {
  const raw = await fs.readFile(filePath, "utf8");
  return scanTextContent(raw, pattern);
}

function scanTextContent(raw, pattern) {
  const findings = [];
  const lines = raw.split("\n");

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push(`line ${index + 1}`);
    }
  });

  return findings;
}

async function scanBinaryLockfile(filePath) {
  try {
    const { stdout } = await execFileAsync("bun", [filePath]);
    return scanTextContent(stdout, textLockfilePattern);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(
        "Unable to inspect bun.lockb because `bun` is not installed. Install Bun or convert the lockfile to text format before rerunning this check.",
      );
    }

    throw error;
  }
}

async function scanFile(filePath) {
  const baseName = path.basename(filePath);

  if (baseName === "package.json") {
    return scanPackageJson(filePath);
  }

  if (baseName === "package-lock.json" || baseName === "npm-shrinkwrap.json") {
    return scanJsonLockfile(filePath);
  }

  if (baseName === "pnpm-lock.yaml") {
    return scanPnpmLockfile(filePath);
  }

  if (baseName === "yarn.lock" || baseName === "bun.lock") {
    return scanTextLockfile(filePath, textLockfilePattern);
  }

  if (baseName === "bun.lockb") {
    return scanBinaryLockfile(filePath);
  }

  return [];
}

const files = await listTrackedFiles(rootDir);
const failures = [];

for (const filePath of files) {
  const findings = await scanFile(filePath);
  if (findings.length > 0) {
    failures.push({ filePath, findings });
  }
}

if (failures.length === 0) {
  writeStdout("No latest specifiers found in tracked package manifests or lockfiles.");
  process.exit(0);
}

for (const failure of failures) {
  console.error(failure.filePath);
  for (const finding of failure.findings) {
    console.error(`  ${finding}`);
  }
}

console.error(
  "Latest specifiers are not allowed in tracked package manifests or lockfiles. Convert them to explicit semver ranges and regenerate the lockfiles.",
);
process.exit(1);
