/**
 * tsgui codegen CLI — parses real C headers via clang's AST JSON dump and
 * generates FFI backend tables for @tsgui/bindings.
 *
 * Usage:
 *   bun run tools/codegen/src/index.ts <target>|all [--check]
 *
 * Targets live in targets.ts; the pipeline lives in generate.ts.
 */
import { generateTarget } from "./generate";
import { TARGETS } from "./targets";

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const targetName = process.argv[2];

  if (targetName === "all") {
    for (const spec of Object.values(TARGETS)) {
      await generateTarget(spec, check);
    }
    return;
  }

  const spec = targetName ? TARGETS[targetName] : undefined;
  if (!spec) {
    console.error(
      `usage: codegen <${Object.keys(TARGETS).join("|")}|all> [--check]`
    );
    process.exit(1);
  }
  await generateTarget(spec, check);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
