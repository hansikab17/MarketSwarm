const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.error || `API error ${res.status}`);
  }
  return data;
}

export async function healthCheck() {
  return apiFetch("/health");
}

export async function generateData(rows = 5000, seed = 42) {
  return apiFetch("/api/data/generate", {
    method: "POST",
    body: JSON.stringify({ rows, seed }),
  });
}

export async function getCustomers(limit = 50, offset = 0) {
  return apiFetch(`/api/customers?limit=${limit}&offset=${offset}`);
}

export async function createScenario(scenario) {
  return apiFetch("/api/scenarios", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

export async function getScenarios() {
  return apiFetch("/api/scenarios");
}

export async function getScenario(id) {
  return apiFetch(`/api/scenarios/${id}`);
}

export async function startRun(scenarioId, sampleSize = 5000, humanPct = 0, ragScenarioId = "") {
  return apiFetch("/api/runs", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId, sample_size: sampleSize, human_pct: humanPct, rag_scenario_id: ragScenarioId }),
  });
}

export async function getRun(runId) {
  return apiFetch(`/api/runs/${runId}`);
}

export async function getResults(runId) {
  return apiFetch(`/api/runs/${runId}/results`);
}

export async function getAgents(runId) {
  return apiFetch(`/api/runs/${runId}/agents`);
}

export function getExportUrl(runId, format = "csv") {
  return `${API_BASE}/api/runs/${runId}/export?format=${format}`;
}

export async function backtest(sampleSize = 1000) {
  return apiFetch("/api/backtest", {
    method: "POST",
    body: JSON.stringify({ sample_size: sampleSize }),
  });
}

export async function reconcileRun(runId, votes) {
  return apiFetch(`/api/runs/${runId}/reconcile`, {
    method: "POST",
    body: JSON.stringify({ votes }),
  });
}

export async function submitVote(runId, customerId, vote, customerName = "") {
  return apiFetch(`/api/runs/${runId}/votes/${customerId}`, {
    method: "POST",
    body: JSON.stringify({ vote, customer_name: customerName }),
  });
}

export async function getVotes(runId) {
  return apiFetch(`/api/runs/${runId}/votes`);
}

// --- Raaga RAG ---

export async function uploadRaagaDocs(scenarioId, files) {
  const formData = new FormData();
  formData.append("scenario_id", scenarioId);
  files.forEach((f, i) => formData.append(`file_${i}`, f));
  const url = `${API_BASE}/api/raaga/documents`;
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || `Upload error ${res.status}`);
  return data;
}

export async function uploadRaagaDocsJson(scenarioId, documents) {
  return apiFetch("/api/raaga/documents", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId, documents }),
  });
}

export async function listRaagaDocs(scenarioId) {
  return apiFetch(`/api/raaga/documents/${scenarioId}`);
}

export async function deleteRaagaDoc(scenarioId, docId) {
  return apiFetch(`/api/raaga/documents/${scenarioId}/${docId}`, { method: "DELETE" });
}

export async function buildRaagaIndex(scenarioId) {
  return apiFetch("/api/raaga/build", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId }),
  });
}

export async function askRaaga(scenarioId, question, productName) {
  return apiFetch("/api/raaga/ask", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId, question, product_name: productName }),
  });
}

// --- AWS internals metrics ---

export async function getAwsMetrics(minutes = 180) {
  return apiFetch(`/api/metrics/aws?minutes=${minutes}`);
}

// --- Page-view hit counter (Vercel frontend traffic) ---

export async function getHits(minutes = 60) {
  return apiFetch(`/api/hits?minutes=${minutes}`);
}

/**
 * Fire a page-view beacon. Non-blocking, no auth, tiny payload.
 * Uses navigator.sendBeacon when available so it survives navigation.
 */
export function recordHit(path) {
  if (typeof window === "undefined") return;
  const url = `${API_BASE}/api/hits/beacon`;
  const body = JSON.stringify({
    path: path || window.location.pathname,
    referrer: document.referrer || "",
  });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch (_) { /* fall through */ }
  // Fallback
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
