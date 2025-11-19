// style-dictionary.config.mjs
import fs from 'node:fs';
import StyleDictionary from 'style-dictionary';
import { registerTransforms } from '@tokens-studio/sd-transforms';

// Register Tokens Studio transforms
registerTransforms(StyleDictionary);

// Append 'px' to numeric spacing/size/density values for CSS outputs
const needsPx = (token) => {
  const p = token.path?.join('/') || '';
  return (
    typeof token.value === 'number' &&
    (p.includes('_space_primitive') || p.includes('_size_primitive') || p.includes('density'))
  );
};

StyleDictionary.registerTransform({
  name: 'value/px-if-size-space-density',
  type: 'value',
  matcher: needsPx,
  transformer: (token) => `${token.value}px`,
});

// Transform groups
StyleDictionary.registerTransformGroup({
  name: 'tokens-studio-css',
  transforms: [
    'attribute/cti',
    'name/cti/kebab',
    'color/hex',
    'tokens-studio/expand',
    'tokens-studio/resolve',
    'value/px-if-size-space-density',
  ],
});

StyleDictionary.registerTransformGroup({
  name: 'tokens-studio-json',
  transforms: [
    'attribute/cti',
    'name/cti/kebab',
    'color/hex',
    'tokens-studio/expand',
    'tokens-studio/resolve',
  ],
});

// Guard
if (!fs.existsSync('src/processed-tokens')) {
  console.warn('⚠️  Missing src/processed-tokens — run `npm run prebuild` first.');
}

export default {
  source: ['src/processed-tokens/*.json'],

  platforms: {
    // ===== BASE =====
    base_json: {
      transformGroup: 'tokens-studio-json',
      buildPath: 'build/base/',
      files: [
        { destination: 'base.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('base.json') },
      ],
    },
    base_css: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/base/',
      files: [
        { destination: 'base.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('base.json'), options: { outputReferences: false } },
      ],
    },

    // ===== BRAND =====
    brand_json: {
      transformGroup: 'tokens-studio-json',
      buildPath: 'build/brand/',
      files: [
        { destination: 'brand-bild.json',        format: 'json/nested', filter: (t) => t.filePath.endsWith('brand-bild.json') },
        { destination: 'brand-sportbild.json',   format: 'json/nested', filter: (t) => t.filePath.endsWith('brand-sportbild.json') },
        { destination: 'brand-advertorial.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('brand-advertorial.json') },
        { destination: 'brand-colors-bild.json',      format: 'json/nested', filter: (t) => t.filePath.endsWith('brand-colors-bild.json') },
        { destination: 'brand-colors-sportbild.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('brand-colors-sportbild.json') }
      ],
    },
    brand_css: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/brand/',
      files: [
        { destination: 'brand-bild.css',        format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-bild.json') },
        { destination: 'brand-sportbild.css',   format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-sportbild.json') },
        { destination: 'brand-advertorial.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-advertorial.json') },
        { destination: 'brand-colors-bild.css',      format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-colors-bild.json') },
        { destination: 'brand-colors-sportbild.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-colors-sportbild.json') }
      ],
    },

    // ===== DENSITY =====
    density_json: {
      transformGroup: 'tokens-studio-json',
      buildPath: 'build/density/',
      files: [
        { destination: 'density-compact.json',  format: 'json/nested', filter: (t) => t.filePath.endsWith('density-compact.json') },
        { destination: 'density-default.json',  format: 'json/nested', filter: (t) => t.filePath.endsWith('density-default.json') },
        { destination: 'density-spacious.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('density-spacious.json') },
      ],
    },
    density_css: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/density/',
      files: [
        { destination: 'density-compact.css',  format: 'css/variables', filter: (t) => t.filePath.endsWith('density-compact.json') },
        { destination: 'density-default.css',  format: 'css/variables', filter: (t) => t.filePath.endsWith('density-default.json') },
        { destination: 'density-spacious.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('density-spacious.json') },
      ],
    },

    // ===== SEMANTIC (Color + Breakpoints) =====
    semantic_json: {
      transformGroup: 'tokens-studio-json',
      buildPath: 'build/semantic/',
      files: [
        { destination: 'color-light.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('color-light.json') },
        { destination: 'color-dark.json',  format: 'json/nested', filter: (t) => t.filePath.endsWith('color-dark.json')  },
        { destination: 'breakpoint-xs.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('breakpoint-xs.json') },
        { destination: 'breakpoint-sm.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('breakpoint-sm.json') },
        { destination: 'breakpoint-md.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('breakpoint-md.json') },
        { destination: 'breakpoint-lg.json', format: 'json/nested', filter: (t) => t.filePath.endsWith('breakpoint-lg.json') },
      ],
    },
    semantic_css: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/semantic/',
      files: [
        { destination: 'color-light.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('color-light.json') },
        { destination: 'color-dark.css',  format: 'css/variables', filter: (t) => t.filePath.endsWith('color-dark.json')  },
        { destination: 'breakpoint-xs.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-xs.json') },
        { destination: 'breakpoint-sm.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-sm.json') },
        { destination: 'breakpoint-md.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-md.json') },
        { destination: 'breakpoint-lg.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-lg.json') },
      ],
    },
  },
};
