/** Bun backend — bun:ffi reads the NUL-terminated string at the address. */
import { CString } from "bun:ffi";

export function readCString(pointer: number | bigint): string {
  return String(
    new CString(typeof pointer === "bigint" ? Number(pointer) : pointer)
  );
}
