#!/bin/bash
set -e
echo "Building Next.js static export..."
cd "$(dirname "$0")/../ui"
npm run build
echo "Building Electron app..."
cd "$(dirname "$0")/../desktop"
npm run build
echo "Packaging..."
cd "$(dirname "$0")/.."
npx electron-builder --mac
echo "Build complete!"