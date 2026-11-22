// Codex 手感 · sidecar（带面板）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SidecarApp, Response } from 'sidecar_sdk';
import { TactileHost } from './lib/injector.mjs';
import { buildCss } from './lib/tactile.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR || HERE;
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

const DEFAULTS = { enabled: true, press: 0.985, duration: 150 };

function readSettings() {
  try {
    if (!existsSync(SETTINGS_FILE)) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8');
  } catch {}
  return next;
}

const host = new TactileHost(readSettings);
const app = new SidecarApp();

const file = (path, type) => {
  try {
    return new Response(readFileSync(join(HERE, path)), { contentType: type });
  } catch {
    return new Response('not found', { status: 404, contentType: 'text/plain' });
  }
};

app.page('/', () => file('web/index.html', 'text/html; charset=utf-8'));
app.page('/app.js', () => file('web/app.js', 'application/javascript; charset=utf-8'));

app.api('/api/state', () => ({
  version: '1.0.0',
  settings: readSettings(),
  health: host.health(),
  preview: { press: readSettings().press, duration: readSettings().duration },
}), 'GET');

app.api('/api/settings', (body) => {
  const patch = {};
  if (typeof body?.enabled === 'boolean') patch.enabled = body.enabled;
  if (Number.isFinite(body?.press)) patch.press = Math.min(1, Math.max(0.9, Number(body.press)));
  if (Number.isFinite(body?.duration)) patch.duration = Math.min(320, Math.max(60, Number(body.duration)));
  const next = writeSettings(patch);
  host.tick().catch(() => {});
  return { ok: true, settings: next };
});

app.api('/api/refresh', () => {
  host.tick().catch(() => {});
  return { ok: true };
});

host.start();
app.run();
