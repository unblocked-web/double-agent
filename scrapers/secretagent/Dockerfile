FROM secret-agent:latest

WORKDIR /app/double-agent/scrapers

COPY --from=double-agent-scraper-base /app /app/double-agent/scrapers

RUN cd /app/double-agent/scrapers/secretagent && yarn

RUN chown -R sagent:sagent /app/double-agent/scrapers
RUN chown -R sagent:sagent /app/secret-agent
RUN chown -R sagent:sagent /app/secret-agent/node_modules

WORKDIR /app/double-agent/scrapers/secretagent

USER sagent

ENV RUNNER_DOMAIN=a0.ulixee-test.org

CMD yarn start
