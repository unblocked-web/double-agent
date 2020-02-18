#!/usr/bin/env bash
scp * root@$REMOTE:~/audio-codecs
scp -r profiles root@$REMOTE:~/audio-codecs/profiles
scp -r interfaces root@$REMOTE:~/audio-codecs/interfaces
#scp -r ../../../node_modules/@double-agent/runner root@$REMOTE:~/audio-codecs/node_modules/@double-agent
