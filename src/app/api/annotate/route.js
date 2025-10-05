import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const payload = await req.json();

    const upstream = await fetch("http://127.0.0.1:8000/api/annotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const bodyText = await upstream.text();
    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: `Proxy failed: ${err?.message || "unknown"}` }, { status: 502 });
  }
}
