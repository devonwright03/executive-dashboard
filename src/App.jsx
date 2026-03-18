import { useState, useCallback } from "react";

// ─── HELPERS ────────────────────────────────────────────────────
const fmt = n => n == null || n === "" ? "—" : "$" + Math.round(Number(n)).toLocaleString("en-US");
const fmtPct = n => n == null || n === "" ? "—" : (Math.round(Number(n) * 10) / 10) + "%";
const fmtCount = n => n == null || n === "" ? "—" : Math.round(Number(n)).toLocaleString("en-US");
const num = v => v === "" || v == null ? null : Number(v);
const vsTarget = (a, t) => { if (!a || !t) return null; return ((a - t) / t) * 100; };
const ragColor = (pct, inv = false) => {
  if (pct == null) return "var(--color-text-secondary)";
  const good = inv ? pct <= 5 : pct >= 0;
  const warn = inv ? pct <= 15 : pct >= -10;
  return good ? "var(--color-text-success)" : warn ? "var(--color-text-warning)" : "var(--color-text-danger)";
};
const ragBg = (pct, inv = false) => {
  if (pct == null) return "var(--color-background-secondary)";
  const good = inv ? pct <= 5 : pct >= 0;
  const warn = inv ? pct <= 15 : pct >= -10;
  return good ? "var(--color-background-success)" : warn ? "var(--color-background-warning)" : "var(--color-background-danger)";
};
const arrow = pct => pct == null ? "" : pct >= 0 ? "▲" : "▼";

const INITIAL_TEAMS = [
  { name: "Team 1", utilCurrent: "", utilNext: "", margin: "" },
  { name: "Team 2", utilCurrent: "", utilNext: "", margin: "" },
  { name: "Team 3", utilCurrent: "", utilNext: "", margin: "" },
];

const EMPTY = {
  period: "",
  revenueActual: "", revenueTarget: "",
  ebitdaActual: "", ebitdaTarget: "",
  arTotal: "", arOver30: "",
  pipelineNB: "", pipelineNBTarget: "",
  pipelineExp: "", pipelineExpTarget: "",
  forecastNB: "", forecastExp: "",
  qualOpps: "", qualOppsTarget: "",
};

