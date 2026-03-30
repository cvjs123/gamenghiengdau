// Simple TTS proxy (Node 18+)
//
// Why: calling TTS directly from the browser would expose your API key.
// This proxy returns audio bytes from /tts?text=... so index.html can play it.
//
// Providers:
// - FPT.AI (recommended for Vietnamese):
//     $env:TTS_PROVIDER='fpt'
//     $env:FPT_TTS_API_KEY='YOUR_KEY'
//     $env:FPT_TTS_VOICE='banmai'   # female
//     $env:FPT_TTS_SPEED=''         # optional (depends on FPT)
//     node tts-proxy.mjs
// - Azure:
//     $env:TTS_PROVIDER='azure'
//     $env:AZURE_TTS_KEY='...'
//     $env:AZURE_TTS_REGION='southeastasia'
//     $env:AZURE_TTS_VOICE='vi-VN-HoaiMyNeural'
//     node tts-proxy.mjs
// - Google:
//     $env:TTS_PROVIDER='google'
//     $env:GOOGLE_TTS_API_KEY='...'
//     $env:GOOGLE_TTS_VOICE='vi-VN-Wavenet-A'
//     node tts-proxy.mjs
//
// Then set in index.html: http://localhost:8787/tts

import http from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// Load .env file if exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

const port = Number(process.env.PORT || 8787);
const provider = String(process.env.TTS_PROVIDER || 'fpt').toLowerCase();

console.log(`[STARTUP] Provider: ${provider}`);
console.log(`[STARTUP] Port: ${port}`);
console.log(`[STARTUP] TTS_PROVIDER env: ${process.env.TTS_PROVIDER}`);

if(provider === 'fpt'){
  console.log(`[STARTUP] FPT_TTS_API_KEY: ${process.env.FPT_TTS_API_KEY ? '✓ SET' : '✗ MISSING'}`);
  console.log(`[STARTUP] FPT_TTS_VOICE: ${process.env.FPT_TTS_VOICE || 'banmai (default)'}`);
} else if(provider === 'azure'){
  console.log(`[STARTUP] AZURE_TTS_KEY: ${process.env.AZURE_TTS_KEY ? '✓ SET' : '✗ MISSING'}`);
  console.log(`[STARTUP] AZURE_TTS_REGION: ${process.env.AZURE_TTS_REGION || '✗ MISSING'}`);
} else if(provider === 'google'){
  console.log(`[STARTUP] GOOGLE_TTS_API_KEY: ${process.env.GOOGLE_TTS_API_KEY ? '✓ SET' : '✗ MISSING'}`);
}

