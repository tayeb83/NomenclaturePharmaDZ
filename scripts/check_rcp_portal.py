#!/usr/bin/env python3
"""
Vérifie ce que le portail de l'ANPP (https://rcp.anpp.dz/) autorise avant de
construire le lecteur de RCP dans les fiches :

  1. Affichage d'un PDF dans une page de DwaDZ (iframe / <object>) : bloqué si le
     portail envoie X-Frame-Options, un frame-ancestors restrictif, ou force le
     téléchargement (Content-Disposition: attachment).
  2. Lecture du PDF par le navigateur du visiteur avec pdf.js (pour surligner et
     se déplacer de rubrique en rubrique) : nécessite l'en-tête CORS
     Access-Control-Allow-Origin, et les requêtes par plages (Accept-Ranges).
  3. robots.txt du portail.

Un seul petit échantillon est demandé (3 PDF, 1 Ko chacun).

Usage :
    python scripts/check_rcp_portal.py resultats.json
    python scripts/check_rcp_portal.py resultats.json --site https://dwadz.example   # votre domaine
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PORTAL = "https://rcp.anpp.dz/"
UA = "DwaDZ-verification-portail/1.0"


def analyse(headers: dict[str, str], site: str | None = None) -> dict:
    """Verdicts à partir des en-têtes d'une réponse PDF (clés en minuscules)."""
    h = {k.lower(): v for k, v in headers.items()}
    xfo = h.get("x-frame-options", "").strip().upper()
    csp = h.get("content-security-policy", "")
    fa = re.search(r"frame-ancestors\s+([^;]+)", csp, re.IGNORECASE)
    frame_ancestors = fa.group(1).strip() if fa else ""
    attachment = h.get("content-disposition", "").lower().startswith("attachment")
    acao = h.get("access-control-allow-origin", "").strip()

    iframe_problems = []
    if xfo in ("DENY", "SAMEORIGIN") or xfo.startswith("ALLOW-FROM"):
        iframe_problems.append(f"X-Frame-Options: {xfo}")
    if frame_ancestors and not (frame_ancestors == "*" or (site and site in frame_ancestors.split())):
        iframe_problems.append(f"frame-ancestors {frame_ancestors}")
    if attachment:
        iframe_problems.append("Content-Disposition: attachment (le navigateur télécharge au lieu d'afficher)")

    cors_ok = acao == "*" or bool(site and acao == site)
    return {
        "iframe_ok": not iframe_problems,
        "iframe_problems": iframe_problems,
        "pdfjs_ok": cors_ok,
        "pdfjs_problem": "" if cors_ok else (f"Access-Control-Allow-Origin: {acao}" if acao else "pas d'en-tête CORS"),
        "ranges": h.get("accept-ranges", "").lower() == "bytes" or "content-range" in h,
    }


def fetch(url: str, ranged: bool = True, timeout: int = 30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **({"Range": "bytes=0-1023"} if ranged else {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read(2048), resp.geturl()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), b"", url
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return 0, {"erreur": str(exc)}, b"", url


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("resultats", type=Path)
    ap.add_argument("--site", help="origine de DwaDZ (ex. https://dwadz.example), pour juger CORS et frame-ancestors")
    ap.add_argument("-n", type=int, default=3, help="nombre de PDF testés")
    args = ap.parse_args(argv)

    entries = json.loads(args.resultats.read_text(encoding="utf-8"))
    urls = list(dict.fromkeys(e["pdf"] for e in entries if e.get("pdf")))[: args.n]

    status, _, body, _ = fetch(PORTAL + "robots.txt", ranged=False)
    print(f"robots.txt : HTTP {status}")
    print("  " + (body.decode("utf-8", "replace").strip().replace("\n", "\n  ") or "(vide)") + "\n")

    all_iframe = all_pdfjs = True
    for url in urls:
        status, headers, body, final = fetch(url)
        print(url)
        if status not in (200, 206):
            print(f"  HTTP {status} {headers.get('erreur', '')}\n")
            all_iframe = all_pdfjs = False
            continue
        r = analyse(headers, args.site)
        print(f"  HTTP {status}  type={headers.get('Content-Type')}  PDF valide={body.startswith(b'%PDF')}")
        print(f"  plages d'octets : {'oui' if r['ranges'] else 'non'}   redirigé : {'oui' if final != url else 'non'}")
        print(f"  iframe : {'OK' if r['iframe_ok'] else 'BLOQUÉ : ' + ' ; '.join(r['iframe_problems'])}")
        print(f"  pdf.js : {'OK' if r['pdfjs_ok'] else 'BLOQUÉ : ' + r['pdfjs_problem']}\n")
        all_iframe &= r["iframe_ok"]
        all_pdfjs &= r["pdfjs_ok"]

    print("Conclusion")
    print(f"  Affichage dans la fiche (iframe) : {'possible' if all_iframe else 'non, ou à vérifier'}")
    print(f"  Lecteur avec surlignage (pdf.js)  : {'possible' if all_pdfjs else 'non depuis le navigateur du visiteur'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
