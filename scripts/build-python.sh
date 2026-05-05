#!/bin/bash
set -e
echo "Building Python engine..."
cd "$(dirname "$0")/../engine"
source .venv/bin/activate
pyinstaller --onedir --name aurat-engine --distpath ../python-dist --workpath ../python-build --clean main.py
echo "Python engine built to python-dist/aurat-engine/"