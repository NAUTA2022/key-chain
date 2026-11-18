// Post-build steps for static hosting:
// 1. Expose the prerendered 404 page as /404.html so the host returns it with
//    a real 404 status for unknown URLs (instead of a "soft 404").
import { copyFile, access } from 'node:fs/promises';

const OUT = 'build/client';
const src = `${OUT}/404/index.html`;
try {
  await access(src);
  await copyFile(src, `${OUT}/404.html`);
  console.log('postbuild: wrote build/client/404.html');
} catch {
  console.error('postbuild: prerendered 404 page not found at', src);
  process.exit(1);
}
