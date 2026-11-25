// Sizzle Lane — the make.fun hand-in for best-cooking-game-20261125-0137.
// Node 22, standard library only. It copies this repository's game/ and
// screenshots/ into the output directory and writes /output/dossier.json with
// the vendored make.fun library, so the sealed scorer can check the entry.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory itself is never deleted (the grader's filesystem is
// read-only at its root) and never chmodded (it belongs to another user in
// the grader sandbox): only its contents are cleared, and only the files and
// folders copied into it are made world-readable.

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function clearContents(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function makeReadable(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) {
      chmodSync(path, 0o755);
      makeReadable(path);
    } else {
      chmodSync(path, 0o644);
    }
  }
}

mkdirSync(out, { recursive: true });
clearContents(out);

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

makeReadable(out);
