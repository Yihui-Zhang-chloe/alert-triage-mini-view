# Alert Triage Mini-View

A compact SOC analyst workspace built with Next.js 16, React 19, and TypeScript. It loads 200 mock alerts from `public/alerts.json` and supports combined filtering, free-text search, sorting, detail review, and in-memory status changes.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run generate:data` to regenerate the deterministic mock alert file, or `npm run build` for a production check.

## Decisions and trade-offs

- **Local state over a state library:** the view has one owner for alerts and filters, so React state keeps the update path explicit without adding dependencies.
- **JSON fixture over a mock server:** the exercise asks to load a provided file; a static JSON response closely represents that contract and keeps local setup instant.
- **Dense split-pane layout:** the queue remains visible while evidence is reviewed. Below 900px the detail view becomes a full-width drawer.
- **Client-side operations:** filtering and sorting 200 records is immediate. A production queue would move these operations server-side and use cursor pagination or virtualization.
- **Status updates are intentionally in memory:** this satisfies the requested behavior. The included API route demonstrates the production write contract but is not coupled to the demo UI.

## UX improvement

Keyboard triage lets analysts use `J/K` to move through the queue, `O/P/R` to set Open, In progress, or Resolved, and `/` to focus search. This reduces repetitive pointer movement when processing a high-volume queue. Shortcuts are disabled while form fields are focused.

## Status API and concurrency

`PATCH /api/alerts/:id/status`

```json
{ "status": "resolved", "version": 1 }
```

The route returns the incremented version. If the submitted version is stale, it returns `409 Conflict` with the current record. In a real database this becomes an atomic optimistic-lock update:

```sql
UPDATE alerts
SET status = $1, version = version + 1, updated_at = NOW()
WHERE id = $2 AND version = $3
RETURNING *;
```

No returned row means another analyst won the update. The client should fetch the latest record, show the conflicting change, and ask the analyst to confirm or retry. Production would also add authentication, authorization, an append-only audit log, validation at the API boundary, and structured observability.

## AI usage

I used an AI coding agent to scaffold the project, generate representative mock data, implement the initial UI and CSS, and run lint/build checks. I delegated repetitive component and fixture work, then reviewed the information hierarchy, narrowed the state model, chose optimistic concurrency for the API, and verified responsive behavior and keyboard edge cases. For production I would add unit tests around filter/sort reducers, API integration tests for conflicts, browser tests for keyboard flow, and validation against real alert payloads before shipping.
