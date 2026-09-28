import { mkdir, readFile, appendFile } from "node:fs/promises";
import { redact, redactPath, redactPayload } from "./redact.js";
import { dirname } from "node:path";

export class RecordingStore {
  constructor(path) {
    this.path = path;
    this.cache = undefined;
    this.loading = undefined;
    this.consumed = new Set();
    this.appendQueue = Promise.resolve();
  }

  async load() {
    if (this.cache) return this.cache;
    this.loading ??= this.read();
    return this.loading;
  }

  async read() {

    let contents;
    try {
      contents = await readFile(this.path, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        this.cache = [];
        return this.cache;
      }
      throw error;
    }

    this.cache = contents
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return this.cache;
  }

  async find(fingerprint) {
    const recordings = await this.load();
    for (let index = recordings.length - 1; index >= 0; index -= 1) {
      if (recordings[index].fingerprint === fingerprint) return recordings[index];
    }
    return undefined;
  }

  async list() {
    return [...(await this.load())];
  }

  async consume(fingerprint) {
    const recordings = await this.load();
    const index = recordings.findIndex((item, i) => item.fingerprint === fingerprint && !this.consumed.has(i));
    if (index < 0) return undefined;
    // No await between selecting and reserving an occurrence.
    this.consumed.add(index);
    return recordings[index];
  }

  async coverage() {
    const recordings = await this.load();
    return { total: recordings.length, consumed: this.consumed.size,
      pending: recordings.filter((_, i) => !this.consumed.has(i)).map((item) => item.fingerprint) };
  }

  async append(recording) {
    recording = structuredClone(recording);
    if (recording.request) {
      recording.request = redact(recording.request);
      if (recording.request.path) recording.request.path = redactPath(recording.request.path);
    }
    if (recording.response) {
      recording.response.headers = redact(recording.response.headers);
      if (typeof recording.response.body === "string") {
        const encoded = recording.response.bodyEncoding === "base64";
        const raw = encoded ? Buffer.from(recording.response.body, "base64").toString("utf8") : recording.response.body;
        const safe = redactPayload(raw);
        let changed = safe !== raw;
        try { changed = JSON.stringify(JSON.parse(raw)) !== safe; } catch {}
        if (changed) recording.response.body = encoded ? Buffer.from(safe).toString("base64") : safe;
      }
    }
    const operation = this.appendQueue.then(async () => {
      const recordings = await this.load();
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(this.path, `${JSON.stringify(recording)}\n`, { encoding: "utf8", mode: 0o600 });
      recordings.push(recording);
    });
    this.appendQueue = operation.catch(() => {});
    return operation;
  }
}
