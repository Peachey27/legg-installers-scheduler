export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeClientName } from "@/lib/normalizeClientName";

interface Params {
  params: { id: string };
}

function coerceId(idParam: string) {
  // Works for either numeric PKs or string PKs.
  const n = Number(idParam);
  if (Number.isFinite(n) && String(n) === idParam) return n;
  return idParam;
}

async function geocodeAuAddress(address: string) {
  const q = (address ?? "").trim();
  if (q.length < 3) return null;

  const normalized = q.replace(/\s+/g, " ");
  const withoutUnit = normalized
    .replace(/^\s*(unit|apt|apartment|flat|suite)\s*\d+[,\s]+/i, "")
    .replace(/^\s*#\s*\d+[,\s]+/i, "");

  const queries: string[] = [];
  for (const base of [normalized, withoutUnit]) {
    if (base) queries.push(base);

    const match = base.match(/^\s*(\d+)\s+(.*)$/);
    if (match) {
      const house = Number(match[1]);
      const rest = match[2];
      if (Number.isFinite(house) && rest) {
        for (let delta = 1; delta <= 5; delta++) {
          queries.push(`${house + delta} ${rest}`);
          if (house - delta > 0) queries.push(`${house - delta} ${rest}`);
        }
        queries.push(rest);
      }
    }
  }

  for (const query of Array.from(new Set(queries.map((s) => s.trim()).filter(Boolean)))) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "au");
      url.searchParams.set("q", query);

      const res = await fetch(url.toString(), {
        headers: {
          "Accept-Language": "en-AU,en;q=0.9",
          "User-Agent": "LEGG Installers Scheduler (job geocode)"
        },
        cache: "no-store"
      });
      if (!res.ok) continue;

      const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      const first = Array.isArray(data) ? data[0] : null;
      if (!first?.lat || !first?.lon) continue;

      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      return { lat, lng };
    } catch {
      // try next query
    }
  }

  return null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const id = coerceId(params.id) as any;

  const [job] = await db.select().from(jobs).where(eq((jobs as any).id, id));
  if (!job || job.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const id = coerceId(params.id) as any;

  try {
    const body = await req.json();

    // Load existing row first, so we only update intended fields.
    const [existing] = await db.select().from(jobs).where(eq((jobs as any).id, id));
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only allow specific fields to be updated via this endpoint.
    // This prevents drag/drop or UI state from accidentally clobbering the record.
    const updatePayload: any = {};

    // Keep clientName tidy if provided
    if (typeof body.clientName === "string") {
      updatePayload.clientName = normalizeClientName(body.clientName);
    }

    // Address sync (optional)
    if (typeof body.jobAddress === "string" && body.jobAddress.trim()) {
      updatePayload.jobAddress = body.jobAddress.trim();
      // Keep clientAddress in sync for back-compat if provided or missing.
      updatePayload.clientAddress =
        typeof body.clientAddress === "string" && body.clientAddress.trim()
          ? body.clientAddress.trim()
          : body.jobAddress.trim();
    } else if (typeof body.clientAddress === "string" && body.clientAddress.trim()) {
      updatePayload.clientAddress = body.clientAddress.trim();
    }

    // Move fields (this is the important part for your disappearing issue)
    const assignedDateProvided = Object.prototype.hasOwnProperty.call(body, "assignedDate");
    let nextAssignedDate: string | null | undefined = undefined;
    if (assignedDateProvided) {
      if (body.assignedDate === null) {
        nextAssignedDate = null;
      } else if (typeof body.assignedDate === "string") {
        const trimmed = body.assignedDate.trim();
        if (!trimmed || trimmed === "backlog") {
          nextAssignedDate = null;
        } else if (trimmed.startsWith("day:")) {
          nextAssignedDate = trimmed.slice(4).trim() || null;
        } else {
          nextAssignedDate = trimmed;
        }
      }

      if (nextAssignedDate !== undefined) {
        updatePayload.assignedDate = nextAssignedDate;
      }
    }

    if (typeof body.status === "string") {
      updatePayload.status = body.status;
    }

    if (assignedDateProvided && nextAssignedDate !== undefined) {
      const isTerminal =
        updatePayload.status === "completed" || updatePayload.status === "cancelled";
      if (nextAssignedDate) {
        if (!isTerminal) updatePayload.status = "scheduled";
      } else {
        if (!isTerminal) updatePayload.status = "backlog";
      }
    }

    // If explicitly cancelled, soft delete.
    if (updatePayload.status === "cancelled") {
      updatePayload.deletedAt = new Date().toISOString();
    }

    // Best-effort geocode if address present and coords missing
    const wantsGeo =
      (body.clientAddressLat == null || body.clientAddressLat === "" ||
        body.clientAddressLng == null || body.clientAddressLng === "") &&
      (updatePayload.jobAddress || updatePayload.clientAddress || existing.jobAddress || existing.clientAddress);

    if (wantsGeo) {
      const candidateAddress =
        (typeof updatePayload.jobAddress === "string" && updatePayload.jobAddress.trim()
          ? updatePayload.jobAddress
          : null) ??
        (typeof updatePayload.clientAddress === "string" && updatePayload.clientAddress.trim()
          ? updatePayload.clientAddress
          : null) ??
        (typeof existing.jobAddress === "string" && existing.jobAddress.trim()
          ? existing.jobAddress
          : null) ??
        (typeof existing.clientAddress === "string" && existing.clientAddress.trim()
          ? existing.clientAddress
          : null);

      if (candidateAddress) {
        const geo = await geocodeAuAddress(candidateAddress);
        if (geo) {
          updatePayload.clientAddressLat = geo.lat;
          updatePayload.clientAddressLng = geo.lng;
        }
      }
    }

    // IMPORTANT: If nothing to update, return current row
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true, job: existing });
    }

    await db.update(jobs).set(updatePayload).where(eq((jobs as any).id, id));

    const [updated] = await db.select().from(jobs).where(eq((jobs as any).id, id));
    return NextResponse.json({ ok: true, job: updated });
  } catch (error) {
    console.error("Update job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = coerceId(params.id) as any;

  await db
    .update(jobs)
    .set({ deletedAt: new Date().toISOString() } as any)
    .where(eq((jobs as any).id, id));

  return NextResponse.json({ ok: true });
}
