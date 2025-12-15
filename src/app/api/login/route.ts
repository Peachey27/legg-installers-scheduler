import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "scheduler_auth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get("password")?.toString() ?? "";
    const from = formData.get("from")?.toString() ?? "/";
    const expected = process.env.SCHEDULER_PASSWORD ?? "";

    if (!expected) {
      console.error("Missing SCHEDULER_PASSWORD env var");
      return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
    }

    if (password !== expected) {
      const url = new URL("/login", req.url);
      url.searchParams.set("error", "1");
      if (from) url.searchParams.set("from", from);
      return NextResponse.redirect(url, 303);
    }

    const target = from || "/";
    const res = NextResponse.redirect(new URL(target, req.url), 303);
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production"
    });
    return res;
  } catch (error) {
    console.error("Login failed", error);
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }
}
