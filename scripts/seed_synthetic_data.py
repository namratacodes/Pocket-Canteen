"""Repo-root entry point: python scripts/seed_synthetic_data.py --days 60 --to-db --reset"""
import os, subprocess, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apps", "ml-service"))
sys.exit(subprocess.call([sys.executable, "-m", "synthetic.cli", *sys.argv[1:]]))
