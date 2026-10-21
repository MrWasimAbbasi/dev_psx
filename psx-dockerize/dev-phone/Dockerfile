FROM node:22-bookworm-slim

# Twilio Dev Phone is a Twilio CLI plugin (Node 18+). Do not put this in the
# PHP 7.2 Laravel image — that image ships Node 8 for Gulp only.

RUN printf 'Acquire::Retries "5";\n' > /etc/apt/apt.conf.d/80-retries \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

ENV CI=true \
    TWILIO_DISABLE_TELEMETRY=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    TWILIO_DEV_PHONE_PORT=3001

RUN npm install -g twilio-cli@6.2.4 \
    && twilio plugins:install @twilio-labs/plugin-dev-phone@1.0.0-beta.6

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
