// CDP 连接与注入巡环：给 Antigravity 主窗口贴/摘样式
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildCss, installSource, removeSource } from './tactile.mjs';

const TICK_MS = 1500;

function appDataDir() {
  const base = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
  for (const name of ['Antigravity', 'antigravity']) {
    const dir = join(base, name);
    if (existsSync(dir)) return dir;
  }
  return join(base, 'Antigravity');
}

function debugPort() {
  try {
    const raw = readFileSync(join(appDataDir(), 'DevToolsActivePort'), 'utf8').split('\n')[0].trim();
    const port = Number(raw);
    return Number.isFinite(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

async function pageTargets(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const list = await res.json();
    return list.filter((t) => {
      if (t.type !== 'page') return false;
      if (!/^https?:/.test(t.url)) return false;
      try { return Number(new URL(t.webSocketDebuggerUrl).port) === port; } catch { return false; }
    });
  } catch {
    return [];
  }
}

class Session {
  constructor(target) {
    this.target = target;
    this.ws = null;
    this.seq = 0;
    this.pending = new Map();
  }

  async connect() {
    const ws = new WebSocket(this.target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('ws timeout')), 4000);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener('error', (e) => { clearTimeout(timer); reject(e); }, { once: true });
    });
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const cb = msg.id && this.pending.get(msg.id);
      if (cb) { this.pending.delete(msg.id); cb(msg); }
    });
    this.ws = ws;
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    return this;
  }

  send(method, params = {}, timeout = 4000) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) return reject(new Error('ws closed'));
      const id = ++this.seq;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timeout`)); }, timeout);
      this.pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return res?.result?.result?.value;
  }

  close() {
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
}

export class TactileHost {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.sessions = new Map();
    this.state = { windows: 0, error: null, appliedAt: null };
    this.timer = null;
    this.lastSig = '';
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => { this.tick().catch(() => {}); }, TICK_MS);
    this.tick().catch(() => {});
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clearAll();
  }

  health() {
    return { ...this.state, sessions: this.sessions.size };
  }

  clearAll() {
    for (const s of this.sessions.values()) s.close();
    this.sessions.clear();
    this.state.windows = 0;
  }

  async tick() {
    const settings = this.getSettings();
    const port = debugPort();
    if (!port) {
      this.clearAll();
      this.state.error = 'waiting-for-app';
      return;
    }
    const targets = await pageTargets(port);
    if (!targets.length) {
      this.state.error = 'no-window';
      return;
    }
    for (const target of targets) {
      let session = this.sessions.get(target.id);
      try {
        if (!session) {
          session = await new Session(target).connect();
          this.sessions.set(target.id, session);
        }
        if (settings.enabled) await session.evaluate(installSource(buildCss(settings)));
        else await session.evaluate(removeSource());
      } catch (err) {
        session?.close();
        this.sessions.delete(target.id);
        this.state.error = err.message;
      }
    }
    const alive = new Set(targets.map((t) => t.id));
    for (const [id, s] of this.sessions) {
      if (!alive.has(id)) { s.close(); this.sessions.delete(id); }
    }
    this.state.windows = this.sessions.size;
    this.state.error = null;
    if (this.sessions.size) this.state.appliedAt = Date.now();
  }
}
