export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${randomUUID()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public"
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error("Upload failed", {
      message: error?.message ?? String(error),
      hasBlobToken
    });
    return NextResponse.json(
      { error: error?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