function setCors(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function send(res, status, headers, body){
  res.writeHead(status, headers);
  res.end(body);
}

function escapeXml(text){
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function synthAzure(text){
  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION;
  const voice = process.env.AZURE_TTS_VOICE || 'vi-VN-HoaiMyNeural';

  if(!key || !region){
    throw new Error('Missing AZURE_TTS_KEY or AZURE_TTS_REGION');
  }

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xml:lang="vi-VN">
  <voice name="${voice}">${escapeXml(text)}</voice>
</speak>`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      'User-Agent': 'game-nghieng-dau-tts-proxy'
    },
    body: ssml
  });

  if(!res.ok){
    const msg = await res.text().catch(() => '');
    throw new Error(`Azure TTS failed: ${res.status} ${msg}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return { contentType: 'audio/mpeg', bytes: buf };
}

async function synthGoogle(text){
  const key = process.env.GOOGLE_TTS_API_KEY;
  const voice = process.env.GOOGLE_TTS_VOICE || 'vi-VN-Wavenet-A';

  if(!key){
    throw new Error('Missing GOOGLE_TTS_API_KEY');
  }

  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`;
  const payload = {
    input: { text },
    voice: { languageCode: 'vi-VN', name: voice },
    audioConfig: { audioEncoding: 'MP3' }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if(!res.ok){
    const msg = await res.text().catch(() => '');
    throw new Error(`Google TTS failed: ${res.status} ${msg}`);
  }

  const json = await res.json();
  const audioContent = json && json.audioContent;
  if(!audioContent) throw new Error('Google TTS: missing audioContent');

  const buf = Buffer.from(audioContent, 'base64');
  return { contentType: 'audio/mpeg', bytes: buf };
}

async function synthFpt(text){
  const key = process.env.FPT_TTS_API_KEY;
  const voice = process.env.FPT_TTS_VOICE || 'banmai';
  const speed = process.env.FPT_TTS_SPEED;

  if(!key){
    throw new Error('Missing FPT_TTS_API_KEY environment variable');
  }

  const endpoint = 'https://api.fpt.ai/hmi/tts/v5';
  const headers = {
    'api_key': key,
    'voice': voice,
    'Content-Type': 'text/plain; charset=utf-8'
  };
  if(speed) headers['speed'] = String(speed);

  console.log(`[FPT] Calling API with voice=${voice}, speed=${speed || 'default'}`);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: text
  });

  if(!res.ok){
    const msg = await res.text().catch(() => '');
    console.error(`[FPT] API returned ${res.status}: ${msg}`);
    throw new Error(`FPT TTS failed: ${res.status} ${msg}`);
  }

  const json = await res.json().catch(() => null);
  console.log(`[FPT] API Response:`, JSON.stringify(json));
  
  const asyncUrl = json && (json.async || json.url || json.data || json.message);
  const err = json && (json.error ?? json.err ?? 0);

  if(err && Number(err) !== 0){
    console.error(`[FPT] Error code ${err} in response`);
    throw new Error(`FPT TTS error: ${JSON.stringify(json)}`);
  }

  if(!asyncUrl || typeof asyncUrl !== 'string' || !asyncUrl.startsWith('http')){
    console.error(`[FPT] No valid async URL found in response`);
    throw new Error(`FPT TTS: missing async url: ${JSON.stringify(json)}`);
  }

  console.log(`[FPT] Polling async URL: ${asyncUrl}`);
  // Poll the async URL until it returns audio
  const maxAttempts = 60;
  for(let i = 0; i < maxAttempts; i++){
    const r = await fetch(asyncUrl, { method: 'GET' });
    const ct = (r.headers.get('content-type') || '').toLowerCase();

    console.log(`[FPT] Poll attempt ${i+1}/${maxAttempts}: status=${r.status}, content-type=${ct}`);
    
    if(r.ok && (ct.includes('audio/') || ct.includes('application/octet-stream'))){
      const buf = Buffer.from(await r.arrayBuffer());
      console.log(`[FPT] Audio ready! Size: ${buf.length} bytes`);
      return { contentType: ct.includes('audio/') ? ct.split(';')[0] : 'audio/mpeg', bytes: buf };
    }

    await sleep(700);
  }

  console.error(`[FPT] Timeout waiting for audio after ${maxAttempts} attempts`);
  throw new Error('FPT TTS: audio not ready (timeout)');
}

const server = http.createServer(async (req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  setCors(res);

  if(req.method === 'OPTIONS'){
    console.log(`[REQUEST] OPTIONS preflight OK`);
    res.writeHead(204);
    res.end();
    return;
  }

  const u = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if(u.pathname === '/'){
    console.log(`[REQUEST] Root path, returning OK`);
    send(res, 200, { 'Content-Type': 'text/plain; charset=utf-8' },
      'OK. Use GET /tts?text=...\n');
    return;
  }

  if(u.pathname !== '/tts'){
    console.log(`[REQUEST] Invalid path: ${u.pathname}`);
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
    return;
  }

  const text = (u.searchParams.get('text') || '').trim();
  if(!text){
    console.log(`[REQUEST] Missing text parameter`);
    send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Missing text');
    return;
  }

  console.log(`[TTS] Synthesizing text: "${text.substring(0, 50)}..."`);
  try{
    let out;
    if(provider === 'google') out = await synthGoogle(text);
    else if(provider === 'azure') out = await synthAzure(text);
    else out = await synthFpt(text);

    console.log(`[TTS] Success! Returning ${out.bytes.length} bytes (${out.contentType})`);
    send(res, 200, {
      'Content-Type': out.contentType,
      'Cache-Control': 'no-store'
    }, out.bytes);
  } catch (e){
    console.error(`[TTS] ERROR: ${e.message}`);
    send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, String(e && e.message ? e.message : e));
  }
});

server.listen(port, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[STARTUP] TTS proxy listening on http://localhost:${port}`);
  console.log(`[STARTUP] Provider: ${provider.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);
});

server.on('error', (err) => {
  if(err.code === 'EADDRINUSE'){
    console.error(`\n[ERROR] Port ${port} is already in use!`);
    console.error(`Kill the existing process or use different port:`);
    console.error(`  $env:PORT=8788; node tts-proxy.mjs\n`);
  } else {
    console.error(`[ERROR] Server error:`, err);
  }
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(`[UNHANDLED REJECTION] ${err.message}`);
});

process.on('uncaughtException', (err) => {
  console.error(`[UNCAUGHT EXCEPTION] ${err.message}`);
  process.exit(1);
});
