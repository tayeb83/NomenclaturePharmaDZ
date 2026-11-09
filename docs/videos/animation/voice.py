#!/usr/bin/env python3
"""Ajoute une voix off à une vidéo rendue par render.mjs (voix clonée, voix Microsoft, ou ton propre enregistrement).

  node render.mjs interaction                          # vidéo + sous-titres + out/interaction.subs.json

  # 1) Ta voix clonée (ElevenLabs) — voir voix/ENREGISTREMENT.md puis clone_voice.py
  python3 voice.py interaction --provider elevenlabs   # → out/interaction.clone.mp4

  # 2) Ton enregistrement tel quel (un seul fichier audio couvrant toute la vidéo, sans clonage)
  python3 voice.py interaction --audio mon_enregistrement.m4a   # → out/interaction.voixperso.mp4

  # 3) Voix Microsoft ar-DZ (arabe standard, peu naturelle ; pour tester le calage)
  python3 voice.py interaction                         # → out/interaction.amina.mp4

Chaque sous-titre est lu à son moment : le texte arabe affiché EST le texte lu (un champ `say` optionnel peut le remplacer). Une phrase trop longue est
accélérée (jusqu'à x1,25) ; le rapport signale celles qui dépassent encore. Les sigles latins (ANSM, ATC, N02BE01…) sont
épelés en arabe, DwaDZ devient « دوا دي زاد ». Les voix générées sont mises en cache (out/cache) : relancer ne repaie rien.

Réglages par défaut de la voix clonée : modèle eleven_v3 + lexique complet (choisis à l'écoute avec tester_accent.py, variante E).
Accent / prononciation : --lexique p (écrit en latin les noms à P : paracétamol, Doliprane, ibuprofène, aspirine) ou complet (tous les noms de médicaments) ;
voir tester_accent.py pour comparer à l'oreille avant de choisir.
ElevenLabs : clé dans ELEVENLABS_API_KEY ; identifiant de la voix via --voice-id, ELEVENLABS_VOICE_ID ou voix/voice_id.txt.
Sortie conforme aux Reels/vidéos Facebook : AAC-LC 48 kHz stéréo, index MP4 en tête (lecture rapide).
Prérequis : pip install requests edge-tts ; ffmpeg.
"""
import argparse, asyncio, hashlib, json, os, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
LETTERS = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "إيه بي سي دي إي إف جي إتش آي جاي كاي إل إم إن أو بي كيو آر إس تي يو في دبليو إكس واي زد".split()))
DIGITS = dict(zip("0123456789", "صفر واحد اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية تسعة".split()))
WORDS = {"DwaDZ": "دوا دي زاد", "DCI": "دي سي آي", "ATC": "إيه تي سي", "ANSM": "إيه إن إس إم"}


def spell(m: re.Match) -> str:
    tok = m.group(0)
    if tok in WORDS:
        return WORDS[tok]
    if tok.isupper() or any(c.isdigit() for c in tok):  # sigles et codes (ATC, N02BE01) : épelés en arabe
        return " ".join(LETTERS.get(c) or DIGITS.get(c) or c for c in tok)
    return tok  # mot latin ordinaire (paracétamol, Doliprane…) : lu tel quel par la voix


# ── Lexique de prononciation ────────────────────────────────────────────────
# Un lecteur arabe prononce ب comme « b » : « باراسيتامول » sort « barasitamol », alors qu'on dit « paracétamol » avec un P.
# Le lexique remplace des mots arabes par leur écriture latine (la voix les prononce alors à la française, avec le vrai P).
# Fichier JSON {"باراسيتامول": "paracétamol", …} ; clés sans « ال » (elle est retirée avec la préposition collée, و/ب/ك/ف/ل).
AR = "\u0621-\u063A\u0641-\u064A\u064B-\u0652\u0671"  # lettres et voyelles brèves arabes (sans la ponctuation « ، ؟ »)


def load_lexique(spec: str | None) -> dict:
    """spec : chemin, ou nom (p, complet) → voix/lexique_<nom>.json ; « aucun » ou vide : pas de lexique."""
    if spec is None:
        f = HERE / "voix" / "lexique.json"
        return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    if spec in ("", "aucun"):
        return {}
    f = Path(spec) if Path(spec).exists() else HERE / "voix" / f"lexique_{spec}.json"
    if not f.exists():
        sys.exit(f"Lexique introuvable : {spec}")
    return json.loads(f.read_text(encoding="utf-8"))


