import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuratCassette } from "./types.js";

export class FileCassetteStore {
  private readonly directory: string;

  constructor(rootDirectory: string) {
    this.directory = path.join(rootDirectory, "cassettes");
  }

  private filePath(fingerprint: string): string {
    return path.join(this.directory, `${fingerprint}.json`);
  }

  async get(fingerprint: string): Promise<AuratCassette | null> {
    try {
      const raw = await readFile(this.filePath(fingerprint), "utf8");
      return JSON.parse(raw) as AuratCassette;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async put(cassette: AuratCassette): Promise<void> {
    await mkdir(this.directory, { recursive: true });

    const destination = this.filePath(cassette.fingerprint);
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(cassette, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
  }
}
