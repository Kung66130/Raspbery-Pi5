#!/usr/bin/env bash
set -euo pipefail

STATE_DIR="${PI_WATCHDOG_STATE_DIR:-/var/lib/pi-health-watchdog}"
STATE_FILE="${STATE_DIR}/failure_count"
LOG_TAG="pi-health-watchdog"
MAX_FAILURES="${PI_WATCHDOG_MAX_FAILURES:-12}"
CHECK_URL="${PI_WATCHDOG_CHECK_URL:-http://127.0.0.1:8081/api/status}"
SERVICES_CSV="${PI_WATCHDOG_SERVICES:-pi-controler,tailscaled}"

mkdir -p "${STATE_DIR}"

read_failure_count() {
  if [[ -f "${STATE_FILE}" ]]; then
    cat "${STATE_FILE}"
  else
    echo 0
  fi
}

write_failure_count() {
  printf '%s\n' "$1" > "${STATE_FILE}"
}

log() {
  logger -t "${LOG_TAG}" "$1"
  printf '[%s] %s\n' "${LOG_TAG}" "$1"
}

services_ok=true
IFS=',' read -r -a services <<< "${SERVICES_CSV}"
for service in "${services[@]}"; do
  trimmed="$(echo "${service}" | xargs)"
  if [[ -z "${trimmed}" ]]; then
    continue
  fi

  if ! systemctl is-active --quiet "${trimmed}"; then
    log "Service check failed: ${trimmed}"
    services_ok=false
  fi
done

url_ok=true
if [[ -n "${CHECK_URL}" ]]; then
  if ! curl -fsS --max-time 10 "${CHECK_URL}" >/dev/null; then
    log "URL check failed: ${CHECK_URL}"
    url_ok=false
  fi
fi

if [[ "${services_ok}" == true && "${url_ok}" == true ]]; then
  write_failure_count 0
  log "Health check passed."
  exit 0
fi

failures="$(read_failure_count)"
failures="$((failures + 1))"
write_failure_count "${failures}"
log "Health check failed (${failures}/${MAX_FAILURES})."

if (( failures < MAX_FAILURES )); then
  exit 0
fi

log "Failure threshold reached. Rebooting Raspberry Pi."
write_failure_count 0
systemctl reboot
