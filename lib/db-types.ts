export type Enregistrement = {
  id: number
  n_enreg: string
  code: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  liste: string | null
  prescription: string | null
  labo: string | null
  pays: string | null
  date_init: string | null
  date_final: string | null
  type_prod: string | null
  statut: string | null
  stabilite: string | null
  annee: number | null
  source_version: string | null
  is_new_vs_previous: boolean | null
}

export type Retrait = {
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  date_retrait: string | null
  motif_retrait: string | null
}

export type NonRenouvele = {
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  date_final: string | null
}

export type SearchResult = {
  source: 'enregistrement' | 'retrait' | 'non_renouvele'
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  annee: number | null
  date_retrait: string | null
  motif_retrait: string | null
  date_final: string | null
  code_atc?: string | null
  is_critical?: boolean
  critical_class_therapeutique?: string | null
}

export type Stats = {
  total_enregistrements: number
  total_nouveautes: number
  total_retraits: number
  total_non_renouveles: number
  fabriques_algerie: number
  dci_uniques: number
  abonnes_newsletter: number
  last_version: string | null
}

export type AtcCode = {
  code: string
  parent_code: string | null
  niveau: number
  label_en: string | null
  label_fr: string | null
}

export type MedicamentDetail = {
  source: 'enregistrement' | 'retrait' | 'non_renouvele'
  id: number
  n_enreg: string | null
  code: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  liste: string | null
  prescription: string | null
  obs: string | null
  labo: string | null
  pays: string | null
  date_init: string | null
  date_final: string | null
  type_prod: string | null
  statut: string | null
  stabilite: string | null
  annee: number | null
  source_version: string | null
  is_new_vs_previous: boolean | null
  date_retrait: string | null
  motif_retrait: string | null
  code_atc: string | null
  atc_label_fr: string | null
  atc_label_en: string | null
  is_critical?: boolean
  critical_class_therapeutique?: string | null
}

export type CriticalMedicament = {
  id: number
  dci: string
  forme: string
  dosage: string
  classe_therapeutique: string | null
  source_label: string | null
  created_at: string
}
