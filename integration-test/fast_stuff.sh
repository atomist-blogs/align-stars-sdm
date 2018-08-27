#!/usr/bin/env bash

set -x

echo "Let's go..."

git config --global user.email "jessitron@atomist.com"
git config --global user.name "Jessica Kerr"

cd ~/atomist/atomist-blogs/align-stars-sdm/

git log -1

atomist start --local

