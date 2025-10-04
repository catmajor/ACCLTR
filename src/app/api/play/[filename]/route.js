import fs from "fs";
import path from "path";

export async function GET(request, { params }) {
  try {
    const filename = params.filename;
    const filepath = path.join(process.cwd(), "tmp", filename);

    if (!fs.existsSync(filepath)) {
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filepath);
    
    // Determine content type based on file extension
    let contentType = 'audio/webm';
    if (filename.endsWith('.m4a')) {
      contentType = 'audio/mp4';
    } else if (filename.endsWith('.webm')) {
      contentType = 'audio/webm';
    }
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error("Error serving audio file:", error);
    return new Response("Error serving file", { status: 500 });
  }
}

