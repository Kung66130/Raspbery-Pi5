# pi-controler Service

Standalone Raspberry Pi control service with:

- Live status dashboard at `/`
- JSON status at `/api/status`
- Token-protected command API for mobile over Tailscale
- Slack slash command endpoint at `/api/slack/commands/pi`

This service can run directly on the Raspberry Pi without Supabase and without the main app backend.

## Quick start on Raspberry Pi

Install Node.js 22 first:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
node -v
npm -v
```

Clone the repo and start the service:

```bash
git clone https://github.com/Kung66130/Pi-Status.git /home/raspberrykung/Pi-Status
cd /home/raspberrykung/Pi-Status
cp .env.example .env
npm install
npm start
```

Open:

```text
http://localhost:8080
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

```env
PORT=8080
PI_COMMAND_MODE=local
PI_SSH_HOST=127.0.0.1
PI_SSH_USER=raspberrykung
PI_SSH_PORT=22
PI_STATUS_GIT_REPO=https://github.com/Kung66130/Pi-Status.git
PI_STATUS_GIT_BRANCH=main
PI_STATUS_GITHUB_TOKEN=github_pat_xxx
API_AUTH_TOKEN=replace-with-a-long-random-token
SLACK_SIGNING_SECRET=
SLACK_ALLOWED_USER_IDS=
SLACK_ALLOWED_CHANNEL_IDS=
PI_SLACK_ENABLE_POWER_COMMANDS=false
```

Notes:

- Use `PI_COMMAND_MODE=local` when this service runs on the Pi itself.
- Use `PI_COMMAND_MODE=ssh` when this service runs on another machine and connects to the Pi over SSH.
- `API_AUTH_TOKEN` is required for `POST /api/command/*`.
- `PI_STATUS_GITHUB_TOKEN` is required if you want the Pi to auto-update from this private GitHub repository.
- Slack settings are optional if you only use the mobile API through Tailscale.
- If both `SLACK_ALLOWED_USER_IDS` and `SLACK_ALLOWED_CHANNEL_IDS` are set, both must match.
- Leave `PI_SLACK_ENABLE_POWER_COMMANDS=false` until `sudo -n reboot` and `sudo -n shutdown -h now` work without a password prompt.
- Replace `raspberrykung` with the actual Linux username on your Pi if it is different.

## Mobile API over Tailscale

If your phone already reaches the Pi through Tailscale, you can call the API directly without Slack. This is the simplest setup if you only want to control the Pi from your phone.

```text
GET  /api
GET  /api/status
POST /api/command/status
POST /api/command/reboot
POST /api/command/shutdown
```

Send the token in the header:

```text
Authorization: Bearer YOUR_API_AUTH_TOKEN
```

Example with `curl`:

```bash
curl http://100.x.x.x:8080/api/status

curl -X POST http://100.x.x.x:8080/api/command/status \
  -H "Authorization: Bearer YOUR_API_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

```bash
curl -X POST http://100.x.x.x:8080/api/command/reboot \
  -H "Authorization: Bearer YOUR_API_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

## Slack setup

1. Create a Slack app.
2. Enable **Slash Commands**.
3. Create the command `/pi`.
4. Set the Request URL to:

```text
https://YOUR_PUBLIC_DOMAIN/api/slack/commands/pi
```

5. Install the app to your workspace.

You can also import `slack-app-manifest.yml` after replacing `https://YOUR_PUBLIC_DOMAIN`.

## Supported Slack commands

```text
/pi
/pi status
/pi help
/pi reboot
/pi shutdown
```

## Public HTTPS

Slack must reach the Pi over public HTTPS. Common options:

- Cloudflare Tunnel
- Reverse proxy with your own domain
- Temporary tunnel for testing

If you want a Cloudflare Tunnel starting point, use:

- `cloudflared-config.example.yml`

## systemd service

Example unit file:

- `deploy/pi-controler.service.example`
- `deploy/pi-status-update.service.example`
- `deploy/pi-status-update.timer.example`
- `deploy/pi-health-watchdog.service.example`
- `deploy/pi-health-watchdog.timer.example`

Typical install:

```bash
sudo cp deploy/pi-controler.service.example /etc/systemd/system/pi-controler.service
sudo systemctl daemon-reload
sudo systemctl enable --now pi-controler
sudo systemctl status pi-controler
```

Then open:

```text
http://YOUR_PI_IP:8080
```

## Auto update from GitHub

For a private repository, add a GitHub personal access token to `.env`:

```env
PI_STATUS_GITHUB_TOKEN=github_pat_xxx
```

Install the updater service and timer:

```bash
sudo cp deploy/pi-status-update.service.example /etc/systemd/system/pi-status-update.service
sudo cp deploy/pi-status-update.timer.example /etc/systemd/system/pi-status-update.timer
sudo chmod +x deploy/pi-status-update.sh
sudo systemctl daemon-reload
sudo systemctl enable --now pi-status-update.timer
sudo systemctl status pi-status-update.timer
```

Run one manual update check:

```bash
sudo systemctl start pi-status-update.service
journalctl -u pi-status-update.service -n 50 --no-pager
```

## Auto reboot after 1 hour of failure

This watchdog checks critical services and the local status URL every 5 minutes.
If checks keep failing for 12 consecutive runs, the Pi reboots itself.

Install:

```bash
chmod +x deploy/pi-health-watchdog.sh
sudo cp deploy/pi-health-watchdog.service.example /etc/systemd/system/pi-health-watchdog.service
sudo cp deploy/pi-health-watchdog.timer.example /etc/systemd/system/pi-health-watchdog.timer
sudo systemctl daemon-reload
sudo systemctl enable --now pi-health-watchdog.timer
```

Default behavior:

- check `pi-controler`
- check `tailscaled`
- check `http://127.0.0.1:8081/api/status`
- reboot after `12` failed checks
- timer runs every `5` minutes

That means the Pi reboots after about `1 hour` of continuous failure.
