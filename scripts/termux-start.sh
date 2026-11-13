#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node server/index.mjs