def apply_lexique(text: str, lex: dict) -> str:
    prefixes = "(?:و|ف)?(?:لل|(?:ب|ك|ل)?(?:ال)?)"  # conjonction + préposition + article, éventuellement collés
    def conj_of(pre: str) -> str:  # garde la conjonction/préposition collée, retire l'article « ال »
        return pre[:-2] if pre.endswith("ال") else pre[:-1] if pre.endswith("لل") else pre
    for word, repl in sorted(lex.items(), key=lambda kv: -len(kv[0])):
        pat = rf"(?<![{AR}])({prefixes}){re.escape(word)}(?![{AR}])"
        text = re.sub(pat, lambda m, repl=repl: f"{conj_of(m.group(1) or '')} {repl}".strip(), text)
    return text


def prepare(text: str, keep_punct: bool, lex: dict | None = None) -> str:
    if lex:
        text = apply_lexique(text, lex)
    text = re.sub(r"[A-Za-zÀ-ÿ0-9]+", spell, text)
    if keep_punct:  # voix clonée : les pauses naturelles aident, on garde la ponctuation
        text = text.replace("—", "،").replace(":", "،").replace("…", "...")
        return re.sub(r"\s+", " ", text).strip()
    # voix Microsoft : longue pause (~0,5 s) à chaque signe → on les retire
    return re.sub(r"\s+", " ", re.sub(r"[.…!؟?،,:;—\-]", " ", text)).strip()


def sh(*a) -> str:
    try:
        return subprocess.run(a, check=True, capture_output=True, text=True).stdout.strip()
    except subprocess.CalledProcessError as e:  # montrer la vraie cause (ffmpeg écrit sur stderr)
        sys.exit(f"Échec de la commande {a[0]} (code {e.returncode}) :\n{(e.stderr or '').strip()[-600:]}")
    except FileNotFoundError:
        sys.exit(f"Programme introuvable : {a[0]} (installe-le, par ex. « brew install ffmpeg » sur Mac).")


def duration(p: Path) -> float:
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)))


def eleven_voice_id(a) -> str:
    vid = a.voice_id or os.environ.get("ELEVENLABS_VOICE_ID") or ""
    f = HERE / "voix" / "voice_id.txt"
    if not vid and f.exists():
        vid = f.read_text().strip()
    if not vid:
        sys.exit("Aucun identifiant de voix : lance clone_voice.py, ou passe --voice-id / ELEVENLABS_VOICE_ID.")
    return vid


def eleven_tts(text: str, vid: str, a, dest: Path) -> None:
    import requests
    base = os.environ.get("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io")
    r = requests.post(
        f"{base}/v1/text-to-speech/{vid}", params={"output_format": "mp3_44100_128"}, timeout=120,
        headers={"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", ""), "Content-Type": "application/json"},
        json={"text": text, "model_id": a.model, "voice_settings": {
            "stability": a.stability, "similarity_boost": a.similarity, "style": 0.0, "use_speaker_boost": True,
            **({"speed": a.speed} if a.speed != 1.0 else {})}},
    )
    if r.status_code != 200:
        sys.exit(f"ElevenLabs a refusé la requête (HTTP {r.status_code}) : {r.text[:300]}")
    dest.write_bytes(r.content)


async def edge_tts_save(text: str, a, dest: Path) -> None:
    import edge_tts
    await edge_tts.Communicate(text, a.voice, rate=a.rate, proxy=os.environ.get("HTTPS_PROXY")).save(str(dest))


