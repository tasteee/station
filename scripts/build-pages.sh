#!/usr/bin/env bash
# Assemble the GitHub Pages site:
#   /             docs (live examples + API, generated from metadata)
#   /playground/  demo editors
#   /storybook/   component workshop
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm generate
pnpm --filter docs build
pnpm --filter playground build
pnpm --filter storybook build

rm -rf _site
mkdir -p _site
cp -r apps/docs/dist/. _site/
cp -r apps/playground/dist _site/playground
cp -r apps/storybook/dist _site/storybook
touch _site/.nojekyll
echo "Pages site assembled in _site/"
