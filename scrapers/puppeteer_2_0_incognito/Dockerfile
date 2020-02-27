FROM double-agent-scraper-base

RUN cd /app/puppeteer_2_0_incognito && yarn --frozen-lockfile

RUN chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

WORKDIR /app/puppeteer_2_0_incognito

CMD yarn start
