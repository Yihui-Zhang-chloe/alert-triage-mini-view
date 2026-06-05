import { mkdir, writeFile } from "node:fs/promises";

const templates = [
  ["Suspicious PowerShell execution", "Encoded PowerShell command launched from a user-writable directory.", "Microsoft Defender", "Execution"],
  ["Impossible travel detected", "Successful sign-ins originated from geographically distant locations within 18 minutes.", "Okta", "Initial Access"],
  ["Multiple failed admin logins", "A privileged account exceeded the failed authentication threshold.", "CrowdStrike", "Credential Access"],
  ["Outbound connection to known C2", "A workstation contacted infrastructure associated with command-and-control activity.", "Palo Alto", "Command and Control"],
  ["Mailbox forwarding rule created", "A new external forwarding rule was added to an executive mailbox.", "Microsoft 365", "Collection"],
  ["Unsigned binary launched", "An unsigned executable started from the temporary downloads directory.", "SentinelOne", "Execution"],
  ["Large cloud storage download", "A user downloaded an unusual volume of files from a sensitive project folder.", "Google Workspace", "Exfiltration"],
  ["DNS tunneling pattern", "A host generated high-entropy DNS queries at a regular interval.", "Cisco Umbrella", "Command and Control"],
  ["New local administrator", "A standard user was added to the local Administrators group.", "Windows Event Log", "Privilege Escalation"],
  ["Endpoint malware quarantined", "A known credential-stealing payload was blocked and quarantined.", "CrowdStrike", "Execution"],
  ["Public storage bucket exposed", "A storage bucket policy changed to allow anonymous read access.", "AWS GuardDuty", "Exfiltration"],
  ["MFA fatigue activity", "A user received repeated push challenges followed by a successful approval.", "Okta", "Credential Access"],
];

const severities = ["critical", "high", "medium", "low"];
const statuses = ["open", "open", "in_progress", "resolved", "dismissed"];
const assets = ["FIN-LAP-042", "ENG-WS-118", "HR-MBP-023", "DC-API-07", "OPS-VDI-15", "CLOUD-PROD-3"];
const users = ["a.chen", "m.rodriguez", "s.patel", "j.wilson", "svc.deploy", "unknown"];
const ips = ["10.24.8.41", "172.18.4.22", "185.220.101.4", "45.83.64.11", "10.31.2.90", "91.214.124.7"];
const base = Date.parse("2026-06-05T16:30:00.000Z");

const alerts = Array.from({ length: 200 }, (_, index) => {
  const template = templates[index % templates.length];
  const duplicate = Math.floor(index / templates.length) + 1;
  return {
    id: `ALT-${String(2601 + index).padStart(4, "0")}`,
    title: `${template[0]}${duplicate > 1 ? ` / ${duplicate}` : ""}`,
    description: template[1],
    severity: severities[(index * 7 + Math.floor(index / 8)) % severities.length],
    status: statuses[(index * 3 + Math.floor(index / 11)) % statuses.length],
    source: template[2],
    createdAt: new Date(base - index * 11 * 60 * 1000).toISOString(),
    asset: assets[(index * 5) % assets.length],
    user: users[(index * 7) % users.length],
    ipAddress: ips[(index * 11) % ips.length],
    tactic: template[3],
    version: 1,
  };
});

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/alerts.json", import.meta.url), `${JSON.stringify(alerts, null, 2)}\n`);
console.log(`Generated ${alerts.length} alerts.`);
