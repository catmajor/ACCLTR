import os, json, unicodedata, re
from typing import List, Optional, TypedDict, Tuple
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

CULTURE_TYPES = [
    "FOOD_DISH","DRINK","PERSON","GROUP_ETHNIC","HOLIDAY_FESTIVAL",
    "PRACTICE_TRADITION","ART_MUSIC_DANCE","PLACE_REGION","RELIGION",
    "LANGUAGE","OBJECT_CRAFT","OTHER",
]

# (Optional) keep a conservative whitelist of culture names
CULTURE_WHITELIST = {
    # languages / demonyms / regions (expand as needed)
    "Japanese","Chinese","Korean","Spanish","Mexican","Italian","French","Thai",
    "Turkish","Indian","Arabic","Persian","Greek","Vietnamese","Indonesian",
    "Filipino","Portuguese","Brazilian","Argentinian","Moroccan","Ethiopian",
    "Jewish","Ashkenazi","Sephardic","Andalusian","Basque","Catalan",
}

def _gemini_key() -> Optional[str]:
    return os.getenv("GOOGLE_GEMINI_API_KEY")

def _gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

class InAnnotate(BaseModel):
    text: str
    types: Optional[List[str]] = None

class Entity(TypedDict):
    text: str
    start: int
    end: int
    type: str
    culture: Optional[str]
    definition: str

class OutAnnotate(BaseModel):
    entities: List[Entity]

def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "")

def strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[-1]
        if s.endswith("```"):
            s = s.rsplit("\n", 1)[0]
    return s.strip()

def find_best_span(full: str, mention: str, approx_start: int, approx_end: int) -> Tuple[int,int]:
    """
    Find the best (start,end) of `mention` in `full`.
    1) Try exact, case-sensitive, NFC-normalized.
    2) If multiple, pick the one with minimal distance to approx_start.
    3) Fallback: case-insensitive; accent-insensitive (remove combining marks).
    """
    full_n = nfc(full)
    mention_n = nfc(mention)
    candidates = []

    # exact case-sensitive
    idx = full_n.find(mention_n)
    while idx != -1:
        candidates.append((idx, idx + len(mention_n)))
        idx = full_n.find(mention_n, idx + 1)

    # pick the nearest to approx if any
    if candidates:
        target = max(0, approx_start)
        best = min(candidates, key=lambda st: abs(st[0] - target))
        return best

    # case-insensitive
    full_l = full_n.lower()
    mention_l = mention_n.lower()
    idx = full_l.find(mention_l)
    while idx != -1:
        candidates.append((idx, idx + len(mention_l)))
        idx = full_l.find(mention_l, idx + 1)
    if candidates:
        target = max(0, approx_start)
        best = min(candidates, key=lambda st: abs(st[0] - target))
        return best

    # accent-insensitive (strip combining marks)
    def deaccent(x: str) -> str:
        return "".join(c for c in unicodedata.normalize("NFD", x) if unicodedata.category(c) != "Mn")
    full_da = deaccent(full_n).lower()
    mention_da = deaccent(mention_n).lower()
    idx = full_da.find(mention_da)
    while idx != -1:
        candidates.append((idx, idx + len(mention_da)))
        idx = full_da.find(mention_da, idx + 1)
    if candidates:
        target = max(0, approx_start)
        best = min(candidates, key=lambda st: abs(st[0] - target))
        return best

    # fallback: return the provided offsets clamped
    s = max(0, approx_start)
    e = max(s, approx_end)
    e = min(e, len(full_n))
    return (s, e)

@router.post("/annotate", response_model=OutAnnotate)
async def annotate(req: InAnnotate):
    if not _gemini_key():
        raise HTTPException(status_code=500, detail="GOOGLE_GEMINI_API_KEY not set")

    raw_text = (req.text or "")
    text = nfc(raw_text)
    if not text.strip():
        return {"entities": []}

    allowed = req.types if req.types else CULTURE_TYPES

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{_gemini_model()}:generateContent"
    params = {"key": _gemini_key()}

    system_rules = (
        "You detect culture-specific terms and return STRICT JSON only.\n"
        f"Allowed types (uppercase): {', '.join(CULTURE_TYPES)}.\n"
        "Classify into the single best type.\n"
        "Offsets must be for the EXACT substring in the provided text (start inclusive, end exclusive).\n"
        "If culture/nationality is explicit or widely established (e.g., sushi→Japanese), set 'culture'; else use null.\n"
        "Include a numeric 'confidence_culture' in [0,1]. If unsure, set culture=null and confidence_culture<=0.5.\n"
        "Keep definition to one concise sentence (~20 words), neutral tone.\n"
        "Output ONLY JSON with shape:\n"
        "{ \"entities\": [ {\"text\":\"...\",\"start\":0,\"end\":0,\"type\":\"FOOD_DISH|...|OTHER\",\"culture\":null,\"confidence_culture\":0.0,\"definition\":\"...\"} ] }"
    )
    type_hint = f"Only include entities whose type is in {allowed}.\n"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"{system_rules}\n{type_hint}"
                            "TEXT START\n"
                            f"{text}\n"
                            "TEXT END\n"
                            "Return JSON only."
                        )
                    }
                ],
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, params=params, json=payload)

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini {r.status_code}: {r.text}")

    data = r.json()
    try:
        part = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected Gemini response format")

    part = strip_code_fences(part)
    try:
        obj = json.loads(part)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini did not return valid JSON")

    raw_entities = obj.get("entities") or []
    out: List[Entity] = []

    for e in raw_entities:
        try:
            mention = nfc(str(e.get("text", "")))
            approx_start = int(e.get("start", 0))
            approx_end = int(e.get("end", 0))
            etype = str(e.get("type") or "OTHER").upper()
            if etype not in CULTURE_TYPES:
                etype = "OTHER"

            # robustly re-anchor the span in our normalized text
            s, t = find_best_span(text, mention, approx_start, approx_end)
            if s >= t or s < 0 or t > len(text):
                continue
            span = text[s:t]

            # culture gating
            culture = e.get("culture")
            conf = float(e.get("confidence_culture", 0.0)) if isinstance(e.get("confidence_culture", 0.0), (int,float)) else 0.0
            if culture:
                culture = nfc(str(culture)).strip()
            # drop dubious culture labels
            if (not culture) or (conf < 0.7) or (culture not in CULTURE_WHITELIST):
                culture = None

            definition = nfc(str(e.get("definition", ""))).strip()[:300]
            if not definition:
                continue

            out.append({
                "text": span,
                "start": s,
                "end": t,
                "type": etype,
                "culture": culture,
                "definition": definition,
            })
        except Exception:
            continue

    # de-duplicate by (start,end,type)
    seen = set()
    deduped: List[Entity] = []
    for e in out:
        key = (e["start"], e["end"], e["type"])
        if key not in seen:
            seen.add(key)
            deduped.append(e)

    return {"entities": deduped}
