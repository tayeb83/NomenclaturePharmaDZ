#!/usr/bin/env python3
"""Compare à l'oreille plusieurs réglages d'accent/prononciation sur UNE phrase (coût : ~500 caractères ElevenLabs).

  export ELEVENLABS_API_KEY=ta_clé
  python3 tester_accent.py                                  # phrase de test par défaut (noms à P : paracétamol, ibuprofène, aspirine, Doliprane)
  python3 tester_accent.py "ta phrase en arabe standard"
  python3 tester_accent.py --voice-id AUTRE_VOIX            # tester une autre voix clonée (ex. clonée depuis un échantillon en arabe standard)

Écrit out/test_accent/A…E.mp3 ; écoute-les dans l'ordre et dis ce que tu entends :
  A  texte actuel                          (ب prononcé « b » dans باراسيتامول)
  B  lexique « p »                         (paracétamol, Doliprane, ibuprofène, aspirine écrits en latin : vrai P)
  C  lexique « complet »                   (tous les noms de médicaments en latin)
  D  C + voix plus expressive (stability 0,35)
  E  C + modèle eleven_v3                  (si ton compte le permet ; sinon l'erreur est affichée)
"""
import argparse, os, sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voice as V  # noqa: E402

DEFAUT = "الدوليبران اسمٌ تجاري، والمادة الفعالة فيه الباراسيتامول. والإيبوبروفين والأسبرين من مضادات الالتهاب."


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("phrase", nargs="?", default=DEFAUT)
    ap.add_argument("--voice-id")
    ap.add_argument("--out", default=str(V.HERE / "out" / "test_accent"))
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    none, p, full = {}, V.load_lexique("p"), V.load_lexique("complet")
    base = dict(voice_id=a.voice_id, model="eleven_multilingual_v2", stability=0.5, similarity=0.8, speed=1.0)
    variantes = [
        ("A_actuel", none, base), ("B_lexique_p", p, base), ("C_lexique_complet", full, base),
        ("D_expressif", full, {**base, "stability": 0.35}), ("E_eleven_v3", full, {**base, "model": "eleven_v3", "stability": 0.5}),
    ]
    vid = V.eleven_voice_id(SimpleNamespace(**base))
    for nom, lex, params in variantes:
        texte = V.prepare(a.phrase, True, lex)
        print(f"\n[{nom}] texte envoyé : {texte}")
        try:
            V.eleven_tts(texte, vid, SimpleNamespace(**params), out / f"{nom}.mp3")
            print("  ✓", out / f"{nom}.mp3")
        except SystemExit as e:  # ex. modèle non disponible : on continue avec les autres variantes
            print("  ✗", e)
    print("\nÉcoute A → E et dis-moi lequel te convient (ou ce qui sonne encore faux).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
