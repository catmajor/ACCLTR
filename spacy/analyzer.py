import sys
import json
import spacy
from spacy.matcher import PhraseMatcher

nlp = spacy.load("es_core_news_sm")

transcript = sys.stdin.read()

doc = nlp(transcript)
entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
print(json.dumps(entities, ensure_ascii=False))
