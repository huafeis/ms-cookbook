import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(readFileSync(resolve(root, 'chapters/manifest.json'), 'utf8'));
for (const chapter of data.chapters) {
  const name = `chapter-${String(chapter.number).padStart(2, '0')}.html`;
  chapter.html = readFileSync(resolve(root, 'chapters', name), 'utf8');
  // The manifest owns titles, status, and heading labels; fail on stale heading anchors.
  for (const heading of chapter.headings) {
    if (!chapter.html.includes(`id="${heading.id}"`)) {
      throw new Error(`${name}: heading ${heading.id} is missing; update manifest.json too.`);
    }
  }
}
data.chapterCount = data.chapters.length;
data.readyCount = data.chapters.filter(chapter => chapter.status === 'ready').length;
data.imageCount = data.chapters.reduce((sum, chapter) => sum + chapter.imageCount, 0);
data.attachmentCount = data.chapters.reduce((sum, chapter) => sum + chapter.attachmentCount, 0);
const output = `window.BOOK_DATA = ${JSON.stringify(data)};\n`;
const target = resolve(root, 'assets/content.js');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('assets/content.js is out of date. Run node scripts/build-content.mjs.');
  console.log(`Verified ${data.chapterCount} chapters and their heading anchors.`);
} else {
  writeFileSync(target, output);
  console.log(`Built ${data.chapterCount} chapters into assets/content.js.`);
}
