export const runtime = "nodejs";       // Use Node.js runtime
export const dynamic = "force-dynamic"; // Disable caching for streaming responses

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      text,
      targetLang,
      voiceId,
      modelId = "eleven_multilingual_v2",
      stability = 0.3,
      similarityBoost = 0.75,
    } = body;

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "text and targetLang are required" }),
        { status: 400 }
      );
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = voiceId || process.env.ELEVENLABS_VOICE_ID;
    const PY_TRANSLATOR_URL = process.env.PY_TRANSLATOR_URL;

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID || !PY_TRANSLATOR_URL) {
      return new Response(
        JSON.stringify({
          error: "Missing ELEVENLABS_API_KEY / VOICE_ID / PY_TRANSLATOR_URL",
        }),
        { status: 500 }
      );
    }

    // 1️⃣ Call your Python translator backend
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
    const translated = trJson.text;
    if (!translated) {
      return new Response(
        JSON.stringify({ error: "Translator returned empty text" }),
        { status: 502 }
      );
    }

    // 2️⃣ Send translated text to ElevenLabs (stream audio)
    const qs = new URLSearchParams({
      optimize_streaming_latency: "0",
      output_format: "mp3_44100_128",
    });

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        ELEVENLABS_VOICE_ID
      )}/stream?${qs.toString()}`,
      {
        method: "POST",
        headers: {
          accept: "audio/mpeg",
          "content-type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: translated,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!ttsRes.ok || !ttsRes.body) {
      const msg = await ttsRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `TTS failed: ${ttsRes.status} ${msg}` }),
        { status: 502 }
      );
    }

    // 3️⃣ Stream audio directly to the browser
    return new Response(ttsRes.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error in /api/speak-translation:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
