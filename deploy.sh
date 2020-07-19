#!/usr/bin/env bash
rsync -avzhm -e "ssh -i $HOME/.ssh/id_rsa_ulixee_digital_ocean" --exclude-from '.rsyncignore' . root@$REMOTE:~/double-agent
