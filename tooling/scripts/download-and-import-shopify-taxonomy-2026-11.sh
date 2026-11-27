#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMPORT_DIR="${ROOT}/infrastructure/supabase/taxonomy/import"
mkdir -p "${IMPORT_DIR}"

BASE="https://github.com/Shopify/product-taxonomy/releases/download/v2026-11"
cd "${IMPORT_DIR}"

curl -fL --retry 5 --retry-delay 2 -o categories.en.json.gz "${BASE}/categories.en.json.gz"
curl -fL --retry 5 --retry-delay 2 -o attributes.en.json.gz "${BASE}/attributes.en.json.gz"
curl -fL --retry 5 --retry-delay 2 -o return_reasons.en.json.gz "${BASE}/return_reasons.en.json.gz"

cat <<'CHECKSUMS' | sha256sum --check
bd4de170a7337dc25439c14ab274ec424f68a49ff6114f79dad3f792d23ea959  categories.en.json.gz
9c25544fef220e6831ebbb01135aed916bc5933b6ca7e51b88239685e3c96246  attributes.en.json.gz
e0c6a50f472004681432d3bf8b836a564962d9103fcf60f00819779abbb0dd61  return_reasons.en.json.gz
CHECKSUMS

gzip --decompress --keep --force categories.en.json.gz
gzip --decompress --keep --force attributes.en.json.gz
gzip --decompress --keep --force return_reasons.en.json.gz

cd "${ROOT}"
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" node tooling/scripts/import-shopify-taxonomy-2026-11.mjs "${IMPORT_DIR}"
