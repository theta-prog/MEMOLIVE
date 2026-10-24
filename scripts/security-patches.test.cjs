const test = require('node:test');
const assert = require('node:assert/strict');
const forge = require('node-forge');
const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
const digest = () => forge.md.sha256.create().update('security regression');
test('accepts a normally signed SHA-256 message', () => {
  assert.equal(keys.publicKey.verify(digest().digest().bytes(), keys.privateKey.sign(digest())), true);
});
test('rejects an extra nested DigestAlgorithm element', () => {
  const a = forge.asn1;
  const node = (type, constructed, value) => a.create(a.Class.UNIVERSAL, type, constructed, value);
  const digestInfo = node(a.Type.SEQUENCE, true, [
    node(a.Type.SEQUENCE, true, [
      node(a.Type.OID, false, a.oidToDer(forge.pki.oids.sha256).getBytes()),
      node(a.Type.NULL, false, ''),
      node(a.Type.OCTETSTRING, false, 'unconsumed garbage'),
    ]),
    node(a.Type.OCTETSTRING, false, digest().digest().bytes()),
  ]);
  const invalid = keys.privateKey.sign(a.toDer(digestInfo).getBytes(), 'NONE');
  assert.throws(() => keys.publicKey.verify(digest().digest().bytes(), invalid), /DigestInfo/);
});
