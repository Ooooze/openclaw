import * as net from "node:net";

export type TailBuffer = {
  push(chunk: string): void;
  read(): string;
};

export function createTailBuffer(maxChars: number): TailBuffer {
  let buf = "";
  return {
    push(chunk: string) {
      buf += chunk;
      if (buf.length > maxChars) {
        buf = buf.slice(buf.length - maxChars);
      }
    },
    read() {
      return buf;
    },
  };
}

export async function waitForPortOpen(
  host: string,
  port: number,
  timeoutMs: number
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port });
      const done = (result: boolean) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      };
      socket.once("connect", () => done(true));
      socket.once("error", () => done(false));
      socket.setTimeout(500, () => done(false));
    });
    if (ok) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export async function pickPort(preferred: number): Promise<number> {
  const isFree = await new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(preferred, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
  if (isFree) {
    return preferred;
  }
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (e: unknown) => reject(e));
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      server.close(() => {
        if (!addr || typeof addr === "string") {
          reject(new Error("Failed to resolve random port"));
          return;
        }
        resolve(addr.port);
      });
    });
  });
}
