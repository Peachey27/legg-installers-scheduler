import { NextRequest, NextResponse } from "next/server";

type Payload = {
  currentJobId: string;
  nextJobId: string;
  to: string;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
};

function formatMessage(distanceMeters?: number | null, durationSeconds?: number | null) {
  const pieces: string[] = ["The LEGG installers have completed the last job"];

  const hasDistance = typeof distanceMeters === "number" && Number.isFinite(distanceMeters);
  const hasDuration = typeof durationSeconds === "number" && Number.isFinite(durationSeconds);

  if (hasDistance || hasDuration) {
    const parts: string[] = [];
    if (hasDistance) {
      const km = distanceMeters! / 1000;
      parts.push(`${km < 10 ? km.toFixed(1) : Math.round(km)} km`);
    }
    if (hasDuration) {
      const minutes = Math.round(durationSeconds! / 60);
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      parts.push(h > 0 ? `${h}h ${m}m` : `${minutes} min`);
    }
    pieces.push(`and are ${parts.join(" & ")} away from arriving.`);
  } else {
    pieces.push("and are on their way.");
  }

  pieces.push("Do not reply to this message. If required contact us, call 5155 3477.");

  return pieces.join(" ");
}

export async function POST(req: NextRequest) {
  const username = process.env.SMSB_USERNAME;
  const password = process.env.SMSB_PASSWORD;
  const from = process.env.SMSB_FROM;

  if (!username || !password) {
    return NextResponse.json({ error: "SMS credentials missing" }, { status: 500 });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.to?.trim()) {
    return NextResponse.json({ error: "Missing recipient number" }, { status: 400 });
  }

  const message = formatMessage(body.distanceMeters, body.durationSeconds);

  // SMSBroadcast API docs: https://app.smsbroadcast.com.au/api-adv.php
  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);
  form.set("to", body.to.trim());
  form.set("message", message);
  if (from) form.set("from", from);
  form.set("ref", `${body.currentJobId}->${body.nextJobId}`);

  try {
    const res = await fetch("https://api.smsbroadcast.com.au/api-adv.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: text || "SMS API failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, response: text });
  } catch (error) {
    console.error("POST /api/notify-next-job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
