export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string | undefined>;
};

function formatAuAddress(r: NominatimResult) {
  const address = r.address ?? {};
  const parts: string[] = [];
  const streetBits = [address.house_number, address.road].filter(Boolean).join(" ");
  if (streetBits) parts.push(streetBits);
  const locality =
    address.suburb ??
    address.city_district ??
    address.town ??
    address.city ??
    address.village;
  if (locality) parts.push(locality);
  const state = address.state;
  if (state) parts.push(state);
  const postcode = address.postcode;
  if (postcode) parts.push(postcode);

  return parts.length ? parts.join(", ") : r.display_name;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("q", q);

    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "en-AU,en;q=0.9",
        "User-Agent": "LEGG Installers Scheduler (address autocomplete)"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || `Geocode failed: ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as NominatimResult[];
    const mapped = (Array.isArray(data) ? data : [])
      .filter((r) => r && typeof r.place_id === "number")
      .map((r) => ({
        id: String(r.place_id),
        label: formatAuAddress(r),
        raw: r.display_name,
        lat: r.lat != null ? Number(r.lat) : undefined,
        lng: r.lon != null ? Number(r.lon) : undefined
      }));

    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    console.error("GET /api/address-search failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
