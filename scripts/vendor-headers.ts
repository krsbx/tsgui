/**
 * Fetch the pinned SDL-family submodules under vendor/ and trim each one to
 * its headers. Codegen only parses `include/`, so a sparse checkout drops
 * the sources, tests and build files from the working tree.
 *
 * Sparse-checkout is per-clone state (it is not committed), so run this
 * after every fresh clone and after bumping a pin — CI runs it too.
 * Plain Node (no Bun APIs), so it works before `bun install`.
 *
 *   node scripts/vendor-headers.ts   (or: bun run vendor)
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/** What each submodule keeps: the headers codegen parses + the license. */
const KEEP = ["/include/", "/LICENSE*"];

const root = join(import.meta.dirname, "..");

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

/** `git describe --exact-match` exits non-zero on untagged pins. */
function exactTag(path: string): string | null {
  try {
    return execFileSync(
      "git",
      ["-C", path, "describe", "--tags", "--exact-match"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
  } catch {
    return null;
  }
}

const paths = git(
  "config",
  "-f",
  ".gitmodules",
  "--get-regexp",
  "^submodule\\..*\\.path$"
)
  .split("\n")
  .map((line) => line.split(" ")[1])
  .filter((path): path is string => Boolean(path));

// The pin is the submodule's gitlink (mode 160000) in the index. Without
// it, `git submodule update` fails with an opaque "pathspec … did not
// match" — say what's actually missing instead.
const untracked = paths.filter(
  (path) => !git("ls-files", "--stage", "--", path).startsWith("160000 ")
);
if (untracked.length > 0) {
  console.error(
    `vendor: ${untracked.join(", ")} not tracked as submodules (no pinned commit in the index).\n` +
      "Stage the pins first:  git -c advice.addEmbeddedRepo=false add .gitmodules vendor"
  );
  process.exit(1);
}

for (const path of paths) {
  // Shallow, top level only — their nested submodules (codecs, DXC, …)
  // are build inputs, not headers.
  git("submodule", "update", "--init", "--depth", "1", "--", path);
  git("-C", path, "sparse-checkout", "set", "--no-cone", ...KEEP);

  const pin = exactTag(path) ?? git("-C", path, "rev-parse", "--short", "HEAD");
  console.log(`${path}: ${pin} (headers only)`);
}
