import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import crypto from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const loadEnvFile = (envPath) => {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(path.join(process.cwd(), '.env'));

const app = express();
const PORT = Number(process.env.PORT || 8080);
const PI_SSH_HOST = process.env.PI_SSH_HOST || '127.0.0.1';
const PI_SSH_USER = process.env.PI_SSH_USER || process.env.USER || 'pi';
const PI_SSH_PORT = process.env.PI_SSH_PORT || '22';
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';
const SLACK_ALLOWED_USER_IDS = new Set(
  (process.env.SLACK_ALLOWED_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const SLACK_ALLOWED_CHANNEL_IDS = new Set(
  (process.env.SLACK_ALLOWED_CHANNEL_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const PI_SLACK_ENABLE_POWER_COMMANDS = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.PI_SLACK_ENABLE_POWER_COMMANDS || '').toLowerCase()
);
const LOCAL_PI_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const PI_COMMAND_MODE = String(
  process.env.PI_COMMAND_MODE || (LOCAL_PI_HOSTS.has(PI_SSH_HOST) ? 'local' : 'ssh')
).toLowerCase();
const TEMP_HISTORY_LIMIT = Number(process.env.TEMP_HISTORY_LIMIT || 180);
const TEMP_HISTORY_POLL_MS = Number(process.env.TEMP_HISTORY_POLL_MS || 60000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const temperatureHistory = [];

const slackSlashCommandParser = express.urlencoded({
  extended: false,
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString('utf8');
  }
});

app.use(express.json());

const getTargetLabel = () =>
  PI_COMMAND_MODE === 'local'
    ? `local:${PI_SSH_USER}@${PI_SSH_HOST}`
    : `${PI_SSH_USER}@${PI_SSH_HOST}:${PI_SSH_PORT}`;

const parseOptionalNumber = (value) => {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const estimatePowerWatts = ({ loadAverage, tempC, freqGHz, fanRpm, fanPwm, memoryUsagePct }) => {
  const loadOneMinute = parseOptionalNumber(String(loadAverage || '').split(/\s+/)[0]);
  const boundedLoad = loadOneMinute == null ? 0.35 : Math.max(0, Math.min(4, loadOneMinute)) / 4;
  const boundedTemp = tempC == null ? 0.45 : Math.max(35, Math.min(85, tempC));
  const boundedFreq = freqGHz == null ? 1.8 : Math.max(1.5, Math.min(2.4, freqGHz));
  const boundedMemory = memoryUsagePct == null ? 0.3 : Math.max(0, Math.min(100, memoryUsagePct)) / 100;
  const fanFactor = fanPwm != null
    ? Math.max(0, Math.min(255, fanPwm)) / 255
    : fanRpm != null
      ? Math.max(0, Math.min(5000, fanRpm)) / 5000
      : 0;

  const idleBase = 3.2;
  const cpuLoadContribution = 5.4 * boundedLoad;
  const tempContribution = Math.max(0, boundedTemp - 42) * 0.045;
  const freqContribution = Math.max(0, boundedFreq - 1.8) * 2.1;
  const memoryContribution = 0.8 * boundedMemory;
  const fanContribution = 0.9 * fanFactor;
  const estimatedWatts = idleBase
    + cpuLoadContribution
    + tempContribution
    + freqContribution
    + memoryContribution
    + fanContribution;

  const confidence = fanPwm != null || fanRpm != null ? 'medium' : 'low';

  return {
    watts: Number(estimatedWatts.toFixed(1)),
    confidence,
    method: 'estimated'
  };
};

const runPiScript = async (script, options = {}) => {
  if (PI_COMMAND_MODE === 'local') {
    const { stdout } = await execFileAsync('bash', ['-lc', script], {
      timeout: options.timeout || 12000,
      maxBuffer: 1024 * 1024
    });

    return stdout;
  }

  const args = [
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=8',
    '-p', String(PI_SSH_PORT),
    `${PI_SSH_USER}@${PI_SSH_HOST}`,
    'bash',
    '-lc',
    script
  ];

  const { stdout } = await execFileAsync('ssh', args, {
    timeout: options.timeout || 12000,
    maxBuffer: 1024 * 1024
  });

  return stdout;
};

const readPiStatus = async () => {
  const script = `
resolve_hwmon_file_by_name() {
  local target_name="$1"
  local file_name="$2"
  local dir

  for dir in /sys/class/hwmon/hwmon*; do
    [ -d "$dir" ] || continue
    if [ "$(cat "$dir/name" 2>/dev/null || echo '')" = "$target_name" ]; then
      if [ -f "$dir/$file_name" ]; then
        echo "$dir/$file_name"
        return 0
      fi
    fi
  done

  return 1
}

HOSTNAME=$(hostname 2>/dev/null || echo unknown)
UPTIME=$(uptime -p 2>/dev/null || echo unavailable)
BOOT_TIME=$(uptime -s 2>/dev/null || echo unavailable)
LOAD_AVG=$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || echo unavailable)
CPU_TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo '')
CPU_FREQ_RAW=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null || echo '')
FAN_RPM_FILE=$(resolve_hwmon_file_by_name pwmfan fan1_input 2>/dev/null || echo '')
FAN_PWM_FILE=$(resolve_hwmon_file_by_name pwmfan pwm1 2>/dev/null || echo '')
FAN_MODE_FILE=$(resolve_hwmon_file_by_name pwmfan pwm1_enable 2>/dev/null || echo '')
if [ -n "$FAN_RPM_FILE" ]; then FAN_RPM=$(cat "$FAN_RPM_FILE" 2>/dev/null || echo ''); else FAN_RPM=''; fi
if [ -n "$FAN_PWM_FILE" ]; then FAN_PWM=$(cat "$FAN_PWM_FILE" 2>/dev/null || echo ''); else FAN_PWM=''; fi
if [ -n "$FAN_MODE_FILE" ]; then FAN_MODE=$(cat "$FAN_MODE_FILE" 2>/dev/null || echo ''); else FAN_MODE=''; fi
FAN_LEVEL=$(cat /sys/class/thermal/cooling_device0/cur_state 2>/dev/null || echo '')
FAN_LEVEL_MAX=$(cat /sys/class/thermal/cooling_device0/max_state 2>/dev/null || echo '')
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
DISK_TOTAL=$(df -k / | awk 'NR==2 {print $2}')
DISK_USED=$(df -k / | awk 'NR==2 {print $3}')
DISK_AVAIL=$(df -k / | awk 'NR==2 {print $4}')
DISK_USE_PCT=$(df -k / | awk 'NR==2 {print $5}')
IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}')
MODEL=$(tr -d '\\0' </proc/device-tree/model 2>/dev/null || echo unavailable)
echo "hostname=$HOSTNAME"
echo "model=$MODEL"
echo "uptime=$UPTIME"
echo "boot_time=$BOOT_TIME"
echo "load_avg=$LOAD_AVG"
echo "cpu_temp_raw=$CPU_TEMP_RAW"
echo "cpu_freq_raw=$CPU_FREQ_RAW"
echo "fan_rpm=\${FAN_RPM:-}"
echo "fan_pwm=\${FAN_PWM:-}"
echo "fan_mode=\${FAN_MODE:-}"
echo "fan_level=\${FAN_LEVEL:-}"
echo "fan_level_max=\${FAN_LEVEL_MAX:-}"
echo "mem_total_mb=\${MEM_TOTAL:-0}"
echo "mem_used_mb=\${MEM_USED:-0}"
echo "disk_total_kb=\${DISK_TOTAL:-0}"
echo "disk_used_kb=\${DISK_USED:-0}"
echo "disk_avail_kb=\${DISK_AVAIL:-0}"
echo "disk_use_pct=\${DISK_USE_PCT:-0}"
echo "ip_addr=\${IP_ADDR:-unknown}"
`;

  const stdout = await runPiScript(script);
  const raw = Object.fromEntries(
    stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );

  const memTotalMb = Number(raw.mem_total_mb || 0);
  const memUsedMb = Number(raw.mem_used_mb || 0);
  const diskTotalGb = Number(raw.disk_total_kb || 0) / 1024 / 1024;
  const diskUsedGb = Number(raw.disk_used_kb || 0) / 1024 / 1024;
  const diskAvailGb = Number(raw.disk_avail_kb || 0) / 1024 / 1024;
  const tempRaw = parseOptionalNumber(raw.cpu_temp_raw);
  const freqRaw = parseOptionalNumber(raw.cpu_freq_raw);
  const tempC = tempRaw == null ? null : tempRaw / 1000;
  const freqGHz = freqRaw == null ? null : freqRaw / 1000000;
  const fanMode = String(raw.fan_mode || '').trim();
  const fanRpm = parseOptionalNumber(raw.fan_rpm);
  const fanPwm = parseOptionalNumber(raw.fan_pwm);
  const fanLevel = parseOptionalNumber(raw.fan_level);
  const fanLevelMax = parseOptionalNumber(raw.fan_level_max);
  const memoryUsagePct = memTotalMb > 0 ? Math.round((memUsedMb / memTotalMb) * 100) : null;
  const fanModeLabel = fanMode === '1'
    ? 'Auto'
    : fanMode === '0'
      ? 'Off'
      : fanMode === '2'
        ? 'On'
        : fanLevel != null && fanLevel > 0
          ? 'Auto'
          : 'Unknown';

  return {
    commandMode: PI_COMMAND_MODE,
    sshTarget: getTargetLabel(),
    hostname: raw.hostname || 'unknown',
    model: raw.model || 'unknown',
    uptime: raw.uptime || 'unavailable',
    bootTime: raw.boot_time || 'unavailable',
    loadAverage: raw.load_avg || 'unavailable',
    ipAddress: raw.ip_addr || 'unknown',
    cpu: {
      tempC: Number.isFinite(tempC) ? Number(tempC.toFixed(1)) : null,
      freqGHz: Number.isFinite(freqGHz) ? Number(freqGHz.toFixed(2)) : null
    },
    fan: {
      rpm: fanRpm,
      pwm: fanPwm,
      level: fanLevel,
      maxLevel: fanLevelMax,
      mode: fanModeLabel
    },
    memory: {
      totalMb: memTotalMb,
      usedMb: memUsedMb,
      usagePct: memoryUsagePct
    },
    disk: {
      totalGb: Number.isFinite(diskTotalGb) ? Number(diskTotalGb.toFixed(1)) : null,
      usedGb: Number.isFinite(diskUsedGb) ? Number(diskUsedGb.toFixed(1)) : null,
      availableGb: Number.isFinite(diskAvailGb) ? Number(diskAvailGb.toFixed(1)) : null,
      usagePct: raw.disk_use_pct ? Number(String(raw.disk_use_pct).replace('%', '')) : null
    },
    power: estimatePowerWatts({
      loadAverage: raw.load_avg,
      tempC,
      freqGHz,
      fanRpm,
      fanPwm,
      memoryUsagePct
    }),
    refreshedAt: new Date().toISOString()
  };
};

const snapshotTemperatureHistory = () =>
  temperatureHistory.map((entry) => ({
    tempC: entry.tempC,
    timestamp: entry.timestamp
  }));

const recordTemperature = (status) => {
  if (!Number.isFinite(status?.cpu?.tempC)) {
    return;
  }

  temperatureHistory.push({
    tempC: status.cpu.tempC,
    timestamp: status.refreshedAt || new Date().toISOString()
  });

  while (temperatureHistory.length > TEMP_HISTORY_LIMIT) {
    temperatureHistory.shift();
  }
};

const pollTemperatureHistory = async () => {
  try {
    const status = await readPiStatus();
    recordTemperature(status);
  } catch (error) {
    console.error('[temp history poll failed]', error.message);
  }
};

const timingSafeCompare = (left, right) => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifySlackSignature = (req) => {
  if (!SLACK_SIGNING_SECRET || !req.rawBody) {
    return false;
  }

  const timestamp = req.get('x-slack-request-timestamp');
  const signature = req.get('x-slack-signature') || '';
  const requestTimestamp = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(requestTimestamp) || Math.abs(nowSeconds - requestTimestamp) > 300) {
    return false;
  }

  const expectedSignature = `v0=${crypto
    .createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(`v0:${timestamp}:${req.rawBody}`)
    .digest('hex')}`;

  return timingSafeCompare(signature, expectedSignature);
};

const isSlackCallerAllowed = ({ userId, channelId }) => {
  const hasUserAllowlist = SLACK_ALLOWED_USER_IDS.size > 0;
  const hasChannelAllowlist = SLACK_ALLOWED_CHANNEL_IDS.size > 0;

  if (!hasUserAllowlist && !hasChannelAllowlist) {
    return true;
  }

  if (hasUserAllowlist && !SLACK_ALLOWED_USER_IDS.has(userId)) {
    return false;
  }

  if (hasChannelAllowlist && !SLACK_ALLOWED_CHANNEL_IDS.has(channelId)) {
    return false;
  }

  return true;
};

const requireApiAuth = (req, res, next) => {
  if (!API_AUTH_TOKEN) {
    return res.status(503).json({
      error: 'API auth token is not configured',
      message: 'Set API_AUTH_TOKEN in the environment before using command routes.'
    });
  }

  const authHeader = req.get('authorization') || '';
  const [scheme, token = ''] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !timingSafeCompare(token, API_AUTH_TOKEN)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Send Authorization: Bearer <API_AUTH_TOKEN>.'
    });
  }

  next();
};

