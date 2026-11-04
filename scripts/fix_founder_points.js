/* Filter ITCHOTELS & VOGL founder points to ITC's exact 23 point IDs, then re-encrypt founder_data.enc (AES-256-GCM + gzip). Envelope field encoding is standard base64 (atob/btoa compatible, with padding). */
const fs = require('fs');
const zlib = require('zlib');

const ENC_PATH = 'founder_data.enc';
const PASSWORD = 'dr.timothysuraj@gmail.com:Loginme1';
const PBKDF2_ITER = 100000;

function b64Decode(s) {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(t + '='.repeat((4 - t.length % 4) % 4), 'base64');
}
function b64Encode(bytes) { return Buffer.from(bytes).toString('base64'); }

(async () => {
  const env = JSON.parse(fs.readFileSync(ENC_PATH, 'utf8'));
  if (env.gz !== true) throw new Error('expected gz envelope');

  const enc = new TextEncoder();
  const salt = b64Decode(env.s);
  const km = await crypto.subtle.importKey('raw', enc.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
  const dk = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);

  const iv = b64Decode(env.iv);
  const ct = b64Decode(env.ct);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dk, ct);
  let data = new Uint8Array(dec);
  data = zlib.gunzipSync(Buffer.from(data)); // envelope plaintext is gzip
  const FD = JSON.parse(new TextDecoder().decode(data));

  const itc = FD.ITC;
  const itcIds = itc.points.map(p => p.id);
  const itcIdSet = new Set(itcIds);
  console.log('ITC points:', itcIds.length, itcIds.join(','));

  for (const t of ['ITCHOTELS', 'VOGL']) {
    const e = FD[t];
    const before = e.points.map(p => p.id);
    const kept = itcIds.map(id => e.points.find(p => p.id === id)).filter(Boolean);
    if (kept.length !== itcIds.length) throw new Error(`${t}: could not retain all 23 ITC ids (kept ${kept.length})`);
    e.points = kept;
    const after = e.points.map(p => p.id);
    console.log(`${t}: ${before.length} -> ${after.length} points; extras removed:`, before.filter(x => !itcIdSet.has(x)));
    if (after.join(',') !== itcIds.join(',')) throw new Error(`${t}: final ids do not match ITC`);
  }

  const plaintext = new TextEncoder().encode(JSON.stringify(FD));
  const gzipped = zlib.gzipSync(plaintext);
  console.log('gzip magic bytes:', gzipped[0].toString(16), gzipped[1].toString(16)); // expect 1f 8b

  const newIv = crypto.getRandomValues(new Uint8Array(12));
  const newEnv = { s: env.s, iv: b64Encode(newIv), gz: true };
  const km2 = await crypto.subtle.importKey('raw', enc.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
  const dk2 = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    km2, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: newIv }, dk2, gzipped);
  newEnv.ct = b64Encode(Array.from(new Uint8Array(ct2)));
  fs.writeFileSync(ENC_PATH, JSON.stringify(newEnv));
  console.log('wrote', ENC_PATH);

  // Round-trip verify (same scheme as founder.html / app.js: atob + DecompressionStream gzip)
  const env2 = JSON.parse(fs.readFileSync(ENC_PATH, 'utf8'));
  const iv2 = b64Decode(env2.iv);
  const ct2b = b64Decode(env2.ct);
  const dk3 = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', enc.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']),
    { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const dec2 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv2 }, dk3, ct2b);
  const data2 = zlib.gunzipSync(Buffer.from(new Uint8Array(dec2)));
  const FD2 = JSON.parse(new TextDecoder().decode(data2));
  for (const t of ['ITC', 'ITCHOTELS', 'VOGL']) {
    const ids = FD2[t].points.map(p => p.id);
    console.log(`VERIFY ${t}: points=${ids.length} idsMatchITC=${t === 'ITC' ? 'n/a' : ids.join(',') === itcIds.join(',')}`);
  }
  console.log('DONE');
})().catch(err => { console.error('FATAL', err); process.exit(1); });
