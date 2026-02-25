#!/usr/bin/env python3
"""
PharmaVeille DZ — Setup PostgreSQL local automatique
Lance ce script UNE FOIS avant de démarrer le projet.

Usage:
    python scripts/setup_local_db.py

Ce qu'il fait:
    1. Vérifie que PostgreSQL est installé et tourne
    2. Crée la base de données 'pharmaveille'
    3. Applique le schéma SQL (tables, index, vues)
    4. Propose de charger les données si tu as les XLSX
    5. Génère le fichier .env.local
"""

import os
import sys
import subprocess
import getpass
import platform
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ─── COULEURS TERMINAL ────────────────────────────────────────
def c(text, color):
    codes = {'green': '\033[92m', 'red': '\033[91m', 'yellow': '\033[93m',
             'blue': '\033[94m', 'bold': '\033[1m', 'reset': '\033[0m'}
    if platform.system() == 'Windows':
        return text  # Windows CMD ne supporte pas les codes ANSI par défaut
    return f"{codes.get(color, '')}{text}{codes['reset']}"

def ok(msg):  print(c(f'  ✓ {msg}', 'green'))
def err(msg): print(c(f'  ✗ {msg}', 'red'))
def info(msg):print(c(f'  → {msg}', 'blue'))
def warn(msg):print(c(f'  ⚠ {msg}', 'yellow'))

