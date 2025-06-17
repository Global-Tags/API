const glob = require('fast-glob');
const fs = require('fs');
const path = require('path');

const KEY_REGEX = /(['`])\$\.(\w+(?:\.\w+)+)(?=;;|\1|$)/g;
const LOCALE_FILE = path.resolve('locales/en_us.json');
const SRC_FILES = glob.sync(['src/**/*.ts'], { dot: false });

const localeData = JSON.parse(fs.readFileSync(LOCALE_FILE, 'utf-8'));
const flatLocaleKeys = flattenKeys(localeData);
const usedKeysMap = new Map();

for (const file of SRC_FILES) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = KEY_REGEX.exec(content)) !== null) {
    const key = match[2];
    if (!usedKeysMap.has(key)) usedKeysMap.set(key, new Set());
    usedKeysMap.get(key).add(file);
  }
}

const usedKeys = [...usedKeysMap.keys()];
const missingKeys = usedKeys.filter((key) => !flatLocaleKeys.has(key));
const unusedKeys = [...flatLocaleKeys].filter((key) => !usedKeysMap.has(key));

console.log('\n🔍 Localization Check Results:\n');

if (missingKeys.length) {
  console.log('❌ Missing keys in en_us.json:');
  missingKeys.forEach((key) => {
    const files = [...usedKeysMap.get(key)];
    files.forEach((file) => {
      console.log(`  - ${key} (${file})`);
    });
  });
} else {
  console.log('✅ No missing keys.');
}

if (unusedKeys.length) {
  console.log('\n⚠️ Unused keys in en_us.json:');
  unusedKeys.forEach((key) => console.log(`  - ${key}`));
  console.log(flatLocaleKeys.size, unusedKeys.length)
} else {
  console.log('✅ No unused keys.');
}

if (missingKeys.length || unusedKeys.length) {
  process.exit(1); // Fail the action
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      for (const subKey of flattenKeys(obj[key], fullKey)) {
        keys.add(subKey);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}