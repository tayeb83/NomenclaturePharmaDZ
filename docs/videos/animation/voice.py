#!/usr/bin/env python3
"""Ajoute une voix off à une vidéo rendue par render.mjs (voix clonée, voix Microsoft, ou ton propre enregistrement).

  node render.mjs interaction                          # vidéo + sous-titres + out/interaction.subs.json

  # 1) Ta voix clonée (ElevenLabs) — voir voix/ENREGISTREMENT.md puis clone_voice.py
  python3 voice.py interaction --provider elevenlabs   # → out/interaction.clone.mp4

  # 2) Ton enregistrement tel quel (un seul fichier audio couvrant toute la vidéo, sans clonage)
  python3 voice.py interaction --audio mon_enregistrement.m4a   # → out/interaction.voixperso.mp4

  # 3) Voix Microsoft ar-DZ (arabe standard, peu naturelle ; pour tester le calage)
  python3 voice.py interaction                         # → out/interaction.amina.mp4

Chaque sous-titre est lu à son moment (champ `say` de l'épisode, sinon les lignes arabes). Une phrase trop longue est
accélérée (jusqu'à x1,25) ; le rapport signale celles qui dépassent encore. Les sigles latins (ANSM, ATC, N02BE01…) sont
épelés en arabe, DwaDZ devient « دوا دي زاد ». Les voix générées sont mises en cache (out/cache) : relancer ne repaie rien.

ElevenLabs : clé dans ELEVENLABS_API_KEY ; identifiant de la voix via --voice-id, ELEVENLABS_VOICE_ID ou voix/voice_id.txt.
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
    return " ".join(LETTERS.get(c) or DIGITS.get(c) or c for c in tok)


def prepare(text: str, keep_punct: bool) -> str:
    text = re.sub(r"[A-Za-z0-9]+", spell, text)
    if keep_punct:  # voix clonée : les pauses naturelles aident, on garde la ponctuation
        text = text.replace("—", "،").replace(":", "،").replace("…", "...")
        return re.sub(r"\s+", " ", text).strip()
    # voix Microsoft : longue pause (~0,5 s) à chaque signe → on les retire
    return re.sub(r"\s+", " ", re.sub(r"[.…!؟?،,:;—\-]", " ", text)).strip()


def sh(*a) -> str:
    return subprocess.run(a, check=True, capture_output=True, text=True).stdout.strip()


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
            "stability": a.stability, "similarity_boost": a.similarity, "style": 0.0, "use_speaker_boost": True, "speed": a.speed}},
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
    ap.add_argument("--model", default="eleven_multilingual_v2")
    ap.add_argument("--stability", type=float, default=0.5, help="0-1 : bas = plus expressif, haut = plus régulier")
    ap.add_argument("--similarity", type=float, default=0.8, help="0-1 : fidélité à ta voix")
    ap.add_argument("--speed", type=float, default=1.0, help="0,7–1,2 (ElevenLabs)")
    ap.add_argument("--out", default=str(HERE / "out"))
    a = ap.parse_args()
    out = Path(a.out)
    meta = json.loads((out / f"{a.ep}.subs.json").read_text(encoding="utf-8"))
    video = out / f"{a.ep}.mp4"
    cache = out / "cache"; cache.mkdir(parents=True, exist_ok=True)

    if a.audio:
        tag = "voixperso"
        m4a = out / f"{a.ep}.{tag}.m4a"
        sh("ffmpeg", "-y", "-loglevel", "error", "-i", a.audio, "-af", f"apad,atrim=0:{meta['duration']},loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "128k", str(m4a))
        report = []
    else:
        tag = "clone" if a.provider == "elevenlabs" else a.voice.split("-")[2].replace("Neural", "").lower()
        segs, report = [], []
        for i, s in enumerate(meta["subs"]):
            text = prepare(s.get("say") or " ".join(s["ar"]), keep_punct=a.provider == "elevenlabs")
            mp3 = synth(text, a, cache)
            d, slot = duration(mp3), s["end"] - s["start"] - 0.25
            tempo = max(1.0, min(d / slot, 1.25))
            if d / tempo > slot + 0.05:
                report.append(f"  ⚠ segment {i + 1} ({s['start']}–{s['end']} s) : voix {d / tempo:.1f} s pour {slot:.1f} s → raccourcir le texte `say`")
            segs.append((mp3, s["start"] + 0.12, tempo))
        ins, filt, labels = [], [], []
        for i, (mp3, st, tempo) in enumerate(segs):
            ins += ["-i", str(mp3)]
            ms = int(st * 1000)
            filt.append(f"[{i}:a]aresample=44100,atempo={tempo:.3f},adelay={ms}|{ms}[a{i}]")
            labels.append(f"[a{i}]")
        filt.append("".join(labels) + f"amix=inputs={len(segs)}:normalize=0:dropout_transition=0,apad,atrim=0:{meta['duration']},loudnorm=I=-16:TP=-1.5[v]")
        m4a = out / f"{a.ep}.{tag}.m4a"
        sh("ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(filt), "-map", "[v]", "-c:a", "aac", "-b:a", "128k", str(m4a))

    res = out / f"{a.ep}.{tag}.mp4"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-i", str(m4a), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", str(res))
    print("Voix :", "ton enregistrement" if a.audio else (("elevenlabs · voix clonée " + eleven_voice_id(a)) if a.provider == "elevenlabs" else ("Microsoft " + a.voice)), "·", res)
    print("\n".join(report) if report else "Tous les segments tiennent dans leur créneau.")
    return 0


sys.exit(main())
