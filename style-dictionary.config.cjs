// style-dictionary.config.cjs
const fs = require('node:fs');
const StyleDictionary = require('style-dictionary');
const { registerTransforms } = require('@tokens-studio/sd-transforms');

// Register Tokens Studio transforms (expand/resolve etc.)
registerTransforms(StyleDictionary);

// Custom transform: append 'px' to numeric values for space/size/density in CSS outputs
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

// CSS group (with px appending)
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

// JSON group (raw values, no px)
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

// Guard (for CI logs)
if (!fs.existsSync('src/processed-tokens')) {
  console.warn('⚠️  Missing src/processed-tokens — did you run `npm run prebuild`?');
}

module.exports = {
  // Consume preprocessed sources created by scripts/parse-figma-variables.mjs
  source: ['src/processed-tokens/*.json'],

  platforms: {
    // 1) Base primitives
    base: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/base/',
      files: [
        {
          destination: 'base.json',
          format: 'json/nested',
          // Force JSON group for this file
          options: { transformGroup: 'tokens-studio-json' },
          filter: (t) => t.filePath.endsWith('base.json'),
        },
        {
          destination: 'base.css',
          format: 'css/variables',
          filter: (t) => t.filePath.endsWith('base.json'),
          options: { outputReferences: false },
        },
      ],
    },

    // 2) Brand mappings
    brand: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/brand/',
      files: [
        { destination: 'brand-bild.json',        format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('brand-bild.json') },
        { destination: 'brand-sportbild.json',   format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('brand-sportbild.json') },
        { destination: 'brand-advertorial.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('brand-advertorial.json') },

        { destination: 'brand-bild.css',        format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-bild.json') },
        { destination: 'brand-sportbild.css',   format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-sportbild.json') },
        { destination: 'brand-advertorial.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-advertorial.json') },

        { destination: 'brand-colors-bild.json',      format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('brand-colors-bild.json') },
        { destination: 'brand-colors-sportbild.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('brand-colors-sportbild.json') },

        { destination: 'brand-colors-bild.css',      format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-colors-bild.json') },
        { destination: 'brand-colors-sportbild.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('brand-colors-sportbild.json') },
      ],
    },

    // 3) Density (compact/default/spacious)
    density: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/density/',
      files: [
        { destination: 'density-compact.json',  format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('density-compact.json') },
        { destination: 'density-default.json',  format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('density-default.json') },
        { destination: 'density-spacious.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('density-spacious.json') },

        { destination: 'density-compact.css',  format: 'css/variables', filter: (t) => t.filePath.endsWith('density-compact.json') },
        { destination: 'density-default.css',  format: 'css/variables', filter: (t) => t.filePath.endsWith('density-default.json') },
        { destination: 'density-spacious.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('density-spacious.json') },
      ],
    },

    // 4) Semantic (Color + Breakpoints)
    semantic: {
      transformGroup: 'tokens-studio-css',
      buildPath: 'build/semantic/',
      files: [
        // Color modes
        { destination: 'color-light.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('color-light.json') },
        { destination: 'color-dark.json',  format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('color-dark.json')  },
        { destination: 'color-light.css',  format: 'css/variables', filter: (t) => t.filePath.endsWith('color-light.json') },
        { destination: 'color-dark.css',   format: 'css/variables', filter: (t) => t.filePath.endsWith('color-dark.json')  },

        // Breakpoints (one file per mode)
        { destination: 'breakpoint-xs.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('breakpoint-xs.json') },
        { destination: 'breakpoint-sm.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('breakpoint-sm.json') },
        { destination: 'breakpoint-md.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('breakpoint-md.json') },
        { destination: 'breakpoint-lg.json', format: 'json/nested', options: { transformGroup: 'tokens-studio-json' }, filter: (t) => t.filePath.endsWith('breakpoint-lg.json') },

        { destination: 'breakpoint-xs.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-xs.json') },
        { destination: 'breakpoint-sm.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-sm.json') },
        { destination: 'breakpoint-md.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-md.json') },
        { destination: 'breakpoint-lg.css', format: 'css/variables', filter: (t) => t.filePath.endsWith('breakpoint-lg.json') },
      ],
    },
  },
};
