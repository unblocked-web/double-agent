FROM double-agent-scraper-base

RUN curl -o chrome-stable.deb http://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_80.0.3987.122-1_amd64.deb

RUN dpkg -i chrome-stable.deb && apt-get -f install

RUN cd /app/puppeteer_2_1_chrome && yarn --frozen-lockfile

RUN chown -R pptruser:pptruser /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=0
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Run everything after as non-privileged user.
USER pptruser

WORKDIR /app/puppeteer_2_1_chrome

CMD yarn start
