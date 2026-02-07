import * as os from "node:os";
import * as path from "node:path";

export function resolveRepoRoot(mainDir: string): string {
  // In dev (running from source), the entry file compiles to apps/electron-desktop/dist/main.js.
  // We want the repo root to locate openclaw.mjs and dist/.
  return path.resolve(mainDir, "..", "..", "..");
}

export function resolveBundledOpenClawDir(): string {
  return path.join(process.resourcesPath, "openclaw");
}

export function resolveBundledNodeBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  const base = path.join(process.resourcesPath, "node", `${platform}-${arch}`);
  if (platform === "win32") {
    return path.join(base, "node.exe");
  }
  return path.join(base, "bin", "node");
}

export function resolveBundledGogBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  return path.join(process.resourcesPath, "gog", `${platform}-${arch}`, "gog");
}

export function resolveBundledJqBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  return path.join(process.resourcesPath, "jq", `${platform}-${arch}`, "jq");
}

export function resolveBundledMemoBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  return path.join(process.resourcesPath, "memo", `${platform}-${arch}`, "memo");
}

export function resolveBundledRemindctlBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  return path.join(process.resourcesPath, "remindctl", `${platform}-${arch}`, "remindctl");
}

export function resolveBundledObsidianCliBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  return path.join(process.resourcesPath, "obsidian-cli", `${platform}-${arch}`, "obsidian-cli");
}

export function resolveBundledGhBin(): string {
  const platform = process.platform;
  const arch = process.arch;
  return path.join(process.resourcesPath, "gh", `${platform}-${arch}`, "gh");
}

export function resolveDownloadedGogBin(mainDir: string): string {
  const platform = process.platform;
  const arch = process.arch;
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  // We keep the downloaded gog runtime next to the Electron app sources.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".gog-runtime", `${platform}-${arch}`, "gog");
}

export function resolveDownloadedJqBin(mainDir: string): string {
  const platform = process.platform;
  const arch = process.arch;
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  // We keep the downloaded jq runtime next to the Electron app sources.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".jq-runtime", `${platform}-${arch}`, "jq");
}

export function resolveDownloadedMemoBin(mainDir: string): string {
  const platform = process.platform;
  const arch = process.arch;
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  // We keep the built memo runtime next to the Electron app sources.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".memo-runtime", `${platform}-${arch}`, "memo");
}

export function resolveDownloadedRemindctlBin(mainDir: string): string {
  const platform = process.platform;
  const arch = process.arch;
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  // We keep the downloaded remindctl runtime next to the Electron app sources.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".remindctl-runtime", `${platform}-${arch}`, "remindctl");
}

export function resolveDownloadedObsidianCliBin(mainDir: string): string {
  const platform = process.platform;
  const arch = process.arch;
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  // We keep the downloaded obsidian-cli runtime next to the Electron app sources.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".obsidian-cli-runtime", `${platform}-${arch}`, "obsidian-cli");
}

export function resolveDownloadedGhBin(mainDir: string): string {
  const platform = process.platform;
  const arch = process.arch;
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  // We keep the downloaded gh runtime next to the Electron app sources.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".gh-runtime", `${platform}-${arch}`, "gh");
}

export function resolveBundledGogCredentialsPath(): string {
  return path.join(process.resourcesPath, "gog-credentials", "gog-client-secret.json");
}

export function resolveDownloadedGogCredentialsPath(mainDir: string): string {
  // In dev, the entry file compiles to apps/electron-desktop/dist/main.js.
  const appDir = path.resolve(mainDir, "..");
  return path.join(appDir, ".gog-runtime", "credentials", "gog-client-secret.json");
}

export function resolveGogCredentialsPaths(): string[] {
  const paths: string[] = [];
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    paths.push(path.join(xdg, "gogcli", "credentials.json"));
  }
  paths.push(path.join(os.homedir(), ".config", "gogcli", "credentials.json"));
  if (process.platform === "darwin") {
    paths.push(
      path.join(os.homedir(), "Library", "Application Support", "gogcli", "credentials.json")
    );
  }
  return paths;
}

export function resolveRendererIndex(params: {
  isPackaged: boolean;
  appPath: string;
  mainDir: string;
}): string {
  if (params.isPackaged) {
    return path.join(params.appPath, "renderer", "dist", "index.html");
  }
  // dev: entry file is apps/electron-desktop/dist/main.js
  return path.join(path.resolve(params.mainDir, ".."), "renderer", "dist", "index.html");
}

export function resolvePreloadPath(mainDir: string): string {
  return path.join(mainDir, "preload.js");
}
