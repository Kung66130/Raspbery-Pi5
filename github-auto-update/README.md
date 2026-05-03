# github-auto-update

Central auto-update service for multiple GitHub projects on a Raspberry Pi.

This updater:

- checks multiple repositories from one config file
- pulls changes from GitHub
- runs a per-project install command
- runs a per-project post-update command
- writes one combined log per run

## Config

Copy:

```bash
cp .env.example .env
cp projects.conf.example projects.conf
```

Fill `.env`:

```env
GITHUB_AUTO_UPDATE_TOKEN=github_pat_xxx
GITHUB_AUTO_UPDATE_CONFIG=/home/raspberrykung/github-auto-update/projects.conf
GITHUB_AUTO_UPDATE_LOG=/home/raspberrykung/github-auto-update/update.log
```

Edit `projects.conf`.

Format:

```text
name|repo_url|branch|path|install_command|post_update_command
```

Example:

```text
pi-status|https://github.com/Kung66130/Pi-Status.git|main|/home/raspberrykung/Pi-Status|npm --prefix /home/raspberrykung/Pi-Status install --omit=dev|sudo systemctl restart pi-controler
```

Notes:

- Lines starting with `#` are ignored.
- Leave `install_command` empty if not needed.
- Leave `post_update_command` empty if not needed.
- For private repos, `GITHUB_AUTO_UPDATE_TOKEN` must have access to those repos.

## Install on Pi

```bash
sudo cp deploy/github-auto-update.service.example /etc/systemd/system/github-auto-update.service
sudo cp deploy/github-auto-update.timer.example /etc/systemd/system/github-auto-update.timer
chmod +x github-auto-update.sh
sudo systemctl daemon-reload
sudo systemctl enable --now github-auto-update.timer
```

Check:

```bash
sudo systemctl status github-auto-update.timer
sudo systemctl start github-auto-update.service
journalctl -u github-auto-update.service -n 50 --no-pager
```
