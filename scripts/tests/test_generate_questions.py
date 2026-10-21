"""
Tests du générateur de QCM (Dzair-Pharma Training).

    python3 -m unittest discover -s scripts/tests -v

Les tests purs n'ont besoin d'aucune base. Les tests de synchronisation
(`SyncTests`) tournent seulement si TEST_DATABASE_URL pointe vers une base de
TEST où sql/01, sql/04 et sql/23 sont appliqués (la table training_questions y
est vidée) :

    TEST_DATABASE_URL=postgresql://dwa:dwa@localhost:5432/dwa_test python3 -m unittest discover -s scripts/tests -v
"""

import copy
import json
import os
import random
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import generate_questions as gq  # noqa: E402
import synthetic_nomenclature as synth  # noqa: E402


def dataset() -> dict:
    return synth.build(seed=7)


class GenerationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = dataset()
        cls.ds = gq.Nomenclature(cls.data)
        cls.full, cls.report = gq.generate(cls.ds, seed=42)
        cls.sample, _ = gq.generate(cls.ds, seed=42, limit=200)

    def test_sample_of_200_covers_every_type(self):
        self.assertEqual(len(self.sample), 200)
        self.assertEqual(set(q["type"] for q in self.sample), set(gq.QUESTION_TYPES))

    def test_every_question_passes_quality_check(self):
        self.assertEqual(gq.validate_set(self.full, self.ds), [])

    def test_five_options_one_correct_no_duplicates(self):
        for q in self.full:
            self.assertEqual(len(q["options"]), 5, q["question_key"])
            self.assertEqual(len({gq.compact(o) for o in q["options"]}), 5, q["question_key"])
            self.assertIn(q["correct_index"], range(5))

    def test_questions_are_drafts_awaiting_review(self):
        for q in self.full:
            self.assertEqual(q["status"], "draft")
            self.assertTrue(q["a_valider"])
            self.assertIsNone(q["relu_par"])
            self.assertEqual(len(q["explanation"]["rationales"]), 5)
            self.assertTrue(q["explanation"]["references"])

    def test_deterministic_for_same_seed(self):
        again, _ = gq.generate(gq.Nomenclature(dataset()), seed=42)
        self.assertEqual([q["content_hash"] for q in self.full], [q["content_hash"] for q in again])

    def test_independent_of_input_row_order(self):
        shuffled = dataset()
        random.Random(1).shuffle(shuffled["enregistrements"])
        random.Random(2).shuffle(shuffled["retraits"])
        qs, _ = gq.generate(gq.Nomenclature(shuffled), seed=42)
        self.assertEqual({q["question_key"]: q["content_hash"] for q in self.full},
                         {q["question_key"]: q["content_hash"] for q in qs})

    def test_seed_changes_distractors(self):
        other, _ = gq.generate(self.ds, seed=43)
        by_key = {q["question_key"]: q["content_hash"] for q in self.full}
        differing = sum(1 for q in other if by_key.get(q["question_key"]) not in (None, q["content_hash"]))
        self.assertGreater(differing, 0)

    def test_question_keys_unique(self):
        keys = [q["question_key"] for q in self.full]
        self.assertEqual(len(keys), len(set(keys)))

    def test_dci_question_distractors_share_no_active_substance(self):
        for q in (x for x in self.full if x["type"] == "dci_from_brand"):
            correct = q["options"][q["correct_index"]]
            for i, o in enumerate(q["options"]):
                if i != q["correct_index"]:
                    self.assertFalse(gq.tokens(o, gq.DCI_STOP, 5) & gq.tokens(correct, gq.DCI_STOP, 5))

    def test_brand_does_not_leak_the_answer(self):
        for q in (x for x in self.full if x["type"] == "dci_from_brand"):
            rec = self.ds.resolve(q["source_ref"])
            self.assertFalse(gq.tokens(rec["dci"], gq.DCI_STOP, 5) & set(gq.norm(rec["nom_marque"]).split()))

    def test_explanations_only_use_database_values(self):
        """Pas de contenu pharmacologique : les phrases de gabarit ne contiennent aucun terme clinique."""
        banned = ("indication", "effet indésirable", "contre-indication", "interaction", "posologie", "traite", "soigne")
        for q in self.full:
            text = json.dumps(q["explanation"], ensure_ascii=False).lower()
            for word in banned:
                self.assertNotIn(word, text, q["question_key"])

    def test_report_lists_counts(self):
        self.assertEqual(self.report["total"], len(self.full))
        self.assertEqual(sum(self.report["by_type"].values()), len(self.full))


