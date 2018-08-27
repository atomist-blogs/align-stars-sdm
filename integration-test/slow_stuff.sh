#!/usr/bin/env bash

set -x

echo "Does this work?"

atomist --version

echo "---- THIS SHOULD PRINT HELP: ----"
atomist --help
echo "---------------------------------"

ls ~/atomist

atomist clone https://github.com/atomist-blogs/align-stars-sdm

cd ~/atomist/atomist-blogs/align-stars-sdm/

ls

npm install

echo "------ end slow parts --------"