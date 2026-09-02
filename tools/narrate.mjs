/**
 * Renders the narration in docs/video-script.md to one mp3 per section, so the
 * voice track can be rebuilt after a script edit without re-recording anything
 * that did not change. Existing files are kept; delete one to re-render it.
 *
 * Needs GMI_API_KEY (env, or ~/.secrets/gmi/.env) and ffprobe on PATH.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const BASE = 'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests';
const MODEL = 'minimax-tts-speech-2.8-hd';
const VOICE = 'English_expressive_narrator';
const ROOT = join(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'docs/video-script.md');
const OUT = join(ROOT, '.media/narration');

function readKey() {
  if (process.env.GMI_API_KEY) return process.env.GMI_API_KEY;
  const file = readFileSync(join(homedir(), '.secrets/gmi/.env'), 'utf8');
  const line = file.split('\n').find((l) => l.startsWith('GMI_API_KEY='));
  if (!line) throw new Error('GMI_API_KEY not found in ~/.secrets/gmi/.env');
  return line.slice('GMI_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
}

function sections() {
  const lines = readFileSync(SCRIPT, 'utf8').split('\n');
  const out = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^## (.+)$/);
    if (heading) {
      if (current?.text) out.push(current);
      const title = heading[1];
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      current = { title, slug, text: '' };
      continue;
    }
    if (current && line.startsWith('> ')) current.text += (current.text ? ' ' : '') + line.slice(2).trim();
  }
  if (current?.text) out.push(current);
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synth(key, text, resubmits = 2) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, payload: { text, voice_id: VOICE, format: 'mp3' } }),
    });
    if (!res.ok) throw new Error(`submit failed: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
    let body = await res.json();
    // A request still queued after the window is treated as lost, not slow: the queue
    // gives no way to tell them apart and resubmitting is the only move that finishes.
    const deadline = Date.now() + 120000;
    while (body.status !== 'success' && body.status !== 'failed' && Date.now() < deadline) {
      await sleep(4000);
      const poll = await fetch(`${BASE}/${body.request_id}`, { headers: { authorization: `Bearer ${key}` } });
      if (!poll.ok) continue;
      body = await poll.json();
    }
    if (body.status === 'success') {
      const url = body.outcome?.audio_url ?? body.outcome?.media_urls?.[0]?.url;
      if (!url) throw new Error(`no audio url in outcome: ${JSON.stringify(body.outcome).slice(0, 300)}`);
      const audio = await fetch(url);
      return Buffer.from(await audio.arrayBuffer());
    }
    if (body.status === 'failed') throw new Error(`synthesis failed: ${body.error ?? 'no reason given'}`);
    if (attempt >= resubmits) throw new Error(`request ${body.request_id} never settled after ${attempt + 1} submissions`);
    console.log(`  (resubmitting: ${body.request_id} stayed ${body.status})`);
  }
}

async function durationSec(path) {
  const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  return Number(stdout.trim());
}

const key = readKey();
mkdirSync(OUT, { recursive: true });
const list = sections();
let total = 0;
for (const [i, s] of list.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const path = join(OUT, `${n}-${s.slug}.mp3`);
  if (!existsSync(path)) {
    writeFileSync(path, await synth(key, s.text));
  }
  const d = await durationSec(path);
  total += d;
  const words = s.text.split(/\s+/).length;
  console.log(`${n} ${s.slug.padEnd(26)} ${d.toFixed(1).padStart(5)}s  ${String(words).padStart(3)}w  ${Math.round((words / d) * 60)}wpm`);
}
console.log(`\ntotal ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')} (limit 3:00)`);
