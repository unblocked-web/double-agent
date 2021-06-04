#!/usr/bin/env bash

CURRENT_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
SERVER_PEM="$HOME/.ssh/id_rsa_ulixee_digital_ocean"

cleanupOnExit() {
  printf "\n\nClosing node processes..."
  ssh -i "$SERVER_PEM" "root@$REMOTE" "killall node"
  printf "done!\n\n"
}

trap cleanupOnExit EXIT

rsync -avzhm -e "ssh -i $SERVER_PEM" --exclude-from '.rsyncignore' . root@$REMOTE:~/double-agent

echo "-- REMOTE SCRIPT ---------------------------------------------------------------"
ssh -i "$SERVER_PEM" "root@$REMOTE" /bin/bash << EOF
  killall node
  rm -rf /tmp/double-agent-download-data/
  cd double-agent
  source "\$HOME/.nvm/nvm.sh"
  yarn
  yarn prod
EOF
