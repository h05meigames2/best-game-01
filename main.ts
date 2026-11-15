// Emberlight Keep — hand-in entrypoint for best-game-01.
//
// What this program does, in its own words: it gathers the finished game
// (game/) and its screenshots (screenshots/) into one output folder, then
// asks the kit library to describe that folder as a dossier.json the
// competition's scorer can re-derive byte for byte.
//
// It runs on Node 22+ with nothing but the standard library. The grader
// runs it twice in a sandbox with no network; the two runs must agree, so
// every step below is deterministic: no timestamps, no random choices, no
// dependence on the order the filesystem happens to list things in.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The competition's own limits for this entry (reference/gate.json):
// text at most 160 KiB, at most 4 screenshots of at most 256 KiB each,
// game/ at most 993 entries and 48 MiB, each path at most 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

// The two trees this entry hands in, in the order they are staged.
const HANDED_IN_TREES = ['screenshots', 'game'] as const;

// Where the finished entry lands. The grader writes to /output; outside
// the grader MAKEFUN_OUTPUT_DIR stands in for it.
function pickOutputDir(): string {
  const envDir = process.env.MAKEFUN_OUTPUT_DIR;
  const chosen = envDir !== undefined && envDir.trim() !== '' ? envDir : '/output';
  return resolve(chosen);
}

// The repository root is the folder this file lives in, whatever the
// working directory the program was started from.
function repoRoot(): string {
  return dirname(fileURLToPath(import.meta.url));
}

// Start from a clean slate so a stale file from an earlier run can never
// leak into this entry.
function resetOutputDir(outDir: string): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
}

// Copy one tree (game/ or screenshots/) verbatim into the output folder.
function stageTree(root: string, treeName: string, outDir: string): number {
  const source = join(root, treeName);
  const target = join(outDir, treeName);
  cpSync(source, target, { recursive: true });
  return countEntries(target);
}

// How many files and directories a tree holds, for the run summary.
function countEntries(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += 1;
    if (entry.isDirectory()) total += countEntries(join(dir, entry.name));
  }
  return total;
}

// Ask the kit library to describe the staged entry and save its answer.
function writeDossier(outDir: string): number {
  const dossierBytes = buildDossier(outDir, DOSSIER_LIMITS);
  const dossierPath = join(outDir, 'dossier.json');
  writeFileSync(dossierPath, dossierBytes);
  return statSync(dossierPath).size;
}

function handInEntry(): void {
  const root = repoRoot();
  const outDir = pickOutputDir();
  resetOutputDir(outDir);
  const staged: Record<string, number> = {};
  for (const treeName of HANDED_IN_TREES) {
    staged[treeName] = stageTree(root, treeName, outDir);
  }
  const dossierBytes = writeDossier(outDir);
  console.log(`Emberlight Keep handed in to ${outDir}`);
  for (const treeName of HANDED_IN_TREES) {
    console.log(`  ${treeName}/: ${staged[treeName]} entries`);
  }
  console.log(`  dossier.json: ${dossierBytes} bytes`);
}

handInEntry();
