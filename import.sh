#!/usr/bin/env bash
rsync -rvmh --exclude-from '.importignore' --include '/detections/***/profiles/*.json' root@$REMOTE:~/double-agent/ ./
