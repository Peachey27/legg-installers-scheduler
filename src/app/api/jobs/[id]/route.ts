export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Params {
  params: { id: string };
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
      // ignore and try next query
    }
  }

  return null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));
  if (!job || job.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const normalizedBody: any = {
      ...body,
      materialProductUpdates: Array.isArray(body.materialProductUpdates)
        ? body.materialProductUpdates
        : []
    };

    // If the UI only sends jobAddress, keep clientAddress in sync for back-compat.
    if (
      (typeof normalizedBody.jobAddress === "string" && normalizedBody.jobAddress.trim()) &&
      (!normalizedBody.clientAddress ||
        (typeof normalizedBody.clientAddress === "string" &&
          normalizedBody.clientAddress.trim() !== normalizedBody.jobAddress.trim()))
    ) {
      normalizedBody.clientAddress = normalizedBody.jobAddress;
    }

    // Best-effort: if an address is provided but coords are missing, geocode to the closest AU match.
    if (
      normalizedBody.clientAddressLat == null ||
      normalizedBody.clientAddressLat === "" ||
      normalizedBody.clientAddressLng == null ||
      normalizedBody.clientAddressLng === ""
    ) {
      const candidateAddress =
        (typeof normalizedBody.jobAddress === "string" && normalizedBody.jobAddress.trim()
          ? normalizedBody.jobAddress
          : null) ??
        (typeof normalizedBody.clientAddress === "string" &&
        normalizedBody.clientAddress.trim()
          ? normalizedBody.clientAddress
          : null);

      if (candidateAddress) {
        const geo = await geocodeAuAddress(candidateAddress);
        if (geo) {
          normalizedBody.clientAddressLat = geo.lat;
          normalizedBody.clientAddressLng = geo.lng;
        }
      }
    }
    const updatePayload =
      normalizedBody.status === "cancelled"
        ? { ...normalizedBody, deletedAt: new Date().toISOString() }
        : normalizedBody;

    await db.update(jobs).set(updatePayload).where(eq(jobs.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await db
    .update(jobs)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(jobs.id, params.id));
  return NextResponse.json({ ok: true });
}
