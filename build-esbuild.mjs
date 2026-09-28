import * as esbuild from 'esbuild';
import { cpSync, readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync } from 'fs';

const OUT = 'dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const ENV = { VITE_ANTHROPIC_KEY: '', MODE: 'production', DEV: false, PROD: true, BASE_URL: '/' };

// Plugin: reemplaza thirdweb con stubs ligeros (solo para el build estático en preview).
// En tu máquina, usa `npm run dev` — ahí thirdweb real funciona sin problema.
const thirdwebStub = {
  name: 'thirdweb-stub',
  setup(build) {
    build.onResolve({ filter: /^thirdweb(\/.*)?$/ }, (args) => ({
      path: args.path, namespace: 'tw-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'tw-stub' }, (args) => {
      if (args.path === 'thirdweb/react') {
        return { contents: `
import { createElement } from 'react';
export function ThirdwebProvider({ children }) { return children; }
export function ConnectButton() {
  return createElement('button', {
    style: { padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
      background: 'linear-gradient(135deg,#7c5cff,#5b8cff)', color: '#fff', fontWeight: 700, fontSize: 14 },
    onClick: () => alert('Conexión de wallet deshabilitada en esta previsualización. Usa "npm run dev" en tu Mac para tener la wallet real.'),
  }, 'Conectar Wallet');
}
export function useActiveAccount() { return undefined; }
export function useActiveWallet() { return undefined; }
export function useWalletBalance() { return { data: undefined, isLoading: false }; }
export function useConnect() { return { connect: () => {}, isConnecting: false }; }
export function useDisconnect() { return { disconnect: () => {} }; }
`, loader: 'js', resolveDir: process.cwd() };
      }
      if (args.path === 'thirdweb/chains') {
        return { contents: `export const polygon = { id: 137, name: 'Polygon' };
export const ethereum = { id: 1, name: 'Ethereum' };
export const defineChain = (x) => (typeof x === 'object' ? x : { id: x });`, loader: 'js' };
      }
      return { contents: `export function createThirdwebClient(opts) { return { clientId: (opts && opts.clientId) || '' }; }
export const getContract = () => ({});
export default { createThirdwebClient };`, loader: 'js' };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  outfile: `${OUT}/main.js`,
  format: 'iife',
  splitting: false,
  sourcemap: false,
  minify: false,
  target: ['es2020'],
  jsx: 'automatic',
  plugins: [thirdwebStub],
  loader: {
    '.js': 'jsx', '.png': 'file', '.jpg': 'file', '.jpeg': 'file',
    '.svg': 'file', '.gif': 'file', '.webp': 'file',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env': JSON.stringify(ENV),
    'global': 'globalThis',
  },
  logLevel: 'info',
});

cpSync('public', OUT, { recursive: true });

const jsEntry = 'main.js';
const cssEntry = readdirSync(OUT).find(f => f.endsWith('.css')) || null;

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KEY CHAIN</title>
  <link rel="icon" type="image/png" href="/icono.png">
  <link rel="stylesheet" href="/main.css">
</head>
<body>
  <div id="root"></div>
  <script src="/main.js"></script>
</body>
</html>`;
writeFileSync(`${OUT}/index.html`, html);

console.log('BUILD DONE. JS:', jsEntry, 'CSS:', cssEntry);
await esbuild.stop?.();
process.exit(0);
