"use client";

import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight,
  CircleDot, Clock3, FilterX, Keyboard, Search, ShieldCheck, SlidersHorizontal, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPriorityInsight } from "@/lib/priority";
import type { Alert, AlertStatus, Severity, SortDirection, SortKey } from "@/lib/types";

const severityWeight: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const statusLabels: Record<AlertStatus, string> = {
  open: "Open", in_progress: "In progress", resolved: "Resolved", dismissed: "Dismissed",
};

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

export default function AlertTriage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [status, setStatus] = useState<AlertStatus | "all">("all");
  const [source, setSource] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/alerts.json")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load alerts");
        return response.json() as Promise<Alert[]>;
      })
      .then((data) => {
        setAlerts(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const sources = useMemo(
    () => Array.from(new Set(alerts.map((alert) => alert.source))).sort(),
    [alerts],
  );

  const priorityById = useMemo(
    () => Object.fromEntries(alerts.map((alert) => [alert.id, getPriorityInsight(alert)])),
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return alerts
      .filter((alert) => {
        if (!needsAttentionOnly) return true;
        const isHighPriority = alert.severity === "critical" || alert.severity === "high";
        const isUnresolved = alert.status === "open" || alert.status === "in_progress";
        return isHighPriority && isUnresolved;
      })
      .filter((alert) => severity === "all" || alert.severity === severity)
      .filter((alert) => status === "all" || alert.status === status)
      .filter((alert) => source === "all" || alert.source === source)
      .filter((alert) => {
        if (!normalizedQuery) return true;
        return [alert.title, alert.description, alert.id, alert.asset, alert.user, alert.ipAddress]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortKey === "createdAt") comparison = Date.parse(a.createdAt) - Date.parse(b.createdAt);
        if (sortKey === "severity") comparison = severityWeight[a.severity] - severityWeight[b.severity];
        if (sortKey === "title") comparison = a.title.localeCompare(b.title);
        if (sortKey === "priority") comparison = priorityById[a.id].score - priorityById[b.id].score;
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [alerts, needsAttentionOnly, priorityById, query, severity, source, sortDirection, sortKey, status]);

  const selectedAlert = alerts.find((alert) => alert.id === selectedId) ?? null;
  const selectedPriority = selectedAlert ? priorityById[selectedAlert.id] : null;
  const activeFilterCount = [query, needsAttentionOnly, severity !== "all", status !== "all", source !== "all"].filter(Boolean).length;
  const openCount = alerts.filter((alert) => alert.status === "open" || alert.status === "in_progress").length;
  const criticalCount = alerts.filter((alert) => alert.severity === "critical" && !["resolved", "dismissed"].includes(alert.status)).length;
  const needsAttentionCount = alerts.filter((alert) => (
    (alert.severity === "critical" || alert.severity === "high")
    && (alert.status === "open" || alert.status === "in_progress")
  )).length;
  const sortDirectionLabel = sortKey === "createdAt"
    ? (sortDirection === "desc" ? "Newest first" : "Oldest first")
    : sortKey === "severity"
      ? (sortDirection === "desc" ? "High to low" : "Low to high")
      : sortKey === "priority"
        ? (sortDirection === "desc" ? "Highest first" : "Lowest first")
        : (sortDirection === "desc" ? "Z to A" : "A to Z");

  const clearFilters = () => {
    setQuery(""); setNeedsAttentionOnly(false); setSeverity("all"); setStatus("all"); setSource("all");
  };

  const changeStatus = useCallback((id: string, nextStatus: AlertStatus) => {
    setAlerts((current) => current.map((alert) => (
      alert.id === id ? { ...alert, status: nextStatus, version: alert.version + 1 } : alert
    )));
    setToast(`Alert marked ${statusLabels[nextStatus].toLowerCase()}`);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) {
        if (event.key === "Escape") target.blur();
        return;
      }
      if (event.key === "/") {
        event.preventDefault(); searchRef.current?.focus(); return;
      }
      if (!filteredAlerts.length) return;
      const currentIndex = filteredAlerts.findIndex((alert) => alert.id === selectedId);
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedId(filteredAlerts[Math.min(currentIndex + 1, filteredAlerts.length - 1)]?.id ?? filteredAlerts[0].id);
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedId(filteredAlerts[Math.max(currentIndex - 1, 0)]?.id ?? filteredAlerts[0].id);
      }
      if (selectedId && event.key.toLowerCase() === "o") changeStatus(selectedId, "open");
      if (selectedId && event.key.toLowerCase() === "p") changeStatus(selectedId, "in_progress");
      if (selectedId && event.key.toLowerCase() === "r") changeStatus(selectedId, "resolved");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeStatus, filteredAlerts, selectedId]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><ShieldCheck size={20} strokeWidth={2.3} /></div>
          <div><p className="eyebrow"><span /> SECURITY OPERATIONS</p><h1>Alert triage</h1></div>
        </div>
        <div className="header-metrics">
          <div className="metric"><span className="metric-value">{openCount}</span><span>Active</span></div>
          <div className="metric critical"><span className="metric-value">{criticalCount}</span><span>Critical</span></div>
          <div className="analyst"><span>YZ</span><div><strong>Yihui Zhang</strong><small>Tier 2 Analyst</small></div></div>
        </div>
      </header>

      <section className="filterbar" aria-label="Alert filters">
        <label className="search-box">
          <Search size={17} />
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alerts, assets, users, IPs..." />
          <kbd>/</kbd>
        </label>
        <div className="select-wrap">
          <AlertTriangle size={15} />
          <select aria-label="Filter by severity" value={severity} onChange={(event) => setSeverity(event.target.value as Severity | "all")}>
            <option value="all">All severities</option><option value="critical">Critical</option>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select><ChevronDown size={14} />
        </div>
        <div className="select-wrap">
          <CircleDot size={15} />
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as AlertStatus | "all")}>
            <option value="all">All statuses</option><option value="open">Open</option>
            <option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
          </select><ChevronDown size={14} />
        </div>
        <div className="select-wrap source-select">
          <Activity size={15} />
          <select aria-label="Filter by source" value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">All sources</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select><ChevronDown size={14} />
        </div>
        <button
          type="button"
          className={`attention-filter ${needsAttentionOnly ? "active" : ""}`}
          aria-pressed={needsAttentionOnly}
          onClick={() => setNeedsAttentionOnly((value) => !value)}
        >
          <AlertTriangle size={15} />
          <span>Needs Attention</span>
          <b>{needsAttentionCount}</b>
        </button>
        {activeFilterCount > 0 && <button className="clear-button" onClick={clearFilters}><FilterX size={15} /> Clear <span>{activeFilterCount}</span></button>}
      </section>

      <div className="workspace">
        <section className="queue-panel">
          <div className="queue-toolbar">
            <div className="queue-summary">
              <span className="live-indicator"><i /> Live queue</span>
              <p><strong>{filteredAlerts.length}</strong> alerts <span>of {alerts.length}</span></p>
            </div>
            <div className="sort-control">
              <SlidersHorizontal size={14} />
              <select aria-label="Sort alerts" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="createdAt">Date</option><option value="severity">Severity</option><option value="priority">Priority</option><option value="title">Title</option>
              </select>
              <button aria-label={`Sort direction: ${sortDirectionLabel}`} title="Reverse sort order" onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")}>
                {sortDirection === "desc" ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                <span>{sortDirectionLabel}</span>
              </button>
            </div>
          </div>

          <div className="table-head"><span>Alert</span><span>Source</span><span>Status</span><span>Detected</span><span /></div>
          <div className="alert-list" role="listbox" aria-label="Security alerts">
            {loading && <div className="empty-state"><Activity className="spin" size={24} /><strong>Loading alerts</strong></div>}
            {!loading && filteredAlerts.length === 0 && (
              <div className="empty-state"><Search size={26} /><strong>No alerts match</strong><p>Adjust or clear the current filters.</p><button onClick={clearFilters}>Clear filters</button></div>
            )}
            {filteredAlerts.map((alert) => {
              const priority = priorityById[alert.id];
              return (
              <button type="button" role="option" aria-selected={selectedId === alert.id}
                className={`alert-row ${selectedId === alert.id ? "selected" : ""}`} key={alert.id} onClick={() => setSelectedId(alert.id)}>
                <span className="alert-main"><i className={`severity-bar ${alert.severity}`} /><span><strong>{alert.title}</strong><small><b className={`severity-label ${alert.severity}`}>{alert.severity}</b><b className={`priority-chip ${priority.label}`}>P{priority.score}</b>{alert.id} / {alert.asset}</small></span></span>
                <span className="source-cell"><i>{alert.source.slice(0, 1)}</i>{alert.source}</span>
                <span><b className={`status-pill ${alert.status}`}>{statusLabels[alert.status]}</b></span>
                <span className="time-cell" title={formatDate(alert.createdAt)}>{relativeTime(alert.createdAt)}</span>
                <ChevronRight size={16} className="row-chevron" />
              </button>
            )})}
          </div>
        </section>

        <aside className={`detail-panel ${selectedAlert ? "open" : ""}`} aria-label="Alert details">
          {selectedAlert ? (
            <>
              <div className="detail-header">
                <div><span className={`severity-badge ${selectedAlert.severity}`}><AlertTriangle size={13} /> {selectedAlert.severity}</span><span className="alert-id">{selectedAlert.id}</span></div>
                <button className="close-detail" aria-label="Close details" title="Close details" onClick={() => setSelectedId(null)}><X size={18} /></button>
              </div>
              <div className="detail-scroll">
                <h2>{selectedAlert.title}</h2>
                <p className="detail-description">{selectedAlert.description}</p>
                {selectedPriority && (
                  <section className="priority-card">
                    <div className="priority-head">
                      <span className={`priority-badge ${selectedPriority.label}`}>Priority {selectedPriority.score} / 100</span>
                      <strong>{selectedPriority.suggestedAction}</strong>
                    </div>
                    <p>Priority reason: {selectedPriority.reason}</p>
                  </section>
                )}
                <div className="status-action">
                  <label htmlFor="alert-status"><span className={`status-dot ${selectedAlert.status}`} />Disposition</label>
                  <div className="detail-select">
                    <select id="alert-status" value={selectedAlert.status} onChange={(event) => changeStatus(selectedAlert.id, event.target.value as AlertStatus)}>
                      <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
                    </select><ChevronDown size={15} />
                  </div>
                </div>
                <section className="detail-section">
                  <h3>Investigation context</h3>
                  <dl>
                    <div><dt>Asset</dt><dd>{selectedAlert.asset}</dd></div><div><dt>User</dt><dd>{selectedAlert.user}</dd></div>
                    <div><dt>IP address</dt><dd className="mono">{selectedAlert.ipAddress}</dd></div><div><dt>Source</dt><dd>{selectedAlert.source}</dd></div>
                    <div><dt>MITRE tactic</dt><dd>{selectedAlert.tactic}</dd></div><div><dt>Detected</dt><dd>{formatDate(selectedAlert.createdAt)}</dd></div>
                  </dl>
                </section>
                <section className="detail-section timeline-section">
                  <h3>Activity</h3>
                  <div className="timeline-item"><span><Clock3 size={14} /></span><p><strong>Alert generated</strong><small>{formatDate(selectedAlert.createdAt)}</small></p></div>
                  {selectedAlert.version > 1 && <div className="timeline-item"><span><Check size={14} /></span><p><strong>Status updated</strong><small>By Yihui Zhang / just now</small></p></div>}
                </section>
              </div>
              <div className="keyboard-hint"><Keyboard size={15} /><span><kbd>J</kbd><kbd>K</kbd> navigate</span><span><kbd>O</kbd><kbd>P</kbd><kbd>R</kbd> disposition</span></div>
            </>
          ) : (
            <div className="detail-empty"><ShieldCheck size={30} /><strong>Select an alert</strong><p>Review evidence and update its disposition.</p></div>
          )}
        </aside>
      </div>
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
  );
}
