#!/usr/bin/env bash
rsync -avzh --exclude-from '.rsyncignore' . root@$REMOTE:~/double-agent
