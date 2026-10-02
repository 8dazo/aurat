"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiSession } from "./workspace-client";

type ImportSummary = {
  scanned: number;
  imported: number;
  duplicates: number;
  skipped: Record<string, number>;
  complete: boolean;
  nextCursor?: string | null;
};
export type LangfuseConnection = {
  id: string;
  metadata?: {
    baseUrl?: string;
    projectName?: string;
    remoteProjectId?: string;
  };
  lastImport?: ImportSummary;
};

export default function LangfusePanel({
  api,
  projectId,
  connection,
  onChange,
}: {
  api: ApiSession;
  projectId: string;
  connection?: LangfuseConnection;
  onChange: () => Promise<void>;
}) {
  const [range, setRange] = useState(() => ({
    from: new Date(Date.now() - 86400000).toISOString().slice(0, 16),
    to: new Date().toISOString().slice(0, 16),
  }));
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  async function perform(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Langfuse operation failed");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function changeRange(key: "from" | "to", value: string) {
    setRange((current) => ({ ...current, [key]: value }));
    setSummary(null);
    setError("");
  }
  function importPage(cursor?: string | null) {
    if (!connection) return;
    void perform(async () => {
      const result: ImportSummary = await api.request(
        `/api/connections/${connection.id}/sync`,
        {
          fromStartTime: new Date(range.from + ":00Z").toISOString(),
          toStartTime: new Date(range.to + ":00Z").toISOString(),
          ...(cursor ? { cursor } : {}),
        },
      );
      setSummary(result);
    });
  }
  const displayed = summary ?? connection?.lastImport;
  return (
    <section aria-labelledby="langfuse-heading" aria-busy={busy}>
      <h3 id="langfuse-heading">Langfuse trace import</h3>
      <p>
        Import captured chat generations into this project’s behavioral
        contracts. Configure AURAT_LANGFUSE_PUBLIC_KEY,
        AURAT_LANGFUSE_SECRET_KEY and AURAT_LANGFUSE_BASE_URL on the private API
        server. Do not paste keys here.
      </p>
      {connection ? (
        <>
          <p>
            Connected: {connection.metadata?.projectName} ·{" "}
            {connection.metadata?.baseUrl}
            <br />
            Langfuse project: {connection.metadata?.remoteProjectId}
          </p>
          <div className="heading-actions">
            <div>
              <Label htmlFor="langfuse-from">From (UTC, inclusive)</Label>
              <Input
                id="langfuse-from"
                type="datetime-local"
                value={range.from}
                disabled={busy}
                onChange={(e) => changeRange("from", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="langfuse-to">To (UTC, exclusive)</Label>
              <Input
                id="langfuse-to"
                type="datetime-local"
                value={range.to}
                disabled={busy}
                onChange={(e) => changeRange("to", e.target.value)}
              />
            </div>
          </div>
          <p>
            Up to seven days per window, 50 observations per page. Only
            supported, completed, non-streaming chat generations are imported.
            Captured text is stored locally; review it for personal data before
            importing.
          </p>
          <div className="heading-actions">
            <Button
              disabled={busy || !range.from || !range.to}
              onClick={() => importPage()}
            >
              {busy ? "Importing…" : "Import first page"}
            </Button>
            {summary?.nextCursor ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => importPage(summary.nextCursor)}
              >
                Import next page
              </Button>
            ) : null}
          </div>
          {displayed ? (
            <div role="status" aria-live="polite">
              <p>
                {summary ? "This page" : "Last saved page"}: {displayed.scanned}{" "}
                scanned · {displayed.imported} imported · {displayed.duplicates}{" "}
                already saved
              </p>
              {Object.entries(displayed.skipped).map(([reason, count]) => (
                <p key={reason}>
                  {count} skipped: {reason.replaceAll("_", " ")}
                </p>
              ))}
              <p>
                {displayed.complete
                  ? "Reached the end of this time window."
                  : "More observations remain in this time window."}
              </p>
            </div>
          ) : null}
          <p>
            Retrying a page does not duplicate evidence. After a reload, start
            from the first page of the same window. Late observations may
            require another import. This does not run your application or call a
            model.
          </p>
        </>
      ) : (
        <Button
          disabled={busy || !projectId}
          onClick={() =>
            void perform(async () => {
              await api.request("/api/connections", {
                projectId,
                type: "langfuse",
              });
            })
          }
        >
          {busy ? "Verifying…" : "Verify Langfuse connection"}
        </Button>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
