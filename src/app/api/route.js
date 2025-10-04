import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio");

    if (!file) {
      return new Response(JSON.stringify({ error: "No audio uploaded" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `recording-${Date.now()}.webm`; // Keep as webm for now
    const filepath = path.join(tmpDir, filename);

    fs.writeFileSync(filepath, buffer);

    return new Response(JSON.stringify({ success: true, file: filename }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error saving audio:", error);
    return new Response(JSON.stringify({ error: "Failed to save audio" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
