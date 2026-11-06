#!/usr/bin/env python3
"""Ajoute une voix off arabe (voix algériennes Microsoft « ar-DZ ») à une vidéo rendue par render.mjs.

Usage :
  node render.mjs interaction                       # produit out/interaction.mp4 + out/interaction.subs.json
  python3 voice.py interaction                      # → out/interaction.<voix>.mp4 + out/interaction.<voix>.m4a
  python3 voice.py interaction --voice ar-DZ-IsmaelNeural --rate=-5%

Chaque sous-titre est lu à son moment (champ `say` de l'épisode, sinon les lignes arabes). Si une phrase
dépasse son créneau, elle est accélérée (jusqu'à x1,25) ; le rapport signale celles qui dépassent encore.
Les sigles latins (ANSM, ATC, DCI, N02BE01…) sont épelés en arabe, DwaDZ devient « دوا دي زاد ».

Prérequis : pip install edge-tts ; ffmpeg ; accès réseau à speech.platform.bing.com.
Limite : la voix est un arabe standard à accent algérien, pas du darija natif ; elle peut mal prononcer
certains mots dialectaux. Écouter chaque épisode avant publication ; sinon enregistrer sa propre voix.
"""
import argparse, asyncio, json, os, re, subprocess, sys, tempfile
from pathlib import Path

import edge_tts

HERE = Path(__file__).resolve().parent
LETTERS = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "إيه بي سي دي إي إف جي إتش آي جاي كاي إل إم إن أو بي كيو آر إس تي يو في دبليو إكس واي زد".split()))
DIGITS = dict(zip("0123456789", "صفر واحد زوج تلاتة ربعة خمسة ستة سبعة تمنية تسعة".split()))
WORDS = {"DwaDZ": "دوا دي زاد", "DCI": "دي سي آي", "ATC": "إيه تي سي", "ANSM": "إيه إن إس إم"}


def spell(m: re.Match) -> str:
    tok = m.group(0)
    if tok in WORDS:
        return WORDS[tok]
    return " ".join(LETTERS.get(c) or DIGITS.get(c) or c for c in tok)


def prepare(text: str) -> str:
    text = re.sub(r"[A-Za-z0-9]+", spell, text)
    # La voix marque une longue pause (~0,5 s) à chaque ponctuation : on la supprime pour tenir dans les créneaux.
    return re.sub(r"\s+", " ", re.sub(r"[.…!؟?،,:;—\-]", " ", text)).strip()


def sh(*a) -> str:
    return subprocess.run(a, check=True, capture_output=True, text=True).stdout.strip()


def duration(p: Path) -> float:
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)))


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("--voice", default="ar-DZ-AminaNeural", help="ar-DZ-AminaNeural (femme) ou ar-DZ-IsmaelNeural (homme)")
    ap.add_argument("--rate", default="+20%", help="vitesse de base, ex. -5%% (utiliser --rate=-5%%)")
    ap.add_argument("--out", default=str(HERE / "out"))
    a = ap.parse_args()
    out = Path(a.out)
    meta = json.loads((out / f"{a.ep}.subs.json").read_text(encoding="utf-8"))
    video = out / f"{a.ep}.mp4"
    tag = a.voice.split("-")[2].replace("Neural", "").lower()
    tmp = Path(tempfile.mkdtemp(prefix="voice_"))

    segs, report = [], []
    for i, s in enumerate(meta["subs"]):
        text = prepare(s.get("say") or " ".join(s["ar"]))
        mp3 = tmp / f"s{i:02d}.mp3"
        await edge_tts.Communicate(text, a.voice, rate=a.rate, proxy=os.environ.get("HTTPS_PROXY")).save(str(mp3))
        d, slot = duration(mp3), s["end"] - s["start"] - 0.25
        tempo = max(1.0, min(d / slot, 1.25))
        final = d / tempo
        if final > slot + 0.05:
            report.append(f"  ⚠ segment {i + 1} ({s['start']}–{s['end']} s) : voix {final:.1f} s pour {slot:.1f} s → raccourcir le texte `say`")
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
    print("Voix :", a.voice, "·", res)
    print("\n".join(report) if report else "Tous les segments tiennent dans leur créneau.")
    return 0


sys.exit(asyncio.run(main()))
