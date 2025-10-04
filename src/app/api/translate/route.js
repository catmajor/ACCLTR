export const runtime = "nodejs";       // Use Node.js runtime
export const dynamic = "force-dynamic"; // Disable caching for dynamic responses

export async function POST(req) {
  try {
    const body = await req.json();
    const { text, targetLang } = body;

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "text and targetLang are required" }),
        { status: 400 }
      );
    }

    const PY_TRANSLATOR_URL = process.env.PY_TRANSLATOR_URL;
    if (!PY_TRANSLATOR_URL) {
      return new Response(
        JSON.stringify({ error: "Missing PY_TRANSLATOR_URL in server environment" }),
        { status: 500 }
      );
    }

    const trRes = await fetch(PY_TRANSLATOR_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, target_lang: targetLang }),
    });

    if (!trRes.ok) {
      const msg = await trRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Translate failed: ${trRes.status} ${msg}` }),
        { status: 502 }
      );
    }

    const trJson = await trRes.json();
    const translated = trJson.text || trJson.translated_text || trJson.translation || null;
    if (!translated) {
      return new Response(
        JSON.stringify({ error: "Translator returned empty text" }),
        { status: 502 }
      );
    }

    return new Response(JSON.stringify({ text: translated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Error in /api/translate:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
