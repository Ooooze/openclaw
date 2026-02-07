export type GatewayState =
  | { kind: "starting"; port: number; logsDir: string; token: string }
  | { kind: "ready"; port: number; logsDir: string; url: string; token: string }
  | { kind: "failed"; port: number; logsDir: string; details: string; token: string };

export type ResetAndCloseResult = {
  ok: true;
  warnings?: string[];
};
