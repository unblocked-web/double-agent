#!/usr/bin/env bash
scp * root@$REMOTE:~/codecs
scp -r profiles/ root@$REMOTE:~/codecs/
scp -r interfaces/ root@$REMOTE:~/codecs/
scp -r mime root@$REMOTE:~/codecs/mime/
#scp -r ../../../node_modules/@double-agent/runner root@$REMOTE:~/codecs/node_modules/@double-agent