def synth(text: str, a, cache: Path) -> Path:
    vid = eleven_voice_id(a) if a.provider == "elevenlabs" else a.voice
    key = hashlib.sha256(json.dumps([a.provider, vid, a.model, a.stability, a.similarity, a.speed, a.rate, text]).encode()).hexdigest()[:20]
    dest = cache / f"{key}.mp3"
    if not dest.exists():
        if a.provider == "elevenlabs":
            eleven_tts(text, vid, a, dest)
        else:
            asyncio.run(edge_tts_save(text, a, dest))
    return dest


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("--provider", choices=["edge", "elevenlabs"], default="edge")
    ap.add_argument("--audio", help="ton enregistrement (un fichier couvrant toute la vidéo) : pas de synthèse")
    ap.add_argument("--voice", default="ar-DZ-AminaNeural", help="voix Microsoft (edge) : ar-DZ-AminaNeural ou ar-DZ-IsmaelNeural")
    ap.add_argument("--rate", default="+20%", help="vitesse de la voix Microsoft (utiliser --rate=-5%%)")
    ap.add_argument("--voice-id", help="identifiant de la voix clonée (ElevenLabs)")
    ap.add_argument("--model", default="eleven_v3", help="eleven_v3 (défaut, retenu à l'écoute : meilleur accent) ou eleven_multilingual_v2")
    ap.add_argument("--stability", type=float, default=0.5, help="0,5 par défaut. eleven_v3 n'accepte que 0 (créatif), 0,5 (naturel) ou 1 (robuste)")
    ap.add_argument("--similarity", type=float, default=0.8, help="0-1 : fidélité à ta voix")
    ap.add_argument("--speed", type=float, default=1.0, help="0,7–1,2 (ElevenLabs)")
    ap.add_argument("--lexique", default=None, help="prononciation : chemin ou nom (p, complet) de voix/lexique_<nom>.json ; « aucun » pour désactiver (défaut : voix/lexique.json s'il existe)")
    ap.add_argument("--out", default=str(HERE / "out"))
    a = ap.parse_args()
    # Lexique : celui demandé ; sinon voix/lexique.json s'il existe ; sinon, pour la voix clonée, le lexique « complet » (vrai P, noms de médicaments à la française)
    lex = load_lexique(a.lexique) if a.lexique is not None else (load_lexique(None) or (load_lexique("complet") if a.provider == "elevenlabs" else {}))
    out = Path(a.out)
    meta = json.loads((out / f"{a.ep}.subs.json").read_text(encoding="utf-8"))
    video = out / f"{a.ep}.mp4"
    if not video.exists():  # vérifier AVANT de générer la voix (qui consomme des caractères)
        sys.exit(f"Vidéo introuvable : {video}\n→ remets {a.ep}.mp4 dans le dossier out/ (fichier du kit d'origine), sans remplacer le dossier entier.")
    cache = out / "cache"; cache.mkdir(parents=True, exist_ok=True)

    if a.audio:
        tag = "voixperso"
        m4a = out / f"{a.ep}.{tag}.m4a"
        sh("ffmpeg", "-y", "-loglevel", "error", "-i", a.audio, "-af", f"apad,atrim=0:{meta['duration']},loudnorm=I=-16:TP=-1.5,aresample=48000", "-ac", "2", "-ar", "48000", "-c:a", "aac", "-b:a", "128k", str(m4a))
        report = []
    else:
        tag = "clone" if a.provider == "elevenlabs" else a.voice.split("-")[2].replace("Neural", "").lower()
        segs, report = [], []
        for i, s in enumerate(meta["subs"]):
            text = prepare(s.get("say") or " ".join(s["ar"]), keep_punct=a.provider == "elevenlabs", lex=lex)
            mp3 = synth(text, a, cache)
            d, slot = duration(mp3), s["end"] - s["start"] - 0.25
            tempo = max(1.0, min(d / slot, 1.25))
            if d / tempo > slot + 0.05:
                report.append(f"  ⚠ segment {i + 1} ({s['start']}–{s['end']} s) : voix {d / tempo:.1f} s pour {slot:.1f} s → raccourcir le texte arabe de ce sous-titre")
            segs.append((mp3, s["start"] + 0.12, tempo))
        ins, filt, labels = [], [], []
        for i, (mp3, st, tempo) in enumerate(segs):
            ins += ["-i", str(mp3)]
            ms = int(st * 1000)
            filt.append(f"[{i}:a]aresample=44100,atempo={tempo:.3f},adelay={ms}|{ms}[a{i}]")
            labels.append(f"[a{i}]")
        filt.append("".join(labels) + f"amix=inputs={len(segs)}:normalize=0:dropout_transition=0,apad,atrim=0:{meta['duration']},loudnorm=I=-16:TP=-1.5,aresample=48000[v]")
        m4a = out / f"{a.ep}.{tag}.m4a"
        sh("ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(filt), "-map", "[v]", "-ac", "2", "-ar", "48000", "-c:a", "aac", "-b:a", "128k", str(m4a))

    res = out / f"{a.ep}.{tag}.mp4"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-i", str(m4a), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(res))
    print("Voix :", "ton enregistrement" if a.audio else (("elevenlabs · voix clonée " + eleven_voice_id(a)) if a.provider == "elevenlabs" else ("Microsoft " + a.voice)), "·", res)
    print("\n".join(report) if report else "Tous les segments tiennent dans leur créneau.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
