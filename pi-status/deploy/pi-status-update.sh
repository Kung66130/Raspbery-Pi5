#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/raspberrykung/Pi-Status}"
BRANCH="${PI_STATUS_GIT_BRANCH:-main}"
REPO_URL="${PI_STATUS_GIT_REPO:-https://github.com/Kung66130/Pi-Status.git}"
TOKEN="${PI_STATUS_GITHUB_TOKEN:-}"
SERVICE_NAME="${PI_STATUS_SERVICE_NAME:-pi-controler}"

log() {
  printf '[pi-status-update] %s\n' "$1"
}

if [[ -z "${TOKEN}" ]]; then
  log "PI_STATUS_GITHUB_TOKEN is not set; skipping update."
  exit 0
fi

AUTH_REPO_URL="${REPO_URL/https:\/\//https:\/\/x-access-token:${TOKEN}@}"

if [[ ! -d "${APP_DIR}" ]]; then
  log "App directory ${APP_DIR} does not exist."
  exit 1
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Initializing Git repository in ${APP_DIR}."
  rm -rf "${APP_DIR}"
  git clone --branch "${BRANCH}" "${AUTH_REPO_URL}" "${APP_DIR}"
else
  log "Fetching latest changes from GitHub."
  git -C "${APP_DIR}" remote set-url origin "${AUTH_REPO_URL}"
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  LOCAL_SHA="$(git -C "${APP_DIR}" rev-parse HEAD)"
  REMOTE_SHA="$(git -C "${APP_DIR}" rev-parse "origin/${BRANCH}")"

  if [[ "${LOCAL_SHA}" == "${REMOTE_SHA}" ]]; then
    log "Already up to date."
    exit 0
  fi

  git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
fi

log "Installing production dependencies."
npm --prefix "${APP_DIR}" install --omit=dev

log "Restarting ${SERVICE_NAME}."
sudo systemctl restart "${SERVICE_NAME}"
log "Update completed."
