import { generateKeyPair, exportSPKI, exportPKCS8 } from 'jose';

async function main() {
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const spki = await exportSPKI(publicKey);
  const pkcs8 = await exportPKCS8(privateKey);

  console.log('--- PUBLIC KEY (Put in .env.local) ---');
  // Escape newlines for .env
  console.log(`VITE_APP_PUBLIC_KEY="${spki.replace(/\n/g, '\\n')}"`);
  console.log('\n--- PRIVATE KEY (Keep Secret / Use for Admin) ---');
  console.log(`ADMIN_PRIVATE_KEY="${pkcs8.replace(/\n/g, '\\n')}"`);
}

main();