const formatPiStatusForSlack = (status) => {
  const cpuTemp = status.cpu.tempC == null ? 'n/a' : `${status.cpu.tempC} C`;
  const cpuFreq = status.cpu.freqGHz == null ? 'n/a' : `${status.cpu.freqGHz} GHz`;
  const memoryUsage = status.memory.usagePct == null
    ? `${status.memory.usedMb}/${status.memory.totalMb} MB`
    : `${status.memory.usedMb}/${status.memory.totalMb} MB (${status.memory.usagePct}%)`;
  const diskUsage = status.disk.usagePct == null
    ? `${status.disk.usedGb}/${status.disk.totalGb} GB`
    : `${status.disk.usedGb}/${status.disk.totalGb} GB (${status.disk.usagePct}%)`;
  const fanSummary = status.fan.rpm == null ? status.fan.mode : `${status.fan.rpm} RPM (${status.fan.mode})`;

  return [
    `Pi status for ${status.hostname}`,
    `Target: ${status.sshTarget}`,
    `Mode: ${status.commandMode}`,
    `Model: ${status.model}`,
    `IP: ${status.ipAddress}`,
    `Uptime: ${status.uptime}`,
    `Boot: ${status.bootTime}`,
    `Load: ${status.loadAverage}`,
    `CPU: ${cpuTemp}, ${cpuFreq}`,
    `Fan: ${fanSummary}`,
    `Memory: ${memoryUsage}`,
    `Disk: ${diskUsage}`,
    `Updated: ${status.refreshedAt}`
  ].join('\n');
};

