import mkcert from 'mkcert';
import fs from 'node:fs';
import path from 'node:path';

const CERT_DIR = path.resolve(process.cwd(), '.cert');

if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

console.log('Creating CA...');
const ca = await mkcert.createCA({
  organization: 'PDF Unlocker Dev CA',
  countryCode: 'US',
  state: 'Local',
  locality: 'Localhost',
  validity: 825,
});

fs.writeFileSync(path.join(CERT_DIR, 'ca.key'), ca.key);
fs.writeFileSync(path.join(CERT_DIR, 'ca.crt'), ca.cert);
console.log('CA written to .cert/ca.key and .cert/ca.crt');

console.log('Creating certificate...');
const cert = await mkcert.createCert({
  domains: ['127.0.0.1', 'localhost'],
  validity: 825,
  ca: { key: ca.key, cert: ca.cert },
});

fs.writeFileSync(path.join(CERT_DIR, 'cert.key'), cert.key);
fs.writeFileSync(path.join(CERT_DIR, 'cert.crt'), cert.cert);
console.log('Certificate written to .cert/cert.key and .cert/cert.crt');
console.log('Done. Run `pnpm dev` to start the HTTPS dev server.');
