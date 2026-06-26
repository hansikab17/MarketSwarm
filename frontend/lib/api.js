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

export async function startRun(scenarioId, sampleSize = 5000, humanPct = 0) {
  return apiFetch("/api/runs", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId, sample_size: sampleSize, human_pct: humanPct }),
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
