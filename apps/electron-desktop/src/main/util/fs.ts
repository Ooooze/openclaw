import * as fs from "node:fs";

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}
