import { NextResponse } from "next/server";
import { statuses, type AlertStatus } from "@/lib/types";

const versions = new Map<string, { status: AlertStatus; version: number }>();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json() as { status?: AlertStatus; version?: number };

  if (!body.status || !statuses.includes(body.status) || typeof body.version !== "number") {
    return NextResponse.json({ error: "status and version are required" }, { status: 400 });
  }

  const current = versions.get(id) ?? { status: "open" as const, version: 1 };
  if (body.version !== current.version) {
    return NextResponse.json(
      { error: "Alert was updated by another analyst", current },
      { status: 409 },
    );
  }

  const updated = { status: body.status, version: current.version + 1 };
  versions.set(id, updated);
  return NextResponse.json({ id, ...updated, updatedAt: new Date().toISOString() });
}
