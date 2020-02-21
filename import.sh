#!/usr/bin/env bash
rsync -avzh --include "profiles/*.json" root@$REMOTE:~/double-agent .
