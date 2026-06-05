export const severities = ["critical", "high", "medium", "low"] as const;
export const statuses = ["open", "in_progress", "resolved", "dismissed"] as const;

export type Severity = (typeof severities)[number];
export type AlertStatus = (typeof statuses)[number];

export type Alert = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  source: string;
  createdAt: string;
  asset: string;
  user: string;
  ipAddress: string;
  tactic: string;
  version: number;
};

export type SortKey = "createdAt" | "severity" | "title";
export type SortDirection = "asc" | "desc";
