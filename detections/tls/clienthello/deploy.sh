#!/usr/bin/env bash
scp *.js root@$REMOTE:~/clienthello
scp *.json root@$REMOTE:~/clienthello
scp *.lock root@$REMOTE:~/clienthello
scp -r ja3er root@$REMOTE:~/clienthello
scp -r spec root@$REMOTE:~/clienthello
scp -r lib root@$REMOTE:~/clienthello
scp -r profiles/*.js root@$REMOTE:~/clienthello/profiles
scp -r ../../../node_modules/@double-agent/runner root@$REMOTE:~/clienthello/node_modules/@double-agent
