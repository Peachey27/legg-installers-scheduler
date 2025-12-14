export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { daySettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(daySettings);
    const map: Record<string, string | undefined> = {};
    for (const row of rows) {
      if (row.areaLabel) {
        map[row.date] = row.areaLabel;
      }
    }
    return NextResponse.json(map, { status: 200 });
  } catch (error) {
    console.error("GET /api/day-settings failed", error);
    return NextResponse.json({ error: "Failed to load day settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const date: string | undefined = body?.date;
    const label: string | undefined = body?.label;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    if (!label || !label.trim()) {
      await db.delete(daySettings).where(eq(daySettings.date, date));
      return NextResponse.json({ ok: true });
    }

    await db
      .insert(daySettings)
      .values({ date, areaLabel: label.trim() })
      .onConflictDoUpdate({
        target: daySettings.date,
        set: { areaLabel: label.trim() }
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/day-settings failed", error);
    return NextResponse.json({ error: "Failed to save day setting" }, { status: 500 });
  }
}
