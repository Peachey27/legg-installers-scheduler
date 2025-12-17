export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

type Stop = {
  id: string;
  lat?: number | null;
  lng?: number | null;
  address?: string;
  name?: string;
};
type Body = {
  date?: string;
  area?: string;
  baseAddress?: string;
  stops: Stop[];
};

type MatrixResponse = {
  distances?: number[][];
  durations?: number[][];
};

type MetricsResponse = {
  base: { address: string; lat: number; lng: number };
  stops: Array<{ id: string; lat: number; lng: number }>;
  legs: Array<{
    fromId: string;
    toId: string;
    distanceMeters: number;
    durationSeconds: number;
  }>;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  approximatedStopIds: string[];
  unresolvedStopIds: string[];
};

const TEN_MINUTES_MS = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: MetricsResponse }>();

function getBase() {
  const address =
    process.env.ORS_BASE_ADDRESS ?? "655 Esplanade, Lakes Entrance VIC";
  const lat = process.env.ORS_BASE_LAT ? Number(process.env.ORS_BASE_LAT) : -37.8766;
  const lng = process.env.ORS_BASE_LNG ? Number(process.env.ORS_BASE_LNG) : 147.9957;
  return { address, lat, lng };
}

function normalizeKeyPart(v: string | undefined) {
  return (v ?? "").trim().toLowerCase();
}

function buildCacheKey(body: Body, base: { lat: number; lng: number }) {
  const parts: string[] = [
    normalizeKeyPart(body.date),
    normalizeKeyPart(body.area),
    `${base.lat.toFixed(6)},${base.lng.toFixed(6)}`,
    (body.stops ?? [])
      .map((s) => {
        const lat =
          typeof s.lat === "number" && Number.isFinite(s.lat) ? s.lat.toFixed(6) : "";
        const lng =
          typeof s.lng === "number" && Number.isFinite(s.lng) ? s.lng.toFixed(6) : "";
        const addr = normalizeKeyPart(s.address);
        return `${s.id}:${lat},${lng}:${addr}`;
      })
      .join("|")
  ];
  return parts.join("::");
}

function isStop(s: any): s is Stop {
  return s && typeof s.id === "string";
}

async function geocodeAuAddress(address: string) {
  const q = address.trim();
  if (q.length < 3) return null;

  const normalized = q.replace(/\s+/g, " ");
  const withoutUnit = normalized
    .replace(/^\s*(unit|apt|apartment|flat|suite)\s*\d+[,\s]+/i, "")
    .replace(/^\s*#\s*\d+[,\s]+/i, "");

  const queries: string[] = [];
  for (const base of [normalized, withoutUnit]) {
    if (base) queries.push(base);

    // If a street number is present, try nearby numbers (e.g. 654 -> 655).
    const match = base.match(/^\s*(\d+)\s+(.*)$/);
    if (match) {
      const house = Number(match[1]);
      const rest = match[2];
      if (Number.isFinite(house) && rest) {
        for (let delta = 1; delta <= 5; delta++) {
          queries.push(`${house + delta} ${rest}`);
          if (house - delta > 0) queries.push(`${house - delta} ${rest}`);
        }
        // Street-only fallback (closest on the road/suburb)
        queries.push(rest);
      }
    }
  }

  for (const query of Array.from(new Set(queries.map((s) => s.trim()).filter(Boolean)))) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "en-AU,en;q=0.9",
        "User-Agent": "LEGG Installers Scheduler (route metrics geocode)"
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
  }

  return null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ORS_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inputStops = Array.isArray(body.stops) ? body.stops.filter(isStop) : [];
  const base = getBase();
  const baseAddress = (body.baseAddress ?? base.address).trim() || base.address;
  const basePoint = { address: baseAddress, lat: base.lat, lng: base.lng };

  if (inputStops.length === 0) {
    const empty: MetricsResponse = {
      base: basePoint,
      stops: [],
      legs: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      approximatedStopIds: [],
      unresolvedStopIds: []
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const cacheKey = buildCacheKey({ ...body, stops: inputStops }, basePoint);
  const hit = cache.get(cacheKey);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return NextResponse.json(hit.value, { status: 200 });
  }

  try {
    const approximatedStopIds: string[] = [];
    const unresolvedStopIds: string[] = [];
    const resolvedStops: Array<{ id: string; lat: number; lng: number }> = [];

    for (const stop of inputStops) {
      const lat =
        typeof stop.lat === "number" && Number.isFinite(stop.lat) ? stop.lat : null;
      const lng =
        typeof stop.lng === "number" && Number.isFinite(stop.lng) ? stop.lng : null;
      if (lat != null && lng != null) {
        resolvedStops.push({ id: stop.id, lat, lng });
        continue;
      }

      const addr = (stop.address ?? "").trim();
      if (!addr) {
        unresolvedStopIds.push(stop.id);
        continue;
      }

      const geo = await geocodeAuAddress(addr);
      if (!geo) {
        unresolvedStopIds.push(stop.id);
        continue;
      }
      approximatedStopIds.push(stop.id);
      resolvedStops.push({ id: stop.id, lat: geo.lat, lng: geo.lng });
    }

    if (resolvedStops.length === 0) {
      const empty: MetricsResponse = {
        base: basePoint,
        stops: [],
        legs: [],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        approximatedStopIds,
        unresolvedStopIds
      };
      cache.set(cacheKey, { expiresAt: now + TEN_MINUTES_MS, value: empty });
      return NextResponse.json(empty, { status: 200 });
    }

    const locations = [
      [basePoint.lng, basePoint.lat],
      ...resolvedStops.map((s) => [s.lng, s.lat])
    ];

    const res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        locations,
        metrics: ["distance", "duration"]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || `ORS failed: ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as MatrixResponse;
    const distances = data.distances;
    const durations = data.durations;
    if (!distances || !durations) {
      return NextResponse.json({ error: "Invalid ORS response" }, { status: 502 });
    }

    const legs: MetricsResponse["legs"] = [];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    const fromIds = ["base", ...resolvedStops.map((s) => s.id)];
    const toIds = [...resolvedStops.map((s) => s.id), "base"];

    for (let legIndex = 0; legIndex < resolvedStops.length + 1; legIndex++) {
      const fromMatrixIndex = legIndex; // base=0, stop1=1, ...
      const toMatrixIndex = legIndex === resolvedStops.length ? 0 : legIndex + 1;
      const distanceMeters = Math.round(distances[fromMatrixIndex][toMatrixIndex] ?? 0);
      const durationSeconds = Math.round(durations[fromMatrixIndex][toMatrixIndex] ?? 0);
      legs.push({
        fromId: fromIds[legIndex],
        toId: toIds[legIndex],
        distanceMeters,
        durationSeconds
      });
      totalDistanceMeters += distanceMeters;
      totalDurationSeconds += durationSeconds;
    }

    const value: MetricsResponse = {
      base: basePoint,
      stops: resolvedStops,
      legs,
      totalDistanceMeters,
      totalDurationSeconds,
      approximatedStopIds,
      unresolvedStopIds
    };

    cache.set(cacheKey, { expiresAt: now + TEN_MINUTES_MS, value });
    return NextResponse.json(value, { status: 200 });
  } catch (error) {
    console.error("POST /api/route-metrics failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
