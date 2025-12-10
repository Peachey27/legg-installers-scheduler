export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const allJobs = await db.select().from(jobs);
    return NextResponse.json(allJobs, { status: 200 });
  } catch (error) {
    console.error("GET /api/jobs failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST /api/jobs hit with body:", body);
    return NextResponse.json({ ok: true, echo: body }, { status: 201 });
  } catch (error) {
    console.error("Stubbed POST /api/jobs failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
