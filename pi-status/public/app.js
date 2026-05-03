const refreshButton = document.getElementById('refreshButton');
const onlinePill = document.getElementById('onlinePill');
const targetPill = document.getElementById('targetPill');
const timePill = document.getElementById('timePill');
const errorBox = document.getElementById('errorBox');
const chartEmpty = document.getElementById('chartEmpty');
const chartLatest = document.getElementById('chartLatest');
const chartGrid = document.getElementById('chartGrid');
const chartArea = document.getElementById('chartArea');
const chartLine = document.getElementById('chartLine');
const chartPoints = document.getElementById('chartPoints');
const chartLabels = document.getElementById('chartLabels');

const REFRESH_MS = 60000;
const TEMP_HISTORY_STORAGE_KEY = 'pi_status_temp_history_v1';
const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 18, right: 12, bottom: 34, left: 12 };

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatNumber(value, suffix = '') {
  return Number.isFinite(value) ? `${value}${suffix}` : 'N/A';
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value}%` : 'N/A';
}

function formatPower(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} W` : 'N/A';
}

function formatTime(value) {
  if (!value) return 'N/A';

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function formatShortTime(value) {
  if (!value) return '--:--';

  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function setBar(id, value) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  document.getElementById(id).style.width = `${safeValue}%`;
}

function loadStoredHistory() {
  try {
    const raw = window.localStorage.getItem(TEMP_HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((entry) => Number.isFinite(entry?.tempC) && entry?.timestamp)
      : [];
  } catch {
    return [];
  }
}

function saveStoredHistory(history) {
  try {
    window.localStorage.setItem(TEMP_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-180)));
  } catch {
    // Ignore storage write issues.
  }
}

function mergeTemperatureHistory(status) {
  const stored = loadStoredHistory();
  const incoming = Array.isArray(status.history) ? status.history : [];
  const mergedMap = new Map();

  [...stored, ...incoming].forEach((entry) => {
    if (Number.isFinite(entry?.tempC) && entry?.timestamp) {
      mergedMap.set(entry.timestamp, {
        tempC: entry.tempC,
        timestamp: entry.timestamp
      });
    }
  });

  if (Number.isFinite(status.cpu?.tempC) && status.refreshedAt) {
    mergedMap.set(status.refreshedAt, {
      tempC: status.cpu.tempC,
      timestamp: status.refreshedAt
    });
  }

  const merged = [...mergedMap.values()]
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))
    .slice(-180);

  saveStoredHistory(merged);
  return merged;
}

function clearChart() {
  chartGrid.innerHTML = '';
  chartPoints.innerHTML = '';
  chartArea.setAttribute('d', '');
  chartLine.setAttribute('d', '');
  chartLabels.innerHTML = '';
}

function renderTemperatureChart(history) {
  const points = Array.isArray(history)
    ? history.filter((entry) => Number.isFinite(entry?.tempC) && entry?.timestamp)
    : [];

  clearChart();

  if (points.length < 2) {
    chartEmpty.style.display = 'grid';
    chartLatest.textContent = 'ต้องมีข้อมูลอย่างน้อย 2 จุด';
    return;
  }

  chartEmpty.style.display = 'none';
  const temperatures = points.map((entry) => entry.tempC);
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const tempPadding = Math.max(2, (maxTemp - minTemp) * 0.2 || 2);
  const domainMin = Math.max(20, minTemp - tempPadding);
  const domainMax = maxTemp + tempPadding;
  const usableWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const usableHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const toX = (index) => {
    if (points.length === 1) {
      return CHART_PADDING.left + usableWidth / 2;
    }

    return CHART_PADDING.left + (usableWidth * index) / (points.length - 1);
  };

  const toY = (temp) => {
    const ratio = (temp - domainMin) / Math.max(domainMax - domainMin, 1);
    return CHART_HEIGHT - CHART_PADDING.bottom - ratio * usableHeight;
  };

  const gridValues = [domainMin, (domainMin + domainMax) / 2, domainMax];
  gridValues.forEach((value) => {
    const y = toY(value);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(CHART_PADDING.left));
    line.setAttribute('x2', String(CHART_WIDTH - CHART_PADDING.right));
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    line.setAttribute('class', 'chart-grid-line');
    chartGrid.appendChild(line);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(CHART_WIDTH - CHART_PADDING.right));
    text.setAttribute('y', String(y - 6));
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('class', 'chart-grid-text');
    text.textContent = `${value.toFixed(1)}°C`;
    chartGrid.appendChild(text);
  });

  const lineParts = [];
  const areaParts = [];

  points.forEach((entry, index) => {
    const x = toX(index);
    const y = toY(entry.tempC);
    lineParts.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);
    areaParts.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', index === points.length - 1 ? '5' : '3');
    circle.setAttribute('class', index === points.length - 1 ? 'chart-point latest' : 'chart-point');
    chartPoints.appendChild(circle);
  });

  const firstX = toX(0);
  const lastX = toX(points.length - 1);
  const baselineY = CHART_HEIGHT - CHART_PADDING.bottom;
  areaParts.push(`L ${lastX} ${baselineY}`);
  areaParts.push(`L ${firstX} ${baselineY}`);
  areaParts.push('Z');

  chartLine.setAttribute('d', lineParts.join(' '));
  chartArea.setAttribute('d', areaParts.join(' '));

  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .filter((value, index, array) => array.indexOf(value) === index);

  labelIndexes.forEach((index) => {
    const item = document.createElement('span');
    item.textContent = formatShortTime(points[index].timestamp);
    chartLabels.appendChild(item);
  });

  const latest = points[points.length - 1];
  chartLatest.textContent = `ล่าสุด ${latest.tempC.toFixed(1)}°C เวลา ${formatShortTime(latest.timestamp)}`;
}

