import fs from "fs";
import path from "path";

export async function DELETE(request, { params }) {
  try {
    const filename = params.filename;
    const filepath = path.join(process.cwd(), "tmp", filename);

    if (!fs.existsSync(filepath)) {
      return new Response("File not found", { status: 404 });
    }

    fs.unlinkSync(filepath);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return new Response(JSON.stringify({ error: "Failed to delete file" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
