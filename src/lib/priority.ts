import type { Alert, AlertStatus } from "@/lib/types";

export type PriorityInsight = {
  score: number;
  label: "critical" | "high" | "medium" | "low";
  suggestedAction: string;
  reason: string;
};

const tacticWeight: Record<Alert["tactic"], number> = {
  Execution: 10,
  "Initial Access": 10,
  "Credential Access": 12,
  "Command and Control": 12,
  Collection: 6,
  Exfiltration: 14,
  "Privilege Escalation": 11,
};

const severityWeight = {
  critical: 42,
  high: 30,
  medium: 18,
  low: 8,
} as const;

const statusWeight: Record<AlertStatus, number> = {
  open: 22,
  in_progress: 14,
  resolved: -18,
  dismissed: -24,
};

function getRecencyWeight(createdAt: string) {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 60_000));
  if (ageMinutes <= 60) return 16;
  if (ageMinutes <= 6 * 60) return 12;
  if (ageMinutes <= 24 * 60) return 8;
  if (ageMinutes <= 3 * 24 * 60) return 4;
  return 0;
}

function getSuggestedAction(score: number) {
  if (score >= 85) return "Investigate immediately";
  if (score >= 70) return "Triage next";
  if (score >= 55) return "Review soon";
  return "Queue for review";
}

function getPriorityLabel(score: number): PriorityInsight["label"] {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export function getPriorityInsight(alert: Alert): PriorityInsight {
  const recencyWeight = getRecencyWeight(alert.createdAt);
  const score = Math.max(
    0,
    Math.min(
      100,
      severityWeight[alert.severity] + statusWeight[alert.status] + recencyWeight + tacticWeight[alert.tactic],
    ),
  );

  const reasons = [
    `${alert.severity} severity`,
    alert.status === "open" ? "new status" : alert.status.replaceAll("_", " "),
    recencyWeight >= 12 ? "recent alert" : recencyWeight >= 4 ? "same-day activity" : "older alert",
    `${alert.tactic.toLowerCase()} tactic`,
  ];

  return {
    score,
    label: getPriorityLabel(score),
    suggestedAction: getSuggestedAction(score),
    reason: reasons.join(", "),
  };
}
