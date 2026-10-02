"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectApi, disconnectApi, useApiSession } from "./workspace-client";
type Entry = {
  id: string;
  projectId: string;
  type?: string;
  name?: string;
  contractId?: string;
  state?: string;
  error?: string;
  result?: { ok: boolean };
  lastSyncedAt?: string;
  workflowRuns?: {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    revision: string;
  }[];
};
export default function IntegrationsPanel() {
  const api = useApiSession();
  const [base, setBase] = useState("http://127.0.0.1:4318");
  const [token, setToken] = useState("");
  const [project, setProject] = useState("");
  const [contract, setContract] = useState("");
  const [projects, setProjects] = useState<Entry[]>([]);
  const [connections, setConnections] = useState<Entry[]>([]);
  const [contracts, setContracts] = useState<Entry[]>([]);
  const [triggers, setTriggers] = useState<Entry[]>([]);
  const [jobs, setJobs] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function load() {
    if (!api) return;
    const [w, c, b, t, j] = await Promise.all([
      api.request("/api/workspace"),
      api.request("/api/connections"),
      api.request("/api/contracts"),
      api.request("/api/triggers"),
      api.request("/api/jobs"),
    ]);
    setProjects(w.projects);
    setConnections(c);
    setContracts(b);
    setTriggers(t);
    setJobs(j);
  }
  useEffect(() => {
    if (!api) return;
    void load().catch((e) => setError(e.message));
    const timer = setInterval(
      () => void load().catch((e) => setError(e.message)),
      4000,
    );
    return () => clearInterval(timer);
  }, [api]);
  async function act(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  const selectedContracts = contracts.filter((c) => c.projectId === project);
  return (
    <section
      className="settings-panel integration-panel"
      aria-label="Working integrations"
    >
      <h2>Private API workspace</h2>
      <p>
        Use the local persistent database now. Hosted accounts and Neon storage
        are the next step. Workspace tokens stay in memory and are cleared on
        reload.
      </p>
      {!api ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await connectApi(base, token);
              setToken("");
            }, "Local workspace connected");
          }}
        >
          <Label htmlFor="api-base">Local API URL</Label>
          <Input
            id="api-base"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
          <Label htmlFor="api-token">Workspace token</Label>
          <Input
            id="api-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button disabled={busy} type="submit">
            Connect local workspace
          </Button>
        </form>
      ) : (
        <>
          <div className="setting-row">
            <span>Connected to {api.base}</span>
            <Button variant="outline" onClick={disconnectApi}>
              Disconnect
            </Button>
          </div>
          <Label htmlFor="integration-project">Project</Label>
          <select
            id="integration-project"
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setContract("");
            }}
          >
            <option value="">Choose a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p>
            Create a project using the dashboard’s New project button after
            connecting.
          </p>
          <div className="heading-actions">
            <Button
              disabled={busy || !project}
              onClick={() =>
                void act(
                  () =>
                    api.request("/api/connections", {
                      projectId: project,
                      type: "github",
                    }),
                  "GitHub repository verified",
                )
              }
            >
              Verify GitHub connection
            </Button>
            <Button
              variant="outline"
              disabled={busy || !project}
              onClick={() =>
                void act(
                  () =>
                    api.request("/api/connections", {
                      projectId: project,
                      type: "otlp",
                    }),
                  "OTLP push connection enabled",
                )
              }
            >
              Enable OTLP ingestion
            </Button>
          </div>
          <Label htmlFor="otel-import">OTLP JSON spans</Label>
          <Input
            id="otel-import"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            disabled={busy || !project || !file}
            onClick={() =>
              void act(async () => {
                if (!file || file.size > 1048576)
                  throw Error("Choose an OTLP JSON file under 1 MiB");
                const result = await api.request("/api/ingest/otel", {
                  projectId: project,
                  document: JSON.parse(await file.text()),
                });
                if (!result.imported)
                  throw Error(
                    "No supported model spans imported: " +
                      JSON.stringify(result.skipped),
                  );
              }, "Model spans imported")
            }
          >
            Import model spans
          </Button>
          <Button
            variant="outline"
            disabled={busy || !project}
            onClick={() =>
              void act(
                () => api.request("/api/contracts", { projectId: project }),
                "Contract created from stored evidence",
              )
            }
          >
            Create behavioral contract
          </Button>
          <Label htmlFor="integration-contract">Behavioral contract</Label>
          <select
            id="integration-contract"
            value={contract}
            onChange={(e) => setContract(e.target.value)}
          >
            <option value="">Choose a contract</option>
            {selectedContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <div className="heading-actions">
            <Button
              disabled={busy || !contract}
              onClick={() =>
                void act(
                  () =>
                    api.request("/api/verify", {
                      projectId: project,
                      contractId: contract,
                    }),
                  "Verification saved; inspect Runs for the pass/fail result",
                )
              }
            >
              Verify stored traces
            </Button>
            {(["manual", "github-webhook"] as const).map((type) => (
              <Button
                variant="outline"
                key={type}
                disabled={busy || !contract}
                onClick={() =>
                  void act(
                    () =>
                      api.request("/api/triggers", {
                        projectId: project,
                        contractId: contract,
                        type,
                      }),
                    type + " trigger created",
                  )
                }
              >
                Add {type} trigger
              </Button>
            ))}
          </div>
          <p>
            These triggers compare stored traces; they do not run your
            repository or call a live model.
          </p>
          <h3>Connections</h3>
          {connections.length ? (
            connections.map((c) => (
              <div key={c.id} className="setting-row">
                <div>
                  <strong>
                    {c.type} ·{" "}
                    {projects.find((p) => p.id === c.projectId)?.name ??
                      c.projectId}
                  </strong>
                  {c.workflowRuns?.map((r) => (
                    <p key={r.id}>
                      {r.name} · {r.status} · {r.conclusion ?? "pending"} ·{" "}
                      {r.revision.slice(0, 7)}
                    </p>
                  ))}
                </div>
                {c.type === "github" && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () =>
                          api.request("/api/connections/" + c.id + "/sync", {}),
                        "Latest GitHub workflow status synced",
                      )
                    }
                  >
                    Sync workflows
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p>No connectors configured yet.</p>
          )}
          <h3>Triggers</h3>
          {triggers.map((t) => (
            <div key={t.id} className="setting-row">
              <div>
                <strong>{t.type}</strong>
                {t.type === "github-webhook" && (
                  <p>
                    POST {api.base}/api/webhooks/github/{t.id} · configure the
                    server webhook secret in GitHub.
                  </p>
                )}
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  void act(
                    () => api.request("/api/triggers/" + t.id + "/fire", {}),
                    "Job queued; status updates below",
                  )
                }
              >
                Run now
              </Button>
            </div>
          ))}
          <h3>Jobs</h3>
          {jobs.length ? (
            jobs.slice(0, 10).map((j) => (
              <p key={j.id}>
                {j.id.slice(0, 8)} · {j.state}
                {j.result
                  ? j.result.ok
                    ? " · contract passed"
                    : " · contract failed"
                  : ""}
                {j.error ? " · " + j.error : ""}
              </p>
            ))
          ) : (
            <p>No jobs yet.</p>
          )}
          <h3>MCP</h3>
          <p>
            Authenticated Streamable HTTP: {api.base}/mcp. For a local client,
            launch <code>npm run platform:mcp</code>. Tools list projects,
            connections and runs, create contracts, and verify stored traces.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
