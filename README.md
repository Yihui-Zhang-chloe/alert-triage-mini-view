# Alert Triage Mini-View

Next.js + TypeScript take-home for a SOC-style triage workflow. The page loads 200 mock alerts from `public/alerts.json` and supports queue review, filtering, detail inspection, and in-memory status changes.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Scope delivered

- Sortable and filterable alert list with severity, status, source, free-text search, and sort direction.
- Detail panel on desktop and drawer on mobile when an alert is selected.
- In-memory status update flow with immediate UI feedback.
- UX improvement: `Needs Attention` one-click filter for unresolved `critical/high` alerts. Rationale: it reduces filter setup time by surfacing the highest-priority unresolved alerts in one click.
- Derived triage priority score with a suggested next action and a priority reason, so analysts can see not just severity but also which alert should be reviewed first.
- Minimal backend shape for a real status update path: `PATCH /api/alerts/:id/status` plus optimistic concurrency using `version`.

## Key decisions and trade-offs

- I kept state local to the page because the workflow is single-page and the update path is simple.
- I used a static JSON file instead of a mock backend because the exercise explicitly centers on loading a provided dataset.
- Filtering, sorting, and the derived priority score run client-side because 200 records are small enough to keep interaction instant.
- I used a dense split layout so analysts can keep queue context visible while reviewing one alert.
- The demo updates status in memory only; the included API route is there to show how the write contract would look in a real system.

## AI coding agents

I used AI coding agents as implementation accelerators rather than as decision-makers. I defined the scope, interaction model, and acceptance criteria up front, then used AI to speed up scaffolding, mock data generation, UI iteration, and local verification. I delegated repetitive build work, but kept product and engineering judgment in the loop: I selected the final UX improvement, refined the queue behavior and visual hierarchy, rewrote the README to map cleanly to the prompt, and chose the optimistic concurrency pattern for status updates. In other words, AI helped compress execution time, while the system design, trade-off decisions, and final quality bar remained mine.

## Production follow-up

For a real system I would move filtering, sorting, pagination, and priority scoring server-side; persist alerts and status history in a database; add authentication, authorization, and an audit log; validate allowed status transitions at the API boundary; and add API/browser tests plus monitoring around conflict handling and failed updates. I would also tune the priority model with richer signals such as asset criticality, historical recurrence, analyst assignment, and suppression rules, rather than relying only on the lightweight heuristic used in this mock implementation.

Representative SQL for the status update:

```sql
UPDATE alerts
SET status = $1, version = version + 1, updated_at = NOW()
WHERE id = $2 AND version = $3
RETURNING *;
```

If no row is returned, the API should respond with `409 Conflict` so the client can refresh the latest alert state instead of overwriting another analyst's change.
