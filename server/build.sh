#!/bin/sh
# Copy the app into ./public for the Worker's static assets.
set -e
cd "$(dirname "$0")"
rm -rf public && mkdir public && cp -R ../dist/. public/
