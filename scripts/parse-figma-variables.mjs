import fs from 'fs';
import path from 'path';

// Paths
const figmaInputPath = 'src/design-tokens/BILD Design System-variables-full.json';
const outputDir = 'tokens';

// Load the raw Figma variables JSON
const figmaData = JSON.parse(fs.readFileSync(figmaInputPath, 'utf-8'));

// Prepare a lookup for variable IDs to token name (for resolving aliases)
const idToTokenPath = {};
for (const collection of figmaData.collections) {
  for (const variable of collection.variables) {
    idToTokenPath[variable.id] = variable.name;
  }
}

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Utility: write a token object to a nested JSON structure
const writeToken = (fileMap, tokenPath, value, attributes = {}) => {
  // Traverse or create nested structure according to path segments
  const segments = tokenPath.split('/');
  let obj = fileMap;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    obj[seg] = obj[seg] || {};  // create nested object if not exists
    obj = obj[seg];
  }
  const lastKey = segments[segments.length - 1];
  obj[lastKey] = {}; 
  obj[lastKey].value = value;
  // Only add attributes if provided
  if (Object.keys(attributes).length) {
    obj[lastKey].attributes = attributes;
  }
};

// Containers for each output JSON file content
const tokensByFile = {};

// Determine mode IDs for primary brand "BILD" (for collections that have brand modes)
let bildBrandModeId = {};
for (const collection of figmaData.collections) {
  if ((collection.name === 'BrandColorMapping' || collection.name === 'BrandTokenMapping') && collection.modes) {
    const bildMode = collection.modes.find(m => m.name === 'BILD');
    if (bildMode) {
      bildBrandModeId[collection.name] = bildMode.modeId;
    }
  }
}

// Process each collection in the Figma data
for (const collection of figmaData.collections) {
  const collName = collection.name;
  const modes = collection.modes || [];
  // Determine output file naming
  if (!modes.length || modes.length === 1) {
    // Single-mode collection (or no explicit modes)
    const fileName = `${collName.replace(/^_/, '').replace(/\s+/g, '')}.json`;
    tokensByFile[fileName] = {};

    // Use default mode (or only mode) values
    const modeId = collection.defaultModeId || (modes[0] ? modes[0].modeId : null);
    for (const variable of collection.variables) {
      const rawValue = variable.valuesByMode[modeId];
      let tokenValue;
      let tokenAttributes = {};

      // Check if value is an alias to another variable
      if (rawValue && typeof rawValue === 'object' && rawValue.type === 'VARIABLE_ALIAS') {
        const targetId = rawValue.id;
        const targetPath = idToTokenPath[targetId];
        if (targetPath) {
          // Convert to Style Dictionary reference format e.g. {Category.Subcategory.TokenName}
          const ref = targetPath.replace(/\//g, '.');
          tokenValue = `{${ref}}`;
        } else {
          tokenValue = null;
        }
      } else {
        tokenValue = rawValue;
      }

      // If color value is an RGBA object from Figma, keep it as an object (Style Dictionary will handle conversion)
      // If numeric (FLOAT) value, determine if it represents a size (dimension) or something else
      if (variable.resolvedType === 'FLOAT' && typeof tokenValue === 'number') {
        const nameSegments = variable.name.split('/');
        const topLevel = nameSegments[0].toLowerCase();
        if (topLevel === 'opacity') {
          // Convert opacity percentage (0–100 in Figma) to 0–1 range
          tokenValue = tokenValue / 100;
          // (No unit suffix added, as these will be used as unitless opacity values)
        } else if (variable.name.includes('FontWeight')) {
          // Font weight numeric values – leave as number with no unit
        } else {
          // All other floats are treated as sizes (pixel values)
          tokenAttributes.category = 'size';
        }
      }

      // Write this token to the appropriate JSON structure
      writeToken(tokensByFile[fileName], variable.name, tokenValue, tokenAttributes);
    }
  } else {
    // Multi-mode collections – split by each mode
    if (collName === 'BrandColorMapping' || collName === 'BrandTokenMapping') {
      // For brand-specific collections, only output the primary brand (BILD) tokens in this pipeline
      const modeId = bildBrandModeId[collName];
      const modeLabel = 'BILD';
      const fileName = `${collName.replace(/^_/, '').replace(/\s+/g, '')}-${modeLabel}.json`;
      tokensByFile[fileName] = {};

      for (const variable of collection.variables) {
        const rawValue = variable.valuesByMode[modeId];
        let tokenValue;
        let tokenAttributes = {};

        if (rawValue && typeof rawValue === 'object' && rawValue.type === 'VARIABLE_ALIAS') {
          const targetPath = idToTokenPath[rawValue.id];
          tokenValue = targetPath ? `{${targetPath.replace(/\//g, '.')}}` : null;
        } else {
          tokenValue = rawValue;
        }
        if (variable.resolvedType === 'FLOAT' && typeof tokenValue === 'number') {
          const topLevel = variable.name.split('/')[0].toLowerCase();
          if (topLevel === 'opacity') {
            tokenValue = tokenValue / 100;
          } else if (!variable.name.includes('FontWeight')) {
            tokenAttributes.category = 'size';
          }
        }
        writeToken(tokensByFile[fileName], variable.name, tokenValue, tokenAttributes);
      }
    } else if (collName === 'ColorMode' || collName === 'Density' || collName === 'BreakpointMode') {
      // Mode-based collections (themes, density, breakpoints)
      for (const mode of collection.modes) {
        // For BreakpointMode, simplify mode name (e.g. "XS" from "XS - 320px")
        const modeLabel = collName === 'BreakpointMode' ? mode.name.split(' ')[0] : mode.name;
        const fileName = `${collName.replace(/\s+/g, '')}-${modeLabel}.json`;
        tokensByFile[fileName] = {};

        const modeId = mode.modeId;
        for (const variable of collection.variables) {
          const rawValue = variable.valuesByMode[modeId];
          let tokenValue;
          let tokenAttributes = {};

          if (rawValue && typeof rawValue === 'object' && rawValue.type === 'VARIABLE_ALIAS') {
            const targetPath = idToTokenPath[rawValue.id];
            tokenValue = targetPath ? `{${targetPath.replace(/\//g, '.')}}` : null;
          } else {
            tokenValue = rawValue;
          }
          if (variable.resolvedType === 'FLOAT' && typeof tokenValue === 'number') {
            const topLevel = variable.name.split('/')[0].toLowerCase();
            if (topLevel === 'opacity') {
              tokenValue = tokenValue / 100;
            } else if (!variable.name.includes('FontWeight')) {
              tokenAttributes.category = 'size';
            }
          }
          writeToken(tokensByFile[fileName], variable.name, tokenValue, tokenAttributes);
        }
      }
    }
  }
}

// Write out each tokens JSON file
for (const [fileName, tokenData] of Object.entries(tokensByFile)) {
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(tokenData, null, 2));
}
console.log(`✅ Figma tokens parsed into ${Object.keys(tokensByFile).length} JSON files in '${outputDir}/'`);