const getSlackPiHelpText = () => [
  'Available commands:',
  '/pi',
  '/pi status',
  '/pi help',
  '/pi reboot',
  '/pi shutdown',
  '',
  'Power commands stay disabled until PI_SLACK_ENABLE_POWER_COMMANDS=true.'
].join('\n');

const sendSlackResponse = async (responseUrl, payload) => {
  const response = await fetch(responseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Slack response failed with ${response.status}: ${responseText}`);
  }
};

const runPiPowerCommand = async (action) => {
  if (!PI_SLACK_ENABLE_POWER_COMMANDS) {
    return 'Power commands are disabled on this server. Set PI_SLACK_ENABLE_POWER_COMMANDS=true to allow reboot/shutdown.';
  }

  const commands = {
    reboot: `
sudo -n true >/dev/null 2>&1
nohup bash -lc '
sleep 1
sudo -n /usr/sbin/reboot || sudo -n /sbin/reboot || sudo -n reboot
' >/dev/null 2>&1 </dev/null &
echo queued
`,
    shutdown: `
sudo -n true >/dev/null 2>&1
nohup bash -lc '
sleep 1
sudo -n /usr/sbin/shutdown -h now || sudo -n /sbin/shutdown -h now || sudo -n shutdown -h now
' >/dev/null 2>&1 </dev/null &
echo queued
`
  };

  const script = commands[action];
  if (!script) {
    throw new Error(`Unsupported power action: ${action}`);
  }

  await runPiScript(script, { timeout: 5000 });
  return `Sent \`${action}\` to ${getTargetLabel()}. If it succeeds, the machine will stop responding shortly.`;
};

const runApiPiCommand = async (action) => {
  if (action === 'status') {
    const status = await readPiStatus();
    return {
      ok: true,
      action,
      status
    };
  }

  if (action === 'reboot' || action === 'shutdown') {
    const message = await runPiPowerCommand(action);
    return {
      ok: true,
      action,
      message,
      target: getTargetLabel()
    };
  }

  throw new Error(`Unsupported API action: ${action}`);
};

const handleSlackPiCommand = async (text) => {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ');
  const [command = 'status'] = normalized ? normalized.toLowerCase().split(' ') : ['status'];

  if (command === 'help') {
    return getSlackPiHelpText();
  }

  if (command === 'status') {
    const status = await readPiStatus();
    return formatPiStatusForSlack(status);
  }

  if (command === 'reboot' || command === 'shutdown') {
    return runPiPowerCommand(command);
  }

  return `Unknown command: ${command}\n\n${getSlackPiHelpText()}`;
};

app.get('/api', (req, res) => {
  res.json({
    status: 'pi-controler service is running',
    commandMode: PI_COMMAND_MODE,
    slackConfigured: Boolean(SLACK_SIGNING_SECRET),
    target: getTargetLabel()
  });
});

app.get('/api/status', async (req, res) => {
  try {
    const status = await readPiStatus();
    recordTemperature(status);
    res.json({
      ...status,
      history: snapshotTemperatureHistory()
    });
  } catch (error) {
    res.status(502).json({
      error: 'Unable to read Raspberry Pi status',
      message: error.message,
      sshTarget: getTargetLabel()
    });
  }
});

app.post('/api/command/:action', requireApiAuth, async (req, res) => {
  try {
    const result = await runApiPiCommand(String(req.params.action || '').toLowerCase());
    res.json(result);
  } catch (error) {
    const statusCode = String(error.message || '').startsWith('Unsupported API action') ? 400 : 500;
    res.status(statusCode).json({
      ok: false,
      error: 'Pi command failed',
      message: error.message
    });
  }
});

app.post('/api/slack/commands/pi', slackSlashCommandParser, async (req, res) => {
  if (req.body.ssl_check === '1') {
    return res.status(200).send('ok');
  }

  if (!SLACK_SIGNING_SECRET) {
    return res.status(503).json({
      response_type: 'ephemeral',
      text: 'Slack integration is not configured on this Pi yet.'
    });
  }

  if (!verifySlackSignature(req)) {
    return res.status(401).send('Invalid Slack signature');
  }

  const userId = req.body.user_id || '';
  const channelId = req.body.channel_id || '';
  const responseUrl = req.body.response_url || '';

  if (!isSlackCallerAllowed({ userId, channelId })) {
    return res.status(403).json({
      response_type: 'ephemeral',
      text: 'You are not allowed to control this Raspberry Pi from Slack.'
    });
  }

  if (responseUrl) {
    res.json({
      response_type: 'ephemeral',
      text: 'Working on your Pi command...'
    });

    handleSlackPiCommand(req.body.text || '')
      .then((text) =>
        sendSlackResponse(responseUrl, {
          response_type: 'ephemeral',
          replace_original: true,
          text
        })
      )
      .catch(async (error) => {
        try {
          await sendSlackResponse(responseUrl, {
            response_type: 'ephemeral',
            replace_original: true,
            text: `Pi command failed: ${error.message}`
          });
        } catch (responseError) {
          console.error('[SLACK PI] Failed to send delayed Slack response:', responseError.message);
        }
      });

    return;
  }

  try {
    const text = await handleSlackPiCommand(req.body.text || '');
    return res.json({
      response_type: 'ephemeral',
      text
    });
  } catch (error) {
    return res.status(500).json({
      response_type: 'ephemeral',
      text: `Pi command failed: ${error.message}`
    });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('exit', (code) => {
  console.error(`[process exit] code=${code}`);
});

const server = app.listen(PORT, () => {
  console.log(`pi-controler service listening on http://localhost:${PORT} (${PI_COMMAND_MODE})`);
});

// Disabled background polling for on-demand only mode
// pollTemperatureHistory();
// setInterval(pollTemperatureHistory, TEMP_HISTORY_POLL_MS);

server.on('close', () => {
  console.error('[server close] HTTP server closed');
});

server.on('error', (error) => {
  console.error('[server error]', error);
});
