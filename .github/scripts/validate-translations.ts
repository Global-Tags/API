import { sync as globSync } from 'fast-glob';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const KEY_REGEX = /(['`])\$\.(\w+(?:\.\w+)+)(?=;;|\1|$)/g;
const LOCALE_FILE = resolve('locales/en_us.json');
const SRC_FILES = globSync(['src/**/*.ts'], { dot: false });

type LocaleObject = Record<string, any>;

const localeData: LocaleObject = JSON.parse(readFileSync(LOCALE_FILE, 'utf-8'));
const flatLocaleKeys = flattenKeys(localeData);

const usedKeysMap: Map<string, Set<string>> = new Map();

for (const file of SRC_FILES) {
  const content = readFileSync(file, 'utf-8');
  let match: RegExpExecArray | null;

  while ((match = KEY_REGEX.exec(content)) !== null) {
    const key = match[2];
    if (!usedKeysMap.has(key)) {
      usedKeysMap.set(key, new Set());
    }
    usedKeysMap.get(key)!.add(file);
  }
}

const usedKeys = [...usedKeysMap.keys()];
const missingKeys = usedKeys.filter((key) => !flatLocaleKeys.has(key));
const unusedKeys = [...flatLocaleKeys].filter((key) => !usedKeysMap.has(key));

console.log('\n🔍 Localization Check Results:\n');

if (missingKeys.length) {
  console.log('❌ Missing keys in en_us.json:');
  for (const key of missingKeys) {
    const files = [...(usedKeysMap.get(key) ?? [])];
    for (const file of files) {
      console.log(`  - ${key} (${file})`);
    }
  }
} else {
  console.log('✅ No missing keys.');
}

if (unusedKeys.length) {
  console.log('\n⚠️ Unused keys in en_us.json:');
  for (const key of unusedKeys) {
    console.log(`  - ${key}`);
  }
} else {
  console.log('✅ No unused keys.');
}

if (missingKeys.length || unusedKeys.length) {
  process.exit(1);
}

function flattenKeys(obj: LocaleObject, prefix = ''): Set<string> {
  const keys = new Set<string>();

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