const bridge = window.sidecar?.fetch ? (u, o) => window.sidecar.fetch(u, o) : (u, o) => fetch(u, o);
const $ = (id) => document.getElementById(id);

const ui = {
  status: $('status'),
  enabled: $('enabled'),
  press: $('press'),
  pressVal: $('press-val'),
  duration: $('duration'),
  durVal: $('dur-val'),
};

function paintPreview(settings) {
  const dur = Number(settings.duration ?? 150);
  const press = Number(settings.press ?? 0.985);
  const root = document.documentElement;
  root.style.setProperty('--demo-dur', `${dur}ms`);
  root.style.setProperty('--demo-press', String(press));
  root.style.setProperty('--demo-ease', 'cubic-bezier(.32,.72,0,1)');
  ui.pressVal.textContent = press.toFixed(3);
  ui.durVal.textContent = `${dur}ms`;
}

function paint(settings) {
  ui.enabled.setAttribute('aria-checked', String(!!settings.enabled));
  ui.press.value = String(settings.press ?? 0.985);
  ui.duration.value = String(settings.duration ?? 150);
  paintPreview(settings);
}

function paintHealth(health) {
  const alive = health && Number(health.windows) > 0;
  ui.status.textContent = alive ? `注入中 · ${health.windows} 窗口` : '等待 Antigravity 窗口';
  ui.status.classList.toggle('on', alive);
}

async function api(path, body) {
  const res = await bridge(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function load() {
  try {
    const state = await api('/api/state');
    paint(state.settings);
    paintHealth(state.health);
  } catch (err) {
    ui.status.textContent = '面板未连接';
  }
}

async function push(patch) {
  try {
    const res = await api('/api/settings', patch);
    if (res.settings) {
      paint(res.settings);
      paintPreview(res.settings);
    }
  } catch {}
  load();
}

ui.enabled.addEventListener('click', () => {
  const next = ui.enabled.getAttribute('aria-checked') !== 'true';
  ui.enabled.setAttribute('aria-checked', String(next));
  push({ enabled: next });
});
ui.enabled.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ui.enabled.click(); }
});

ui.press.addEventListener('input', () => {
  paintPreview({ ...readSliders() });
});
ui.duration.addEventListener('input', () => {
  paintPreview({ ...readSliders() });
});
ui.press.addEventListener('change', () => push(readSliders()));
ui.duration.addEventListener('change', () => push(readSliders()));

function readSliders() {
  return { press: Number(ui.press.value), duration: Number(ui.duration.value) };
}

load();
setInterval(load, 6000);
