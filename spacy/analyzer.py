import sys
import json
import spacy

nlp = spacy.load("xx_ent_wiki_sm")

# Read transcript from stdin
transcript = sys.stdin.read()

doc = nlp(transcript)
entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]

# Output JSON to stdout
print(json.dumps(entities))
