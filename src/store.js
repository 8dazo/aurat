import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

export class RecordingStore {
  constructor(path) {
    this.path = path;
  }

  async find(fingerprint) {
    let contents;
    try {
      contents = await readFile(this.path, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return undefined;
      throw error;
    }

    const lines = contents.split("\n").filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const recording = JSON.parse(lines[index]);
      if (recording.fingerprint === fingerprint) return recording;
    }

    return undefined;
  }

  async append(recording) {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(recording)}\n`, "utf8");
  }
}