class VerifierDetectsDefectsTests(unittest.TestCase):
    """Le contrôle qualité doit réellement refuser les mauvaises questions."""

    @classmethod
    def setUpClass(cls):
        cls.ds = gq.Nomenclature(dataset())
        cls.qs, _ = gq.generate(cls.ds, seed=42)

    def first(self, qtype):
        return copy.deepcopy(next(q for q in self.qs if q["type"] == qtype))

    def test_duplicate_options_rejected(self):
        q = self.first("forme_dosage")
        q["options"][(q["correct_index"] + 1) % 5] = q["options"][q["correct_index"]]
        self.assertTrue(gq.verify_question(q, self.ds))

    def test_two_correct_answers_rejected(self):
        q = self.first("dci_from_brand")
        rec = self.ds.resolve(q["source_ref"])
        wrong = (q["correct_index"] + 1) % 5
        q["options"][wrong] = rec["dci"].title()  # même DCI, autre graphie : deux bonnes réponses
        errs = gq.verify_question(q, self.ds)
        self.assertTrue(any("doublon" in e or "une seule bonne réponse" in e for e in errs), errs)

    def test_wrong_correct_index_rejected(self):
        for qtype in gq.QUESTION_TYPES:
            q = self.first(qtype)
            q["correct_index"] = (q["correct_index"] + 1) % 5
            self.assertTrue(gq.verify_question(q, self.ds), qtype)

    def test_overlapping_active_substance_rejected(self):
        q = self.first("dci_from_brand")
        rec = self.ds.resolve(q["source_ref"])
        wrong = (q["correct_index"] + 1) % 5
        q["options"][wrong] = f"{rec['dci']} TRIHYDRATE"
        self.assertTrue(any("ambiguë" in e for e in gq.verify_question(q, self.ds)))

    def test_missing_option_rejected(self):
        q = self.first("labo_pays")
        q["options"] = q["options"][:4]
        self.assertTrue(gq.verify_question(q, self.ds))

    def test_published_without_reviewer_cannot_be_forged_as_draft(self):
        q = self.first("atc_classe")
        q["relu_par"] = "x"
        self.assertTrue(any("relu" in e for e in gq.verify_question(q, self.ds)))


class IneligibleSourcesTests(unittest.TestCase):
    def test_brand_with_two_dci_is_skipped(self):
        d = dataset()
        first = d["enregistrements"][0]
        other = next(r for r in d["enregistrements"] if r["dci"] != first["dci"])
        d["enregistrements"].append(dict(other, id=99999, nom_marque=first["nom_marque"]))
        ds = gq.Nomenclature(d)
        self.assertIsNone(gq.gen_dci_from_brand(ds, ds.resolve(f"enregistrements:{first['id']}"), 42))

    def test_brand_still_active_is_not_a_retrait_question(self):
        d = dataset()
        retired = d["retraits"][0]
        d["enregistrements"].append(dict(d["enregistrements"][0], id=88888, nom_marque=retired["nom_marque"], dci=retired["dci"]))
        ds = gq.Nomenclature(d)
        self.assertIsNone(gq.gen_retrait_identification(ds, ds.resolve(f"retraits:{retired['id']}"), 42))

    def test_atc_questions_skipped_without_atc_tables(self):
        d = dataset()
        d["atc_codes"], d["dci_atc"] = {}, {}
        qs, _ = gq.generate(gq.Nomenclature(d), seed=42)
        self.assertNotIn("atc_classe", {q["type"] for q in qs})
        self.assertTrue(qs)


DB_URL = os.environ.get("TEST_DATABASE_URL")


