import os
import json
import logging
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from annotate_service import router as annotate_router

from dotenv import load_dotenv, find_dotenv
dotenv_file = find_dotenv(".env.local", usecwd=True)
if dotenv_file:
    # Load it but don't overwrite real env vars if they already exist
    load_dotenv(dotenv_file, override=False)
else:
    # Optional fallback to a .env file if you have one
    load_dotenv(override=False)

# ---------- Config (Google Gemini / Generative Language API) ----------
GOOGLE_GEMINI_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")  # required
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # configurable

# ---------- App ----------
app = FastAPI(title="Translator Service (Google Gemini)", version="2.0.0")
logger = logging.getLogger("translator")
logging.basicConfig(level=logging.INFO)


class InText(BaseModel):
    text: str
    target_lang: str  # e.g. "es", "fr", "en-US", "zh-TW"
    source_lang: Optional[str] = None  # optional; auto-detect if omitted


class OutText(BaseModel):
    text: str
    provider: str = "google-gemini"
    source_lang: Optional[str] = None
    target_lang: str

app.include_router(annotate_router, prefix="/api")

@app.get("/health")
def health():
    return {
        "ok": True,
        "provider": "google-gemini",
        "has_key": bool(GOOGLE_GEMINI_API_KEY),
        "model": GEMINI_MODEL,
    }


@app.post("/translate", response_model=OutText)
async def translate(request: InText):
    if not GOOGLE_GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_GEMINI_API_KEY not set")

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="'text' must not be empty")

    target = request.target_lang.strip()
    src = request.source_lang.strip() if request.source_lang else None

    try:
        translated, detected = await _gemini_translate(text=text, target_lang=target, source_lang=src)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Translation failed")
        raise HTTPException(status_code=502, detail=str(e))

    if not translated:
        raise HTTPException(status_code=502, detail="Provider returned empty text")

    return OutText(text=translated, source_lang=detected or src, target_lang=target)


# ---------- Google Gemini translation ----------
async def _gemini_translate(text: str, target_lang: str, source_lang: Optional[str]):
    """
    Use Google's Generative Language API (Gemini) to translate text.
    We instruct the model to return strict JSON so we can parse reliably.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    params = {"key": GOOGLE_GEMINI_API_KEY}

    system_rules = (
        "You are a translation engine. Translate user text to the requested target language.\n"
        "- Output ONLY JSON with keys: translated_text, detected_language.\n"
        "- Preserve meaning, tone, and named entities.\n"
        "- Do not add explanations, notes, or extra text.\n"
        "- If source language is provided, use it; otherwise detect it.\n"
        "- Keep URLs and code as-is.\n"
    )

    # Build a single prompt instructing for strict JSON output
    # We also set response_mime_type to application/json to nudge structured output.
    prompt = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"{system_rules}\n"
                            f"Target language (BCP-47): {target_lang}\n"
                            f"Source language (optional): {source_lang or 'AUTO'}\n"
                            "Return JSON only.\n"
                            "Example:\n"
                            '{"translated_text":"...", "detected_language":"en"}\n'
                            "-----\n"
                            "TEXT START\n"
                            f"{text}\n"
                            "TEXT END"
                        )
                    }
                ],
            }
        ],
        "generationConfig": {
            # Ask for JSON back
            "response_mime_type": "application/json"
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, params=params, json=prompt)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini {resp.status_code}: {resp.text}")

    data = resp.json()
    # Typical shape: { "candidates":[{ "content":{ "parts":[{"text":"{...json...}"}] } }] }
    candidates = data.get("candidates") or []
    if not candidates:
        raise HTTPException(status_code=502, detail="Gemini returned no candidates")

    part_text = ""
    try:
        part_text = candidates[0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected Gemini response format")

    # Some models sometimes wrap JSON in code fences; strip if present
    cleaned = _strip_code_fences(part_text)

    try:
        obj = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("Non-JSON response from Gemini: %s", part_text[:500])
        raise HTTPException(status_code=502, detail="Gemini did not return valid JSON")

    translated = (obj.get("translated_text") or "").strip()
    detected = (obj.get("detected_language") or "").strip() or None
    return translated, detected


def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        # remove first fence
        s = s.split("\n", 1)[-1]
        # remove closing fence if any
        if s.endswith("```"):
            s = s.rsplit("\n", 1)[0]
    return s.strip()
