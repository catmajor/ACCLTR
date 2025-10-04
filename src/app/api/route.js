import fs from "fs";
import path from "path";

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("audio");

  if (!file) {
    return new Response(JSON.stringify({ error: "No audio uploaded" }), { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `audio-${Date.now()}.webm`;
  const filepath = path.join(process.cwd(), "tmp", filename);

  fs.writeFileSync(filepath, buffer);

  return new Response(JSON.stringify({ success: true, file: filename }));
}