// ─── SUB-COMPONENTS ─────────────────────────────────────────────
function Field({ label, value, onChange, prefix = "", suffix = "", placeholder = "0" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 400 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden", background: "var(--color-background-primary)" }}>
        {prefix && <span style={{ padding: "0 8px", fontSize: 13, color: "var(--color-text-secondary)", borderRight: "0.5px solid var(--color-border-tertiary)", height: "100%", display: "flex", alignItems: "center" }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ border: "none", outline: "none", padding: "7px 10px", fontSize: 13, width: "100%", background: "transparent", color: "var(--color-text-primary)" }}
        />
        {suffix && <span style={{ padding: "0 8px", fontSize: 13, color: "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SectionHead({ title, color = "#6C5CE7" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 12px" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{title}</span>
      <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
    </div>
  );
}

function KpiCard({ label, actual, target, format = fmt, invertRag = false, note }) {
  const pct = vsTarget(num(actual), num(target));
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{format(num(actual))}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Target {format(num(target))}</span>
        {pct != null && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "1px 6px", borderRadius: 4, background: ragBg(pct, invertRag), color: ragColor(pct, invertRag) }}>
            {arrow(pct)} {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </div>
      {note && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function PipelineBar({ label, value, target, color }) {
  const v = num(value), t = num(target);
  const pct = t ? Math.min((v / t) * 100, 100) : 0;
  const diff = vsTarget(v, t);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{fmt(v)} <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>/ {fmt(t)}</span></span>
      </div>
      <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      {diff != null && <div style={{ fontSize: 11, marginTop: 3, color: ragColor(diff) }}>{arrow(diff)} {Math.abs(diff).toFixed(1)}% vs target</div>}
    </div>
  );
}

function Sparkline({ data, color = "#6C5CE7" }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(Number).filter(n => !isNaN(n));
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const w = 120, h = 36;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return <svg width={w} height={h} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

// ─── MAIN ────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("entry"); // "entry" | "dashboard"
  const [form, setForm] = useState(EMPTY);
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [snapshots, setSnapshots] = useState([]);
  const [snapDone, setSnapDone] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setTeam = (i, key, val) => setTeams(ts => ts.map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  const setTeamName = (i, val) => setTeams(ts => ts.map((t, idx) => idx === i ? { ...t, name: val } : t));

  const arPct = form.arTotal && form.arOver30 ? ((num(form.arOver30) / num(form.arTotal)) * 100) : null;
  const totalPipeline = (num(form.pipelineNB) || 0) + (num(form.pipelineExp) || 0);
  const totalForecast = (num(form.forecastNB) || 0) + (num(form.forecastExp) || 0);

  const takeSnapshot = () => {
    const snap = {
      week: form.period || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revActual: num(form.revenueActual),
      revTarget: num(form.revenueTarget),
      ebitdaActual: num(form.ebitdaActual),
      ebitdaTarget: num(form.ebitdaTarget),
      arPct: arPct,
      pipelineTotal: totalPipeline,
    };
    setSnapshots(prev => [...prev, snap]);
    setSnapDone(true);
    setTimeout(() => setSnapDone(false), 3000);
  };

  const tabs = [
    { id: "entry", label: "Data Entry" },
    { id: "dashboard", label: "Dashboard" },
    { id: "history", label: `History (${snapshots.length})` },
  ];

  return (
    <div style={{ padding: "16px 0 32px", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Executive KPI Tracker</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Manual entry · {form.period || "No period set"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={takeSnapshot} style={{ fontSize: 12, padding: "6px 14px", cursor: "pointer", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-info)", background: snapDone ? "var(--color-background-success)" : "var(--color-background-info)", color: snapDone ? "var(--color-text-success)" : "var(--color-text-info)", fontWeight: 500 }}>
            {snapDone ? "✓ Saved" : "📸 Save Weekly Snapshot"}
          </button>
          <button onClick={() => { setForm(EMPTY); setTeams(INITIAL_TEAMS); }} style={{ fontSize: 12, padding: "6px 12px", cursor: "pointer", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)" }}>
            Clear
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{ fontSize: 13, padding: "7px 14px", cursor: "pointer", border: "none", background: "transparent", color: view === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: view === t.id ? 500 : 400, borderBottom: view === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DATA ENTRY ── */}
      {view === "entry" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Period label (e.g. "Q1 2025 – Wk 11")</label>
            <input value={form.period} onChange={e => set("period", e.target.value)} placeholder="Q1 2025 – Wk 11" style={{ display: "block", marginTop: 4, width: "100%", padding: "7px 10px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }} />
          </div>

          <SectionHead title="Financial Performance" color="#6C5CE7" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <Field label="Revenue — Actual" prefix="$" value={form.revenueActual} onChange={v => set("revenueActual", v)} />
            <Field label="Revenue — Target" prefix="$" value={form.revenueTarget} onChange={v => set("revenueTarget", v)} />
            <Field label="EBITDA — Actual" prefix="$" value={form.ebitdaActual} onChange={v => set("ebitdaActual", v)} />
            <Field label="EBITDA — Target" prefix="$" value={form.ebitdaTarget} onChange={v => set("ebitdaTarget", v)} />
          </div>

          <SectionHead title="Accounts Receivable" color="#E17055" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="Total AR Balance" prefix="$" value={form.arTotal} onChange={v => set("arTotal", v)} />
            <Field label="AR Over 30 Days" prefix="$" value={form.arOver30} onChange={v => set("arOver30", v)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>AR >30 Days % of Total</label>
              <div style={{ padding: "7px 10px", fontSize: 13, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: arPct != null ? ragColor(vsTarget(0, arPct > 15 ? 1 : -1), false) : "var(--color-text-secondary)", fontWeight: arPct != null ? 500 : 400 }}>
                {arPct != null ? fmtPct(arPct) : "Auto-calculated"}
              </div>
            </div>
          </div>

          <SectionHead title="Utilization & Client Margin by Team" color="#00B894" />
          {teams.map((t, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr 1fr", gap: 10, alignItems: "end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Team name</label>
                  <input value={t.name} onChange={e => setTeamName(i, e.target.value)} style={{ padding: "7px 10px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
                </div>
                <Field label="Util — Current Mo. (%)" suffix="%" value={t.utilCurrent} onChange={v => setTeam(i, "utilCurrent", v)} placeholder="85" />
                <Field label="Util — Next Mo. (%)" suffix="%" value={t.utilNext} onChange={v => setTeam(i, "utilNext", v)} placeholder="85" />
                <Field label="Client Margin (%)" suffix="%" value={t.margin} onChange={v => setTeam(i, "margin", v)} placeholder="30" />
              </div>
            </div>
          ))}

          <SectionHead title="Sales Pipeline vs Target" color="#FDCB6E" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <Field label="New Business Pipeline" prefix="$" value={form.pipelineNB} onChange={v => set("pipelineNB", v)} />
            <Field label="New Business Target" prefix="$" value={form.pipelineNBTarget} onChange={v => set("pipelineNBTarget", v)} />
            <Field label="Expansion Pipeline" prefix="$" value={form.pipelineExp} onChange={v => set("pipelineExp", v)} />
            <Field label="Expansion Target" prefix="$" value={form.pipelineExpTarget} onChange={v => set("pipelineExpTarget", v)} />
          </div>

          <SectionHead title="QTD Sales Forecast" color="#FDCB6E" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Forecast — New Business" prefix="$" value={form.forecastNB} onChange={v => set("forecastNB", v)} />
            <Field label="Forecast — Expansions" prefix="$" value={form.forecastExp} onChange={v => set("forecastExp", v)} />
          </div>

          <SectionHead title="Qualified Marketing Opportunities" color="#00B894" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Qual. Marketing Opps (count)" value={form.qualOpps} onChange={v => set("qualOpps", v)} placeholder="38" />
            <Field label="Qual. Marketing Opps Target" value={form.qualOppsTarget} onChange={v => set("qualOppsTarget", v)} placeholder="45" />
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setView("dashboard")} style={{ padding: "9px 24px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-info)", background: "var(--color-background-info)", color: "var(--color-text-info)" }}>
              View Dashboard →
            </button>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {view === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Financial */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <KpiCard label="Revenue vs Target" actual={form.revenueActual} target={form.revenueTarget} />
            <KpiCard label="EBITDA vs Target" actual={form.ebitdaActual} target={form.ebitdaTarget} />
          </div>

          {/* AR */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Global AR — Aging</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
              <div><span style={{ color: "var(--color-text-secondary)" }}>Total AR </span><strong>{fmt(num(form.arTotal))}</strong></div>
              <div><span style={{ color: "var(--color-text-secondary)" }}>Over 30 days </span><strong>{fmt(num(form.arOver30))}</strong></div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>% of Total </span>
                <strong style={{ color: arPct != null ? (arPct > 20 ? "var(--color-text-danger)" : arPct > 12 ? "var(--color-text-warning)" : "var(--color-text-success)") : "var(--color-text-secondary)" }}>
                  {arPct != null ? fmtPct(arPct) : "—"}
                </strong>
              </div>
            </div>
            {arPct != null && (
              <div style={{ marginTop: 10, height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: Math.min(arPct, 100) + "%", background: arPct > 20 ? "#E17055" : arPct > 12 ? "#FDCB6E" : "#00B894", borderRadius: 4 }} />
              </div>
            )}
          </div>

          {/* Teams */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px 8px", fontSize: 12, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>Utilization & Client Margin by Team</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  {["Team", "Util — Current Mo.", "Util — Next Mo.", "Client Margin"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: h === "Team" ? "left" : "right", color: "var(--color-text-secondary)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.filter(t => t.name).map((t, i) => {
                  const cells = [
                    { val: num(t.utilCurrent), thresholds: [85, 75] },
                    { val: num(t.utilNext),    thresholds: [85, 75] },
                    { val: num(t.margin),       thresholds: [30, 20] },
                  ];
                  return (
                    <tr key={i} style={{ borderBottom: i < teams.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                      <td style={{ padding: "9px 14px", fontWeight: 500 }}>{t.name}</td>
                      {cells.map((c, j) => {
                        const good = c.val != null && c.val >= c.thresholds[0];
                        const warn = c.val != null && c.val >= c.thresholds[1];
                        const color = c.val == null ? "var(--color-text-secondary)" : good ? "var(--color-text-success)" : warn ? "var(--color-text-warning)" : "var(--color-text-danger)";
                        const bg = c.val == null ? "transparent" : good ? "var(--color-background-success)" : warn ? "var(--color-background-warning)" : "var(--color-background-danger)";
                        return (
                          <td key={j} style={{ padding: "9px 14px", textAlign: "right" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: bg, color, fontWeight: 500 }}>{c.val != null ? fmtPct(c.val) : "—"}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pipeline */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>Sales Pipeline vs Target</div>
            <PipelineBar label="New Business" value={form.pipelineNB} target={form.pipelineNBTarget} color="#6C5CE7" />
            <PipelineBar label="Expansions" value={form.pipelineExp} target={form.pipelineExpTarget} color="#00B894" />
          </div>

          {/* Forecast + Mktg */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10 }}>QTD Sales Forecast</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "var(--color-text-secondary)" }}>New Business</span><strong>{fmt(num(form.forecastNB))}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "var(--color-text-secondary)" }}>Expansions</span><strong>{fmt(num(form.forecastExp))}</strong></div>
                <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "var(--color-text-secondary)" }}>Total</span><strong>{fmt(totalForecast)}</strong></div>
              </div>
            </div>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Qualified Marketing Opps</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 500 }}>{fmtCount(num(form.qualOpps))}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>of {fmtCount(num(form.qualOppsTarget))}</span>
              </div>
              {num(form.qualOpps) != null && num(form.qualOppsTarget) != null && (() => {
                const pct = vsTarget(num(form.qualOpps), num(form.qualOppsTarget));
                return (
                  <>
                    <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                      <div style={{ height: "100%", width: Math.min((num(form.qualOpps) / num(form.qualOppsTarget)) * 100, 100) + "%", background: "#FDCB6E", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4, color: ragColor(pct), fontWeight: 500 }}>{arrow(pct)} {Math.abs(pct).toFixed(1)}% vs target</div>
                  </>
                );
              })()}
            </div>
          </div>

          <button onClick={() => setView("entry")} style={{ alignSelf: "flex-start", fontSize: 12, padding: "6px 14px", cursor: "pointer", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)" }}>
            ← Back to data entry
          </button>
        </div>
      )}

      {/* ── HISTORY ── */}
      {view === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {snapshots.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "24px 0" }}>No snapshots yet. Fill in data and click "Save Weekly Snapshot" EOB Friday.</div>
          ) : (
            <>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      {["Week", "Revenue", "vs Target", "EBITDA", "vs Target", "AR >30%", "Pipeline Total"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Week" ? "left" : "right", color: "var(--color-text-secondary)", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...snapshots].reverse().map((s, i) => {
                      const rp = vsTarget(s.revActual, s.revTarget);
                      const ep = vsTarget(s.ebitdaActual, s.ebitdaTarget);
                      return (
                        <tr key={i} style={{ borderBottom: i < snapshots.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 500 }}>{s.week}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(s.revActual)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: ragColor(rp), fontWeight: 500 }}>{rp != null ? arrow(rp) + " " + Math.abs(rp).toFixed(1) + "%" : "—"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(s.ebitdaActual)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: ragColor(ep), fontWeight: 500 }}>{ep != null ? arrow(ep) + " " + Math.abs(ep).toFixed(1) + "%" : "—"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: s.arPct > 20 ? "var(--color-text-danger)" : s.arPct > 12 ? "var(--color-text-warning)" : "var(--color-text-success)", fontWeight: 500 }}>{s.arPct != null ? fmtPct(s.arPct) : "—"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(s.pipelineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {snapshots.length >= 2 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Revenue trend", data: snapshots.map(s => s.revActual), color: "#6C5CE7" },
                    { label: "AR >30% trend", data: snapshots.map(s => s.arPct), color: "#E17055" },
                  ].map(({ label, data, color }) => (
                    <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label} ({snapshots.length} weeks)</div>
                      <Sparkline data={data} color={color} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}