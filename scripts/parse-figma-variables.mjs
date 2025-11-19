// scripts/parse-figma-variables.mjs
// Converts VariableVisualizer export to SD-friendly JSON per layer/mode.

import fs from 'node:fs';
import path from 'node:path';

const INPUT = path.resolve('src/design-tokens/BILD Design System-variables-full.json');
const OUTDIR = path.resolve('src/processed-tokens');

if (!fs.existsSync(INPUT)) {
  console.error(`❌ Input not found: ${INPUT}`);
  process.exit(1);
}
fs.mkdirSync(OUTDIR, { recursive: true });

const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
const collections = data.collections || [];

// Build index for alias resolution
const varById = new Map();
for (const col of collections) {
  for (const v of col.variables) {
    varById.set(v.id, { collection: col.name, var: v });
  }
}

const kebab = (s) => {
  return String(s)
    .replace(/\([^)]*\)/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^\d/, (m) => 'x' + m) // avoid leading digits
    .toLowerCase() || 'x';
};
const toPath = (name) => name.split('/').filter(Boolean).map(kebab);

const rgbaToHex = (c) => {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  if (c.a == null || c.a === 1) return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  const a = Math.round(c.a * 255);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}${a.toString(16).padStart(2,'0')}`;
};

const assignNested = (obj, pathArr, value) => {
  let cur = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    cur[key] = cur[key] || {};
    cur = cur[key];
  }
  cur[pathArr[pathArr.length - 1]] = value;
};

const resolveValue = (v, modeId, stack = new Set()) => {
  const raw = v.valuesByMode?.[modeId];
  if (raw == null) return null;

  // VARIABLE_ALIAS → follow id
  if (typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS') {
    const refId = raw.id;
    if (!refId || stack.has(refId) || !varById.has(refId)) return null;
    stack.add(refId);
    const { var: refVar } = varById.get(refId);
    return resolveValue(refVar, modeId, stack);
  }

  // RGBA → hex
  if (typeof raw === 'object' && 'r' in raw && 'g' in raw && 'b' in raw) {
    return rgbaToHex(raw);
  }

  // boolean/string/float as-is
  return raw;
};

// Buckets → filename mapping helpers
const outputs = new Map(); // filename -> object

const out = (filename) => {
  if (!outputs.has(filename)) outputs.set(filename, {});
  return outputs.get(filename);
};

const BASE_COLLECTIONS = new Set(['_ColorPrimitive', '_SpacePrimitive', '_SizePrimitive', '_FontPrimitive']);

for (const col of collections) {
  // Base (no explicit modes beyond "Value")
  if (BASE_COLLECTIONS.has(col.name)) {
    const modeId = col.modes?.[0]?.modeId;
    if (!modeId) continue;
    for (const v of col.variables) {
      const val = resolveValue(v, modeId);
      if (val == null) continue;
      assignNested(out('base.json'), [kebab(col.name), ...toPath(v.name)], val);
    }
  }

  // Brand Token Mapping (spacing/sizing/type)
  if (col.name === 'BrandTokenMapping') {
    for (const m of col.modes || []) {
      const file = `brand-${kebab(m.name)}.json`;
      for (const v of col.variables) {
        const val = resolveValue(v, m.modeId);
        if (val == null) continue;
        assignNested(out(file), ['brand-token-mapping', ...toPath(v.name)], val);
      }
    }
  }

  // Brand Color Mapping
  if (col.name === 'BrandColorMapping') {
    for (const m of col.modes || []) {
      const file = `brand-colors-${kebab(m.name)}.json`;
      for (const v of col.variables) {
        const val = resolveValue(v, m.modeId);
        if (val == null) continue;
        assignNested(out(file), ['brand-color-mapping', ...toPath(v.name)], val);
      }
    }
  }

  // Density
  if (col.name === 'Density') {
    for (const m of col.modes || []) {
      const file = `density-${kebab(m.name)}.json`;
      for (const v of col.variables) {
        const val = resolveValue(v, m.modeId);
        if (val == null) continue;
        assignNested(out(file), ['density', ...toPath(v.name)], val);
      }
    }
  }

  // Semantic: Color Mode (Light/Dark)
  if (col.name === 'ColorMode') {
    for (const m of col.modes || []) {
      const file = `color-${kebab(m.name)}.json`;
      for (const v of col.variables) {
        const val = resolveValue(v, m.modeId);
        if (val == null) continue;
        assignNested(out(file), ['color-mode', ...toPath(v.name)], val);
      }
    }
  }

  // Semantic: Breakpoint Mode (XS/SM/MD/LG)
  if (col.name === 'BreakpointMode') {
    for (const m of col.modes || []) {
      // examples: "XS - 320px", "SM - 390px (compact)" → use first token before space/hyphen
      const key = kebab(m.name.split(' ')[0]);
      const file = `breakpoint-${key}.json`;
      for (const v of col.variables) {
        const val = resolveValue(v, m.modeId);
        if (val == null) continue;
        assignNested(out(file), ['breakpoint-mode', key, ...toPath(v.name)], val);
      }
    }
  }
}

// Write files
for (const [filename, obj] of outputs.entries()) {
  const target = path.join(OUTDIR, filename);
  fs.writeFileSync(target, JSON.stringify(obj, null, 2), 'utf-8');
  console.log(`✓ Wrote ${path.relative(process.cwd(), target)}`);
}

console.log(`\n✨ Generated ${outputs.size} token sources in ${path.relative(process.cwd(), OUTDIR)}`);
