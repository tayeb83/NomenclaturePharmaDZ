#!/usr/bin/env python3
"""Crée le clone de TA voix chez ElevenLabs (clonage instantané) à partir de tes enregistrements.

  export ELEVENLABS_API_KEY=...                       # ta clé (ne jamais la mettre dans le dépôt)
  python3 clone_voice.py "Voix DwaDZ" voix/echantillon1.m4a voix/echantillon2.m4a
  → écrit l'identifiant dans voix/voice_id.txt (lu ensuite par voice.py)

Consentement : ne cloner que SA PROPRE voix, ou celle d'une personne qui a donné son accord écrit.
Guide d'enregistrement et texte à lire : voix/ENREGISTREMENT.md
"""
import mimetypes, os, sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent

if len(sys.argv) < 3:
    sys.exit(__doc__)
name, files = sys.argv[1], [Path(p) for p in sys.argv[2:]]
for f in files:
    if not f.exists():
        sys.exit(f"Fichier introuvable : {f}")
base = os.environ.get("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io")
handles = [open(f, "rb") for f in files]
try:
    r = requests.post(
        f"{base}/v1/voices/add", timeout=300,
        headers={"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "")},
        data={"name": name, "description": "Voix off DwaDZ (darija algérien) — voix de l'auteur, clonée avec son accord.", "remove_background_noise": "true"},
        files=[("files", (f.name, h, mimetypes.guess_type(f.name)[0] or "audio/mpeg")) for f, h in zip(files, handles)],
    )
finally:
    for h in handles:
        h.close()
if r.status_code != 200:
    sys.exit(f"ElevenLabs a refusé la requête (HTTP {r.status_code}) : {r.text[:400]}")
vid = r.json()["voice_id"]
f = HERE / "voix" / "voice_id.txt"
if f.exists() and f.read_text().strip() != vid:  # garde l'ancien identifiant pour pouvoir y revenir (voix/voice_id.<ancien>.txt)
    (HERE / "voix" / f"voice_id.ancien_{f.read_text().strip()[:8]}.txt").write_text(f.read_text())
f.write_text(vid + "\n")
print("Voix clonée. voice_id =", vid, "(enregistré dans voix/voice_id.txt)")
