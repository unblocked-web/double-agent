#!/usr/bin/env bash
scp * root@$REMOTE:~/http-headers
scp -r lib root@$REMOTE:~/http-headers
scp -r interfaces root@$REMOTE:~/http-headers
scp -r public root@$REMOTE:~/http-headers
#scp -r ../../../node_modules/@double-agent/runner root@$REMOTE:~/http-headers/node_modules/@double-agent/runner/
