#!/bin/bash

set -euxo pipefail

cd editing
npm install
npm run build
cd ..