@unittest.skipUnless(DB_URL, "TEST_DATABASE_URL non défini")
class SyncTests(unittest.TestCase):
    """Régénération non destructive : le contenu relu/publié n'est jamais écrasé."""

    def setUp(self):
        import psycopg2
        os.environ["DATABASE_URL"] = DB_URL
        self.conn = psycopg2.connect(DB_URL)
        cur = self.conn.cursor()
        cur.execute("TRUNCATE training_questions RESTART IDENTITY CASCADE")
        self.conn.commit()
        self.data = dataset()

    def tearDown(self):
        cur = self.conn.cursor()
        cur.execute("TRUNCATE training_questions RESTART IDENTITY CASCADE")
        self.conn.commit()
        self.conn.close()

    def run_sync(self, data, full=True):
        ds = gq.Nomenclature(data)
        qs, _ = gq.generate(ds, seed=42)
        return gq.sync_to_db(self.conn, qs, ds, full), qs

    def rows(self):
        import psycopg2.extras
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM training_questions")
        return {r["question_key"]: r for r in cur.fetchall()}

    def test_sync_is_idempotent(self):
        s1, qs = self.run_sync(self.data)
        self.assertEqual(s1["inserted"], len(qs))
        s2, _ = self.run_sync(self.data)
        self.assertNotIn("inserted", s2)
        self.assertEqual(s2["draft_unchanged"], len(qs))
        self.assertEqual(len(self.rows()), len(qs))

    def test_published_question_is_never_overwritten(self):
        _, qs = self.run_sync(self.data)
        target = next(q for q in qs if q["type"] == "dci_from_brand")
        cur = self.conn.cursor()
        cur.execute("UPDATE training_questions SET status='published', relu_par='relecteur', relu_at=NOW(), a_valider=FALSE, stem='Énoncé corrigé à la main' WHERE question_key=%s", (target["question_key"],))
        self.conn.commit()
        # Nouvelle version de la nomenclature : une autre DCI est ajoutée / retirée → les distracteurs changent.
        changed = copy.deepcopy(self.data)
        changed["enregistrements"] = [r for r in changed["enregistrements"] if r["dci"] not in ("AMLODIPINE", "RAMIPRIL")]
        changed["version"] = "SYNTHETIQUE-TEST-2027"
        stats, _ = self.run_sync(changed)
        row = self.rows()[target["question_key"]]
        self.assertEqual(row["stem"], "Énoncé corrigé à la main")
        self.assertEqual(row["status"], "published")
        self.assertEqual(row["relu_par"], "relecteur")
        self.assertFalse(row["a_valider"])
        self.assertTrue(stats.get("draft_updated", 0) + stats.get("reviewed_marked_stale", 0) + stats.get("marked_not_regenerated", 0) > 0)

    def test_published_question_marked_stale_when_content_changes(self):
        _, qs = self.run_sync(self.data)
        changed = copy.deepcopy(self.data)
        changed["version"] = "V2"
        # On publie TOUTES les questions, puis on change la nomenclature.
        cur = self.conn.cursor()
        cur.execute("UPDATE training_questions SET status='published', relu_par='r', relu_at=NOW()")
        self.conn.commit()
        for r in changed["enregistrements"]:
            if r["dci"] == "PARACETAMOL":
                r["dci"] = "PARACETAMOL BASE"  # la source change
        self.run_sync(changed)
        old_keys = {q["question_key"] for q in qs}
        rows = {k: r for k, r in self.rows().items() if k in old_keys}
        self.assertTrue([r for r in rows.values() if r["stale"]])
        self.assertTrue(all(r["status"] == "published" for r in rows.values()))

    def test_sample_run_does_not_flag_unlisted_questions(self):
        self.run_sync(self.data)
        ds = gq.Nomenclature(self.data)
        qs, _ = gq.generate(ds, seed=42, limit=20)
        gq.sync_to_db(self.conn, qs, ds, full=False)
        self.assertFalse([r for r in self.rows().values() if r["stale"]])

    def test_full_run_marks_vanished_sources_stale_without_deleting(self):
        _, qs = self.run_sync(self.data)
        changed = copy.deepcopy(self.data)
        changed["retraits"] = []
        stats, _ = self.run_sync(changed)
        self.assertEqual(len(self.rows()), len(qs))  # rien n'est supprimé
        self.assertGreater(stats["marked_not_regenerated"], 0)

    def test_database_refuses_published_without_reviewer(self):
        import psycopg2
        self.run_sync(self.data)
        cur = self.conn.cursor()
        with self.assertRaises(psycopg2.errors.CheckViolation):
            cur.execute("UPDATE training_questions SET status='published' WHERE id = (SELECT MIN(id) FROM training_questions)")
        self.conn.rollback()

    def test_database_refuses_four_options(self):
        import psycopg2
        self.run_sync(self.data)
        cur = self.conn.cursor()
        with self.assertRaises(psycopg2.errors.CheckViolation):
            cur.execute("UPDATE training_questions SET options = '[\"a\",\"b\",\"c\",\"d\"]'::jsonb WHERE id = (SELECT MIN(id) FROM training_questions)")
        self.conn.rollback()


if __name__ == "__main__":
    unittest.main()
