// Preflight for offline builds: verify the bundled data files exist and are
// valid JSON before `ng build`/`ng serve` run, so an offline build can't be
// produced (or served) without its snapshot. Exits non-zero on failure.
import { readFileSync } from 'node:fs';

const REQUIRED_FILES = ['src/assets/data/endpoint.json', 'src/assets/data/metadata.json'];

const errors = [];
for (const file of REQUIRED_FILES) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    errors.push(`  ${file}: ${err.code === 'ENOENT' ? 'missing' : err.message}`);
  }
}

if (errors.length > 0) {
  console.error('Offline data check failed — cannot build in offline mode:');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Offline data check passed.');