# ─── VÉRIFIER POSTGRESQL ──────────────────────────────────────
def check_postgres():
    print(c('\n[1/5] Vérification de PostgreSQL...', 'bold'))
    try:
        result = subprocess.run(['psql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            ok(f'PostgreSQL trouvé : {result.stdout.strip()}')
            return True
    except FileNotFoundError:
        pass

    err('PostgreSQL (psql) introuvable dans le PATH')
    print()
    system = platform.system()
    if system == 'Windows':
        print(c('  Installation Windows :', 'yellow'))
        print('  1. Télécharge : https://www.postgresql.org/download/windows/')
        print('  2. Lance l\'installateur (garde le port 5432 par défaut)')
        print('  3. Note le mot de passe que tu mets au compte "postgres"')
        print('  4. Ajoute C:\\Program Files\\PostgreSQL\\16\\bin au PATH système')
        print('  5. Relance ce script')
    elif system == 'Darwin':
        print(c('  Installation macOS :', 'yellow'))
        print('  Option A (Homebrew) : brew install postgresql@16 && brew services start postgresql@16')
        print('  Option B : https://postgresapp.com/ (le plus simple)')
    else:
        print(c('  Installation Ubuntu/Debian :', 'yellow'))
        print('  sudo apt update && sudo apt install -y postgresql postgresql-contrib')
        print('  sudo systemctl start postgresql && sudo systemctl enable postgresql')
    return False

# ─── TESTER LA CONNEXION ──────────────────────────────────────
def test_connection(user, password, host='localhost', port='5432'):
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    result = subprocess.run(
        ['psql', '-U', user, '-h', host, '-p', port, '-c', 'SELECT 1', 'postgres'],
        capture_output=True, text=True, env=env
    )
    return result.returncode == 0

# ─── CRÉER LA BASE ────────────────────────────────────────────
def create_database(user, password, dbname='pharmaveille', host='localhost', port='5432'):
    print(c(f'\n[2/5] Création de la base "{dbname}"...', 'bold'))
    env = os.environ.copy()
    env['PGPASSWORD'] = password

    # Vérifier si existe déjà
    check = subprocess.run(
        ['psql', '-U', user, '-h', host, '-p', port, '-lqt'],
        capture_output=True, text=True, env=env
    )
    if dbname in check.stdout:
        warn(f'Base "{dbname}" déjà existante → on la garde')
        return True

    result = subprocess.run(
        ['createdb', '-U', user, '-h', host, '-p', port, dbname],
        capture_output=True, text=True, env=env
    )
    if result.returncode == 0:
        ok(f'Base "{dbname}" créée')
        return True
    else:
        err(f'Erreur : {result.stderr.strip()}')
        return False

# ─── APPLIQUER LE SCHÉMA ──────────────────────────────────────
def apply_schema(user, password, dbname='pharmaveille', host='localhost', port='5432'):
    print(c('\n[3/5] Application du schéma SQL...', 'bold'))
    schema_file = ROOT / 'sql' / '01_schema.sql'
    if not schema_file.exists():
        err(f'Fichier schema introuvable : {schema_file}')
        return False

    env = os.environ.copy()
    env['PGPASSWORD'] = password

    result = subprocess.run(
        ['psql', '-U', user, '-h', host, '-p', port, '-d', dbname, '-f', str(schema_file)],
        capture_output=True, text=True, env=env
    )
    if result.returncode == 0:
        ok('Tables créées : enregistrements, retraits, non_renouveles, newsletter_subscribers, social_posts')
        ok('Index créés (trigramme pour recherche floue)')
        ok('Vue v_stats créée')
        return True
    else:
        err(f'Erreur SQL : {result.stderr[:300]}')
        return False

# ─── INGÉRER LES DONNÉES ─────────────────────────────────────
def ingest_data(database_url):
    print(c('\n[4/5] Ingestion des données XLSX...', 'bold'))
    data_dir = ROOT / 'data'

    required = ['2024.xlsx', '2025.xlsx', 'nomenclature-retrait.xlsx', 'nomenclature-non-renouveles.xlsx']
    missing = [f for f in required if not (data_dir / f).exists()]

    if missing:
        warn(f'Fichiers XLSX manquants dans {data_dir}/ :')
        for f in missing:
            print(f'     • {f}')
        info('Place tes fichiers XLSX dans le dossier data/ et relance :')
        info('python scripts/ingest_to_supabase.py')
        return False

    # Vérifier dépendances Python
    try:
        import pandas, psycopg2, openpyxl
    except ImportError as e:
        warn(f'Dépendance Python manquante : {e}')
        info('Lance : pip install psycopg2-binary pandas openpyxl')
        return False

    os.environ['DATABASE_URL'] = database_url
    result = subprocess.run(
        [sys.executable, str(ROOT / 'scripts' / 'ingest_to_supabase.py')],
        env={**os.environ, 'DATABASE_URL': database_url}
    )
    return result.returncode == 0

# ─── GÉNÉRER .env.local ───────────────────────────────────────
def generate_env(database_url):
    print(c('\n[5/5] Génération du fichier .env.local...', 'bold'))
    env_file = ROOT / '.env.local'

    if env_file.exists():
        warn('.env.local existe déjà → non écrasé')
        info(f'Vérifie que DATABASE_URL={database_url}')
        return

    import secrets
    content = f"""# PharmaVeille DZ — Configuration locale (généré automatiquement)

# ─── POSTGRESQL ───────────────────────────────────────────────
DATABASE_URL={database_url}
DATABASE_SSL=false

# ─── APP ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PharmaVeille DZ
API_SECRET_KEY={secrets.token_hex(32)}
CRON_SECRET={secrets.token_hex(16)}

# ─── RÉSEAUX SOCIAUX (remplis quand tu déploies) ──────────────
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@pharmaveille-dz.com
BREVO_SENDER_NAME=PharmaVeille DZ
BREVO_LIST_ID=1
FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
"""
    env_file.write_text(content)
    ok('.env.local créé')

# ─── MAIN ─────────────────────────────────────────────────────
def main():
    print(c('╔══════════════════════════════════════════════╗', 'blue'))
    print(c('║   PharmaVeille DZ — Setup PostgreSQL local   ║', 'blue'))
    print(c('╚══════════════════════════════════════════════╝', 'blue'))

    if not check_postgres():
        sys.exit(1)

    print(c('\n  Connexion PostgreSQL', 'bold'))
    host     = input('  Hôte       [localhost] : ').strip() or 'localhost'
    port     = input('  Port       [5432]      : ').strip() or '5432'
    user     = input('  Utilisateur [postgres] : ').strip() or 'postgres'
    password = getpass.getpass('  Mot de passe           : ')
    dbname   = input('  Nom de la base [pharmaveille] : ').strip() or 'pharmaveille'

    print()
    info(f'Test de connexion sur {user}@{host}:{port}...')
    if not test_connection(user, password, host, port):
        err('Impossible de se connecter à PostgreSQL')
        err('Vérifiez que PostgreSQL tourne et que le mot de passe est correct')
        sys.exit(1)
    ok('Connexion réussie !')

    database_url = f'postgresql://{user}:{password}@{host}:{port}/{dbname}'

    if not create_database(user, password, dbname, host, port):
        sys.exit(1)
    if not apply_schema(user, password, dbname, host, port):
        sys.exit(1)

    ingest_data(database_url)
    generate_env(database_url)

    print(c('\n╔══════════════════════════════════════════════╗', 'green'))
    print(c('║           Setup terminé avec succès !        ║', 'green'))
    print(c('╠══════════════════════════════════════════════╣', 'green'))
    print(c('║  Lance maintenant :                          ║', 'green'))
    print(c('║    npm install                               ║', 'green'))
    print(c('║    npm run dev                               ║', 'green'))
    print(c('║  Ouvre : http://localhost:3000               ║', 'green'))
    print(c('╚══════════════════════════════════════════════╝', 'green'))

if __name__ == '__main__':
    main()
