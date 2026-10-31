/** clang AST JSON dumping for the codegen pipeline. */
import { spawnSync } from "node:child_process";

/**
 * Dump a header's full AST as JSON. Some clang versions write the dump to
 * stdout, others to stderr — accept whichever stream parses as JSON.
 */
export function dumpAst(headerPath: string, includeDir?: string): unknown {
  const args = [
    "-x",
    "c",
    "-fsyntax-only",
    "-Xclang",
    "-ast-dump=json",
    "-fparse-all-comments",
  ];
  if (includeDir) args.push(`-I${includeDir}`);
  args.push(headerPath);

  const res = spawnSync("clang", args, {
    encoding: "utf8",
    // SDL3's full AST dump is tens of MB — raise the default 1 MB cap.
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (res.error) {
    throw new Error(`clang spawn failed: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(
      `clang ast-dump failed (${res.status}):\n${(res.stderr ?? "").slice(0, 2000)}`
    );
  }
  for (const text of [res.stdout ?? "", res.stderr ?? ""]) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed);
    }
  }
  throw new Error("clang produced no JSON AST dump on stdout or stderr");
}
