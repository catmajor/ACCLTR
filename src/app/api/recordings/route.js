import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const tmpDir = path.join(process.cwd(), "tmp");
    
    if (!fs.existsSync(tmpDir)) {
      return new Response(JSON.stringify({ recordings: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const files = fs.readdirSync(tmpDir)
      .filter(file => file.endsWith('.webm') || file.endsWith('.m4a'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(tmpDir, a));
        const statB = fs.statSync(path.join(tmpDir, b));
        return statB.mtime - statA.mtime; // Sort by newest first
      });

    return new Response(JSON.stringify({ recordings: files }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error listing recordings:", error);
    return new Response(JSON.stringify({ error: "Failed to list recordings" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

