"""Verdicts d'affichage des PDF du portail ANPP à partir des en-têtes HTTP."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from check_rcp_portal import analyse  # noqa: E402


class Verdicts(unittest.TestCase):
    def test_portail_ouvert(self):
        r = analyse({"Content-Type": "application/pdf", "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*"})
        self.assertTrue(r["iframe_ok"] and r["pdfjs_ok"] and r["ranges"])

    def test_x_frame_options_bloque_liframe(self):
        r = analyse({"X-Frame-Options": "SAMEORIGIN"})
        self.assertFalse(r["iframe_ok"])
        self.assertIn("X-Frame-Options", r["iframe_problems"][0])

    def test_frame_ancestors_restrictif(self):
        r = analyse({"Content-Security-Policy": "default-src 'self'; frame-ancestors 'self'"})
        self.assertFalse(r["iframe_ok"])

    def test_frame_ancestors_autorise_le_site(self):
        h = {"Content-Security-Policy": "frame-ancestors https://dwadz.example"}
        self.assertTrue(analyse(h, "https://dwadz.example")["iframe_ok"])
        self.assertFalse(analyse(h, "https://autre.example")["iframe_ok"])

    def test_telechargement_force(self):
        r = analyse({"Content-Disposition": 'attachment; filename="rcp.pdf"'})
        self.assertFalse(r["iframe_ok"])

    def test_sans_cors_pas_de_pdfjs(self):
        r = analyse({"Content-Type": "application/pdf"})
        self.assertFalse(r["pdfjs_ok"])
        self.assertEqual(r["pdfjs_problem"], "pas d'en-tête CORS")

    def test_cors_pour_le_site(self):
        self.assertTrue(analyse({"Access-Control-Allow-Origin": "https://dwadz.example"}, "https://dwadz.example")["pdfjs_ok"])


if __name__ == "__main__":
    unittest.main()
