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
  revokedAt?: string | null;
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
  const [ciTokens, setCiTokens] = useState<Entry[]>([]);
  const [issuedToken, setIssuedToken] = useState<{
    id: string;
    projectId: string;
    token: string;
  } | null>(null);
  const [storage, setStorage] = useState("sqlite");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function load() {
    if (!api) return;
    const [w, c, b, t, j, keys, health] = await Promise.all([
      api.request("/api/workspace"),
      api.request("/api/connections"),
      api.request("/api/contracts"),
      api.request("/api/triggers"),
      api.request("/api/jobs"),
      api.request("/api/ci-tokens"),
      api.request("/health"),
    ]);
    setProjects(w.projects);
    setConnections(c);
    setContracts(b);
    setTriggers(t);
    setJobs(j);
    setCiTokens(keys);
    setStorage(health.storage);
  }
  useEffect(() => {
    setIssuedToken(null);
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
        Connect your private backend, using SQLite now or Postgres when
        configured. Workspace tokens stay in memory and are cleared on reload.
        Team accounts and hosted access are still being built.
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
            <span>
              Connected to {api.base} · {storage}
            </span>
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
          <h3>GitHub CI report delivery</h3>
          <p>
            Create a project-scoped upload token. Add it as the GitHub secret
            AURAT_REPORT_TOKEN; it can upload reports only for its project. The
            API must be reachable from your runner. Local URLs need a
            self-hosted runner.
          </p>
          <Button
            disabled={busy || !project}
            onClick={() =>
              void act(async () => {
                setIssuedToken(
                  await api.request("/api/ci-tokens", {
                    projectId: project,
                    name: "GitHub Actions",
                  }),
                );
              }, "CI upload token created; copy it now")
            }
          >
            Create CI upload token
          </Button>
          {issuedToken && (
            <div>
              <Label htmlFor="issued-ci-token">
                New token for project {issuedToken.projectId} · shown once
              </Label>
              <Input
                id="issued-ci-token"
                type="password"
                readOnly
                autoComplete="off"
                value={issuedToken.token}
              />
              <Button
                variant="outline"
                onClick={() =>
                  void act(async () => {
                    await navigator.clipboard.writeText(issuedToken.token);
                  }, "CI token copied")
                }
              >
                Copy token
              </Button>
              <Button variant="ghost" onClick={() => setIssuedToken(null)}>
                Dismiss token
              </Button>
            </div>
          )}
          <p>
            Project ID: {project || "Choose a project"}.{" "}
            <a
              href="https://github.com/8dazo/aurat/blob/main/examples/github-actions.yml"
              target="_blank"
              rel="noreferrer"
            >
              Open CI workflow template
            </a>
          </p>
          {ciTokens
            .filter((key) => key.projectId === project)
            .map((key) => (
              <div className="setting-row" key={key.id}>
                <span>
                  {key.name} · {key.revokedAt ? "Revoked" : "reports:write"}
                </span>
                <Button
                  variant="outline"
                  disabled={busy || !!key.revokedAt}
                  onClick={() =>
                    void act(async () => {
                      await api.request(
                        "/api/ci-tokens/" + key.id + "/revoke",
                        {},
                      );
                      if (issuedToken?.id === key.id) setIssuedToken(null);
                    }, "CI token revoked")
                  }
                >
                  Revoke
                </Button>
              </div>
            ))}
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
