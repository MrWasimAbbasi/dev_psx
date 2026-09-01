#!/bin/sh
set -e

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
  echo "twilio-dev-phone: set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in psx-dockerize/.env"
  exit 1
fi

if [ -z "$TWILIO_DEV_PHONE_NUMBER" ]; then
  echo "twilio-dev-phone: set TWILIO_DEV_PHONE_NUMBER (spare number only, never the Website virtnum)"
  exit 1
fi

# Headless: no browser inside the container. Force: overwrite this spare number's webhooks.
exec twilio dev-phone \
  --phone-number "$TWILIO_DEV_PHONE_NUMBER" \
  --force \
  --headless \
  --port "${TWILIO_DEV_PHONE_PORT:-3001}"
