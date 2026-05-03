#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${BASE_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

CONFIG_FILE="${GITHUB_AUTO_UPDATE_CONFIG:-${BASE_DIR}/projects.conf}"
LOG_FILE="${GITHUB_AUTO_UPDATE_LOG:-${BASE_DIR}/update.log}"
TOKEN="${GITHUB_AUTO_UPDATE_TOKEN:-}"

log() {
  local message="$1"
  printf '[github-auto-update] %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${message}" | tee -a "${LOG_FILE}"
}

with_token() {
  local repo_url="$1"
  if [[ -z "${TOKEN}" ]]; then
    printf '%s' "${repo_url}"
    return
  fi
  printf '%s' "${repo_url/https:\/\//https:\/\/x-access-token:${TOKEN}@}"
}

run_command() {
  local command_text="$1"
  if [[ -z "${command_text}" ]]; then
    return 0
  fi
  bash -lc "${command_text}"
}

update_project() {
  local name="$1"
  local repo_url="$2"
  local branch="$3"
  local path="$4"
  local install_command="$5"
  local post_update_command="$6"
  local authenticated_url
  local local_sha=""
  local remote_sha=""

  authenticated_url="$(with_token "${repo_url}")"
  log "Checking ${name}"

  if [[ ! -d "${path}" ]]; then
    log "Cloning ${name} into ${path}"
    git clone --branch "${branch}" "${authenticated_url}" "${path}"
    run_command "${install_command}"
    run_command "${post_update_command}"
    log "Cloned and initialized ${name}"
    return
  fi

  if [[ ! -d "${path}/.git" ]]; then
    log "Skipping ${name}: ${path} exists but is not a git repository"
    return
  fi

  git -C "${path}" remote set-url origin "${authenticated_url}"
  git -C "${path}" fetch origin "${branch}"
  local_sha="$(git -C "${path}" rev-parse HEAD)"
  remote_sha="$(git -C "${path}" rev-parse "origin/${branch}")"

  if [[ "${local_sha}" == "${remote_sha}" ]]; then
    log "${name} already up to date"
    return
  fi

  log "Updating ${name} from ${local_sha:0:7} to ${remote_sha:0:7}"
  git -C "${path}" reset --hard "origin/${branch}"
  run_command "${install_command}"
  run_command "${post_update_command}"
  log "Updated ${name}"
}

main() {
  : > "${LOG_FILE}"

  if [[ ! -f "${CONFIG_FILE}" ]]; then
    log "Config file not found: ${CONFIG_FILE}"
    exit 1
  fi

  if [[ -z "${TOKEN}" ]]; then
    log "GITHUB_AUTO_UPDATE_TOKEN is not set; skipping all updates."
    exit 0
  fi

  while IFS='|' read -r name repo_url branch path install_command post_update_command; do
    if [[ -z "${name}" || "${name}" == \#* ]]; then
      continue
    fi

    update_project "${name}" "${repo_url}" "${branch}" "${path}" "${install_command}" "${post_update_command}"
  done < "${CONFIG_FILE}"
}

main "$@"
