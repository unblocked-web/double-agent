#!/usr/bin/env bash
rsync -rvmh -e "ssh -i $HOME/.ssh/id_rsa_ulixee_digital_ocean" --exclude-from '.importignore' root@$REMOTE:~/double-agent/profiler/data ./profiler
