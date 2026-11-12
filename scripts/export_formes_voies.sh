#!/usr/bin/env bash
# Exporte deux CSV (UTF-8 avec BOM, séparateur « ; » pour Excel FR) :
#   formes_distinctes.csv  : libellé de forme tel qu'écrit dans la nomenclature + nombre de fiches
#   voies_administration.csv : voie d'administration EDQM (via medicament_terminologie) + nombre de fiches
#
# Usage : DATABASE_URL=postgres://... scripts/export_formes_voies.sh [dossier_sortie]
# Prérequis voies : sql/39_terminologies.sql appliqué et scripts/sync_terminologies.mts --apply exécuté.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL manquant}"
OUT="${1:-.}"; mkdir -p "$OUT"

export_csv() { # $1 = fichier, $2 = requête
  { printf '\xEF\xBB\xBF'; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
      -c "\copy ($2) TO STDOUT WITH (FORMAT csv, HEADER true, DELIMITER ';')"; } > "$OUT/$1"
  echo "→ $OUT/$1 ($(($(wc -l < "$OUT/$1") - 1)) lignes)"
}

export_csv formes_distinctes.csv "
  SELECT UPPER(btrim(forme)) AS forme, COUNT(*) AS nb_fiches
  FROM enregistrements
  WHERE forme IS NOT NULL AND btrim(forme) <> ''
  GROUP BY 1 ORDER BY 2 DESC, 1"

# Une fiche à plusieurs voies est comptée dans chacune ; « (non renseignée) » = fiches sans voie EDQM.
export_csv voies_administration.csv "
  SELECT COALESCE(v.label_fr, v.label_en, '(non renseignée)') AS voie_administration,
         v.code AS code_edqm, COUNT(DISTINCT e.id) AS nb_fiches
  FROM enregistrements e
  LEFT JOIN medicament_terminologie t ON t.enregistrement_id = e.id
  LEFT JOIN LATERAL unnest(CASE WHEN COALESCE(array_length(t.edqm_voies,1),0)=0
                                THEN ARRAY[NULL]::text[] ELSE t.edqm_voies END) AS x(code) ON true
  LEFT JOIN edqm_termes v ON v.code = x.code
  GROUP BY 1, 2 ORDER BY 3 DESC, 1"
