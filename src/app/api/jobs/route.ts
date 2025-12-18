export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { randomUUID } from "crypto";
import { isNull } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  try {
    // Only surface active jobs; deleted rows stay hidden from the UI.
    const allJobs = await db.select().from(jobs).where(isNull(jobs.deletedAt));
    return NextResponse.json(allJobs, { status: 200 });
  } catch (error) {
    console.error("GET /api/jobs failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const today = new Date().toISOString().slice(0, 10);
    const id = randomUUID();

    let clientAddressLat =
      body.clientAddressLat != null && body.clientAddressLat !== ""
        ? Number(body.clientAddressLat)
        : null;
    let clientAddressLng =
      body.clientAddressLng != null && body.clientAddressLng !== ""
        ? Number(body.clientAddressLng)
        : null;

    if (clientAddressLat == null || clientAddressLng == null) {
      const candidateAddress =
        (typeof body.jobAddress === "string" && body.jobAddress.trim()
          ? body.jobAddress
          : null) ??
        (typeof body.clientAddress === "string" && body.clientAddress.trim()
          ? body.clientAddress
          : null);
      if (candidateAddress) {
        const geo = await geocodeAuAddress(candidateAddress);
        if (geo) {
          clientAddressLat = geo.lat;
          clientAddressLng = geo.lng;
        }
      }
    }

    const payload = {
      id,
      clientName: body.clientName ?? "",
      // Back-compat: treat "clientAddress" as the job location address.
      jobAddress: (body.jobAddress ?? body.clientAddress ?? "").toString(),
      clientAddress: (body.jobAddress ?? body.clientAddress ?? "").toString(),
      clientAddressLat: Number.isFinite(clientAddressLat as any) ? clientAddressLat : null,
      clientAddressLng: Number.isFinite(clientAddressLng as any) ? clientAddressLng : null,
      clientPhone: body.clientPhone ?? "",
      billingAddress:
        body.billingAddress ?? body.jobAddress ?? body.clientAddress ?? "",
      dateTaken: body.dateTaken ?? today,
      totalPrice: body.totalPrice ?? null,
      description: body.description ?? "",
      invoiceNumber: body.invoiceNumber ?? null,
      estimateNumber: body.estimateNumber ?? null,
      cashSaleNumber: body.cashSaleNumber ?? null,
      measurements: body.measurements ?? null,
      glassOrProductDetails: body.glassOrProductDetails ?? null,
      quotedRange: body.quotedRange ?? null,
      internalNotes: body.internalNotes ?? null,
      materialProductUpdates: Array.isArray(body.materialProductUpdates)
        ? body.materialProductUpdates
        : [],
      assignedDate: body.assignedDate ?? null,
      estimatedDurationHours: body.estimatedDurationHours ?? null,
      crew: body.crew ?? null,
      areaTag: body.areaTag ?? "Other",
      status: body.status ?? "backlog",
      factoryJobId: body.factoryJobId ?? null,
      photo1Url: body.photo1Url ?? null,
      photo2Url: body.photo2Url ?? null,
      photo3Url: body.photo3Url ?? null,
      deletedAt: null
    };

    // Basic sanity check
    const missing = ["clientName", "jobAddress", "description"].filter(
      (k) => !(payload as any)[k]
    );
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    await db.insert(jobs).values(payload);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("Create job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
