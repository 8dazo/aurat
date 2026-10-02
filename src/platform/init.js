import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync(".aurat", { recursive: true, mode: 0o700 });
try {
  writeFileSync(
    ".aurat/platform.env",
    `AURAT_WORKSPACE_TOKEN=${randomBytes(32).toString("hex")}\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Private workspace initialized. Start with npm run platform:dev. The local dashboard asks for the token in .aurat/platform.env.",
  );
} catch (error) {
  if (error.code === "EEXIST")
    console.log(
      "Private workspace already initialized; existing token preserved.",
    );
  else throw error;
}