function applyStatus(status) {
  onlinePill.textContent = 'ออนไลน์';
  onlinePill.className = 'pill ok';
  targetPill.textContent = status.sshTarget || 'ปลายทาง SSH';
  timePill.textContent = `อัปเดตล่าสุด ${formatTime(status.refreshedAt)}`;
  errorBox.className = 'error-box hidden';
  errorBox.textContent = '';

  setText('hostname', status.hostname || 'N/A');
  setText('model', status.model || 'N/A');
  setText('uptime', status.uptime || 'N/A');
  setText('bootTime', `Boot: ${status.bootTime || 'N/A'}`);
  setText('cpuTemp', formatNumber(status.cpu?.tempC, '°C'));
  setText('cpuClock', formatNumber(status.cpu?.freqGHz, ' GHz'));
  setText('loadAverage', `Load avg: ${status.loadAverage || 'N/A'}`);
  setText('memoryUsage', formatPercent(status.memory?.usagePct));
  setText('memoryDetail', `${formatNumber(status.memory?.usedMb, ' MB')} / ${formatNumber(status.memory?.totalMb, ' MB')}`);
  setText('ipAddress', status.ipAddress || 'N/A');
  setText('ramPercent', formatPercent(status.memory?.usagePct));
  setText('ramText', `${formatNumber(status.memory?.usedMb, ' MB')} / ${formatNumber(status.memory?.totalMb, ' MB')}`);
  setText('diskPercent', formatPercent(status.disk?.usagePct));
  setText('diskText', `${formatNumber(status.disk?.usedGb, ' GB')} used, ${formatNumber(status.disk?.availableGb, ' GB')} free`);
  setText('sshTarget', status.sshTarget || 'N/A');
  setText('diskTotal', formatNumber(status.disk?.totalGb, ' GB'));
  setText('diskFree', formatNumber(status.disk?.availableGb, ' GB'));
  setText('fanRpm', formatNumber(status.fan?.rpm, ' RPM'));
  setText('fanLevel', `ระดับพัดลม ${status.fan?.level ?? 'N/A'}/${status.fan?.maxLevel ?? 'N/A'}`);
  setText('fanPwm', formatNumber(status.fan?.pwm));
  setText('fanMode', `สถานะ ${status.fan?.mode || 'Unknown'}`);
  setText('powerWatts', formatPower(status.power?.watts));
  setText(
    'powerMeta',
    status.power?.method === 'estimated'
      ? `ค่าประมาณจากโหลดเครื่อง (${status.power?.confidence || 'low'} confidence)`
      : 'วัดจากเซนเซอร์'
  );

  setBar('ramBar', status.memory?.usagePct);
  setBar('diskBar', status.disk?.usagePct);
  renderTemperatureChart(mergeTemperatureHistory(status));
}

function applyError(message) {
  onlinePill.textContent = 'เชื่อมต่อไม่ได้';
  onlinePill.className = 'pill error';
  errorBox.className = 'error-box';
  errorBox.textContent = message;
  chartEmpty.style.display = 'grid';
  chartLatest.textContent = 'โหลดกราฟไม่สำเร็จ';
  clearChart();
}

async function loadStatus() {
  refreshButton.disabled = true;
  refreshButton.textContent = 'กำลังรีเฟรช...';

  try {
    const response = await fetch('/api/status');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || payload.error || 'โหลดข้อมูลไม่สำเร็จ');
    }

    applyStatus(payload);
  } catch (error) {
    applyError(error.message || 'โหลดข้อมูลไม่สำเร็จ');
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'รีเฟรชตอนนี้';
  }
}

refreshButton.addEventListener('click', loadStatus);
loadStatus();
window.setInterval(loadStatus, REFRESH_MS);
