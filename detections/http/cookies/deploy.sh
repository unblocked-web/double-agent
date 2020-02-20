#!/usr/bin/env bash
scp * root@$REMOTE:~/http-cookies
scp -r lib root@$REMOTE:~/http-cookies
scp -r interfaces root@$REMOTE:~/http-cookies
scp -r public root@$REMOTE:~/http-cookies
scp -r ../../../node_modules/@double-agent/runner root@$REMOTE:~/http-cookies/node_modules/@double-agent/runner/
