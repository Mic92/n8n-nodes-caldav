#!/usr/bin/env nix-shell
#!nix-shell -i bash -p nix -p coreutils -p gawk
# shellcheck shell=bash

set -exuo pipefail

cd "$(git rev-parse --show-toplevel)"

# Write an empty hash to force a hash mismatch
echo -n "" > npmDepsHash.txt

# shellcheck disable=SC2016
failedbuild=$(nix build --log-format bar-with-logs '.#packages.x86_64-linux.default' 2>&1 || true)
echo "$failedbuild"
checksum=$(echo "$failedbuild" | awk '/got:.*sha256/ { print $2 }')

if [ -z "$checksum" ]; then
  echo "Error: Could not extract checksum from build output"
  exit 1
fi

echo -n "$checksum" > npmDepsHash.txt
