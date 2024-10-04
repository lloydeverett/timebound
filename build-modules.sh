#!/bin/bash

set -euxo pipefail

cd editing
npm install
npm run build
cd ../shoelace
npm install
npm run build
cd ../yaml
npm install
npm run build
cd ..
