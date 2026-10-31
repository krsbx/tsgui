/** Node backend — node:ffi's address-to-string (as string-returns.ts). */
import { toString } from "node:ffi";

export function readCString(pointer: number | bigint): string {
  // toString returns null for a NULL address — an event text pointer is
  // never null, but degrade to empty rather than lie with "null".
  return (
    toString(typeof pointer === "bigint" ? pointer : BigInt(pointer)) ?? ""
  );
}
