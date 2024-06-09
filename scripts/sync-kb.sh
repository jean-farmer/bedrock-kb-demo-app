#!/bin/bash

set -e -x

if [ $# -ne 2 ]; then
    echo "Usage: $0 <kb-id> <data-source-id>"
    exit 1
fi

KB_ID=$1
DS_ID=$2

aws bedrock-agent start-ingestion-job --knowledge-base-id $KB_ID --data-source-id $DS_ID