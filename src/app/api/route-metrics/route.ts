export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

type Stop = { id: string; lat: number; lng: number; name?: string };
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
  stops: Stop[];
  legs: Array<{
    fromId: string;
    toId: string;
    distanceMeters: number;
    durationSeconds: number;
  }>;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
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
      .map((s) => `${s.id}:${s.lat.toFixed(6)},${s.lng.toFixed(6)}`)
      .join("|")
  ];
  return parts.join("::");
}

function isValidStop(s: any): s is Stop {
  return (
    s &&
    typeof s.id === "string" &&
    typeof s.lat === "number" &&
    Number.isFinite(s.lat) &&
    typeof s.lng === "number" &&
    Number.isFinite(s.lng)
  );
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

  const stops = Array.isArray(body.stops) ? body.stops.filter(isValidStop) : [];
  const base = getBase();
  const baseAddress = (body.baseAddress ?? base.address).trim() || base.address;
  const basePoint = { address: baseAddress, lat: base.lat, lng: base.lng };

  if (stops.length === 0) {
    const empty: MetricsResponse = {
      base: basePoint,
      stops: [],
      legs: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const cacheKey = buildCacheKey({ ...body, stops }, basePoint);
  const hit = cache.get(cacheKey);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return NextResponse.json(hit.value, { status: 200 });
  }

  try {
    const locations = [
      [basePoint.lng, basePoint.lat],
      ...stops.map((s) => [s.lng, s.lat])
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

    const fromIds = ["base", ...stops.map((s) => s.id)];
    const toIds = [...stops.map((s) => s.id), "base"];

    for (let legIndex = 0; legIndex < stops.length + 1; legIndex++) {
      const fromMatrixIndex = legIndex; // base=0, stop1=1, ...
      const toMatrixIndex = legIndex === stops.length ? 0 : legIndex + 1;
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
      stops,
      legs,
      totalDistanceMeters,
      totalDurationSeconds
    };

    cache.set(cacheKey, { expiresAt: now + TEN_MINUTES_MS, value });
    return NextResponse.json(value, { status: 200 });
  } catch (error) {
    console.error("POST /api/route-metrics failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

