import { setupFfiCopy } from "@vulcania/devtools";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await setupFfiCopy(resolve(__dirname, "ffi"));
