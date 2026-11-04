#!/usr/bin/env python3
"""
Re-encrypt the LojikGain Founder vault (founder_data.enc) with a NEW passphrase.

Run this after you change the founder password. It writes an envelope in the exact
format the site's decryptor expects (founder.html / app.js):

  envelope = {"s": <b64 salt>, "iv": <b64 iv>, "ct": <b64 ciphertext>, "gz": true}
  key      = PBKDF2-HMAC-SHA256(passphrase, salt, 100000 iters, dkLen=32)
  ct       = AES-256-GCM(key, iv).encrypt(gzip(plaintext_json))

The app's passphrase is "<email-lowercased>:<password>", so pass the SAME email and
the NEW password and the site will unlock with them.

Usage:
  python3 tools/reencrypt_founder.py founder_data.json founder_data.enc --email you@example.com
  LOJIK_NEW_PASS='...' python3 tools/reencrypt_founder.py in.json out.enc --email you@example.com

The plaintext is the JSON you get by decrypting the current .enc (the object stored
in window.FOUNDER_DATA). Keep that file off the web.
"""
import argparse, base64, gzip, hashlib, json, os, secrets, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plaintext'); ap.add_argument('outfile')
    ap.add_argument('--email', required=True)
    ap.add_argument('--iterations', type=int, default=100000)
    ap.add_argument('--no-gzip', action='store_true')
    a = ap.parse_args()

    password = os.environ.get('LOJIK_NEW_PASS')
    if not password:
        import getpass
        password = getpass.getpass('New founder password: ')
        if getpass.getpass('Confirm: ') != password:
            sys.exit('Passwords do not match.')

    raw = open(a.plaintext, 'rb').read()
    try:
        raw = json.dumps(json.loads(raw.decode('utf-8')), separators=(',', ':')).encode('utf-8')
    except Exception:
        pass

    salt = secrets.token_bytes(16)
    iv = secrets.token_bytes(12)
    passphrase = a.email.strip().lower() + ':' + password.strip()
    key = hashlib.pbkdf2_hmac('sha256', passphrase.encode('utf-8'), salt, a.iterations, dklen=32)

    data = raw if a.no_gzip else gzip.compress(raw)
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    ct = AESGCM(key).encrypt(iv, data, None)

    env = {'s': base64.b64encode(salt).decode(),
           'iv': base64.b64encode(iv).decode(),
           'ct': base64.b64encode(ct).decode(),
           'gz': not a.no_gzip}
    with open(a.outfile, 'w', encoding='utf-8') as f:
        json.dump(env, f)
    print('Wrote', a.outfile, '(%d bytes ciphertext)' % len(ct))

if __name__ == '__main__':
    main()
