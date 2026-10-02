import { readFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseReport } from "../platform/report.js";
const escape = (value) =>
  String(value).replace(
    /[&<>|`\r\n]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "|": "&#124;",
        "`": "&#96;",
        "\r": " ",
        "\n": " ",
      })[c],
  );
export function summary(report) {
  const value = parseReport(report);
  return (
    `### Aurat application regression: ${value.ok ? "PASS" : "FAIL"}\n\nTested commit: ${escape(value.revision ?? "unknown")}\n\n| Scenario | Status | Model coverage | Tool coverage | Failures |\n| --- | --- | --- | --- | --- |\n` +
    value.scenarios
      .map(
        (s) =>
          `| ${escape(s.id)} | ${s.status} | ${s.coverage ? `${s.coverage.model.consumed}/${s.coverage.model.total}` : "unreported"} | ${s.coverage ? `${s.coverage.tools.consumed}/${s.coverage.tools.total}` : "unreported"} | ${s.failures.length} |`,
      )
      .join("\n") +
    "\n\nInspect the JSON artifact for arguments, action order and failure evidence. Node HTTP interception is not an OS sandbox.\n"
  );
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        summary(
          JSON.parse(
            await readFile(
              process.env.AURAT_REPORT ?? ".aurat/report.json",
              "utf8",
            ),
          ),
        ),
      );
  } catch {
    console.error("Could not summarize the Aurat report");
    process.exitCode = 1;
  }
}
