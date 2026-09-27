export function buildUpstreamUrl(baseUrl, requestPath) {
  const base = new URL(baseUrl);
  const incoming = new URL(requestPath, "http://aurat.local");
  const basePath = base.pathname.replace(/\/$/, "");

  if (!basePath || basePath === "/" || incoming.pathname.startsWith(`${basePath}/`) || incoming.pathname === basePath) {
    base.pathname = incoming.pathname;
  } else {
    base.pathname = `${basePath}/${incoming.pathname.replace(/^\//, "")}`;
  }
  base.search = incoming.search;
  return base;
}
