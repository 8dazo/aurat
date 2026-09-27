export type AuratMode = "live" | "record" | "replay";

export interface AuratConfig {
  mode: AuratMode;
  upstreamUrl: string;
  cassetteDir: string;
  upstreamApiKey?: string;
  quiet?: boolean;
}

export interface AuratRequestSnapshot {
  method: string;
  path: string;
  body: unknown;
}

export interface AuratResponseSnapshot {
  status: number;
  headers: Record<string, string>;
  bodyBase64: string;
}

export interface AuratCassette {
  version: 1;
  fingerprint: string;
  recordedAt: string;
  request: AuratRequestSnapshot;
  response: AuratResponseSnapshot;
  metadata: {
    upstreamUrl: string;
  };
}
