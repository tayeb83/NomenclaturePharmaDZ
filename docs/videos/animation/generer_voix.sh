#!/bin/bash
# Génère la voix clonée de tous les épisodes (ou de ceux passés en argument) : out/<épisode>.clone.mp4
# Prérequis : ELEVENLABS_API_KEY défini dans le terminal, voix déjà clonée (voix/voice_id.txt), ffmpeg, pip install requests.
#   export ELEVENLABS_API_KEY=ta_clé
#   ./generer_voix.sh              # tous les épisodes de out/ sans .clone.mp4
#   ./generer_voix.sh paracetamol  # un seul
cd "$(dirname "$0")" || exit 1
eps=("$@")
if [ ${#eps[@]} -eq 0 ]; then for f in out/*.subs.json; do eps+=("$(basename "$f" .subs.json)"); done; fi
ok=0; ko=0
for e in "${eps[@]}"; do
  if [ -f "out/$e.clone.mp4" ]; then echo "✓ $e : déjà généré"; continue; fi
  echo "→ $e"
  if python3 voice.py "$e" --provider elevenlabs; then ok=$((ok+1)); else ko=$((ko+1)); echo "✗ échec : $e"; fi
done
echo "Terminé : $ok généré(s), $ko échec(s)."
