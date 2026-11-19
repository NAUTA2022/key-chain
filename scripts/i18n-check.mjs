// i18n check: every language has exactly the keys of the Spanish source, and every
// t('key') used in the code exists in the namespaces that file loads with useT('ns').
// Usage: npm run i18n:check   (exit code 1 on problems)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOCALES = path.join(ROOT, 'app', 'i18n', 'locales');
const SOURCE = 'es';
const problems = [];

const flatten = (v, prefix = '', out = new Map()) => {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
  } else out.set(prefix, Array.isArray(v) ? `array(${v.length})` : typeof v);
  return out;
};
const read = (lang, ns) => JSON.parse(fs.readFileSync(path.join(LOCALES, lang, `${ns}.json`), 'utf8'));

const langs = fs.readdirSync(LOCALES).filter(d => fs.statSync(path.join(LOCALES, d)).isDirectory());
const namespaces = fs.readdirSync(path.join(LOCALES, SOURCE)).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const sourceKeys = {};
for (const ns of namespaces) {
  const src = flatten(read(SOURCE, ns)); sourceKeys[ns] = src;
  for (const lang of langs.filter(l => l !== SOURCE)) {
    let other;
    try { other = flatten(read(lang, ns)); } catch { problems.push(`${lang}/${ns}.json missing or invalid`); continue; }
    for (const [k, kind] of src) {
      if (!other.has(k)) problems.push(`${lang}/${ns}: missing "${k}"`);
      else if (other.get(k) !== kind) problems.push(`${lang}/${ns}: "${k}" is ${other.get(k)}, source is ${kind}`);
    }
    for (const k of other.keys()) if (!src.has(k)) problems.push(`${lang}/${ns}: extra "${k}"`);
  }
}

// keys used in the code
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx|ts)$/.test(e.name) ? [path.join(d, e.name)] : []));
let used = 0;
for (const file of walk(path.join(ROOT, 'app')).filter(f => !f.includes(`${path.sep}i18n${path.sep}`))) {
  const code = fs.readFileSync(file, 'utf8');
  const nss = [...code.matchAll(/useT\(\s*'([\w-]+)'\s*\)/g)].map(m => m[1]);
  if (!nss.length) continue;
  for (const ns of nss) if (!sourceKeys[ns]) problems.push(`${path.relative(ROOT, file)}: unknown namespace "${ns}"`);
  for (const m of code.matchAll(/\b(?:t|raw)\(\s*'([\w.-]+)'/g)) {
    used++;
    const key = m[1];
    const ok = nss.some(ns => sourceKeys[ns] && [...sourceKeys[ns].keys()].some(k => k === key || k.startsWith(key + '.')));
    if (!ok) problems.push(`${path.relative(ROOT, file)}: key "${key}" not found in ${nss.join(', ')}`);
  }
}

if (problems.length) {
  console.error(problems.slice(0, 200).join('\n'));
  console.error(`\n✖ ${problems.length} i18n problem(s)`);
  process.exit(1);
}
console.log(`✓ i18n: ${namespaces.length} namespaces × ${langs.length} languages consistent, ${used} keys used in code all defined`);
