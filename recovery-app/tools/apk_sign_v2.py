"""Sign an APK with APK Signature Scheme v2 (enough for Android 7.0+, the app's minSdk 24).
Usage: python3 apk_sign_v2.py in.apk out.apk key.p12 password-file
Follows https://source.android.com/docs/security/features/apksigning/v2 : chunked SHA-256 digests over
the zip entries, central directory and EOCD; RSASSA-PKCS1-v1_5 with SHA-256 (algorithm 0x0103)."""
import hashlib, struct, sys
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12

ALGO = 0x0103
V2_ID = 0x7109871A
MAGIC = b'APK Sig Block 42'

u32 = lambda n: struct.pack('<I', n)
u64 = lambda n: struct.pack('<Q', n)
lp = lambda b: u32(len(b)) + b            # length-prefixed
seq = lambda items: lp(b''.join(lp(i) for i in items))

def find_eocd(data):
    i = data.rfind(b'PK\x05\x06', max(0, len(data) - 65557))
    if i < 0: raise SystemExit('no end of central directory')
    cd_size, cd_off = struct.unpack('<II', data[i + 12:i + 20])
    if cd_off + cd_size != i: raise SystemExit('central directory not directly before EOCD (zip64 or junk)')
    if data[cd_off - 16:cd_off] == MAGIC: raise SystemExit('already signed')
    return i, cd_off

def digest(sections):
    chunks = []
    for s in sections:
        for k in range(0, len(s), 1 << 20):
            c = s[k:k + (1 << 20)]
            chunks.append(hashlib.sha256(b'\xa5' + u32(len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + u32(len(chunks)) + b''.join(chunks)).digest()

def main(src, dst, p12, passfile):
    data = open(src, 'rb').read()
    pw = open(passfile, 'rb').read().strip()
    key, cert, _ = pkcs12.load_key_and_certificates(open(p12, 'rb').read(), pw)
    eocd_at, cd_off = find_eocd(data)
    entries, cd, eocd = data[:cd_off], data[cd_off:eocd_at], data[eocd_at:]
    d = digest([entries, cd, eocd])        # EOCD still points at cd_off, as the spec requires
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    spki = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signed_data = seq([u32(ALGO) + lp(d)]) + seq([cert_der]) + seq([])
    sig = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    signer = lp(signed_data) + seq([u32(ALGO) + lp(sig)]) + lp(spki)
    v2 = seq([signer])
    pair = u64(4 + len(v2)) + u32(V2_ID) + v2
    size = len(pair) + 8 + 16
    block = u64(size) + pair + u64(size) + MAGIC
    new_eocd = eocd[:16] + u32(cd_off + len(block)) + eocd[20:]
    open(dst, 'wb').write(entries + block + cd + new_eocd)
    print('signed', dst, len(entries + block + cd + new_eocd), 'bytes; cert sha256', hashlib.sha256(cert_der).hexdigest())

if __name__ == '__main__':
    main(*sys.argv[1:5])
