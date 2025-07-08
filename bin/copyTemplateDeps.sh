#!/bin/bash

# This script copies the template dependencies from the base-templates directory to the dist/stub/templates directory. 

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <template>"
  exit 1
fi

for FILE in $(ls ./base-templates/$1); do
  echo $FILE
  if [ $FILE != "configs.js" ] && [ $FILE != "template.js" ]; then
    cp ./base-templates/$1/$FILE ./dist/stub/templates/$1/$FILE
  fi
done
