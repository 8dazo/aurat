import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

export class RecordingStore {
  constructor(path) {
    this.path = path;
    this.cache = undefined;
  }

  async load() {
    if (this.cache) return this.cache;

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

  async append(recording) {
    const recordings = await this.load();
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(recording)}\n`, "utf8");
    recordings.push(recording);
  }
}
