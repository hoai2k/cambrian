import { writeFile } from 'node:fs/promises';
const glyphs={
 player:'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
 threat:'<path fill="currentColor" d="m12 2 10 10-10 10L2 12Z"/>',
 giant:'<path fill="currentColor" d="m12 1 11 11-7 8-4-5-4 5-7-8Z"/>',
 home:'<path fill="currentColor" fill-rule="evenodd" d="M3 21v-5C3 9 7 3 12 3s9 6 9 13v5ZM9 9a3 2 0 1 0 6 0 3 2 0 1 0-6 0Z"/>',
 shore:'<path d="M2 15c4 0 3-7 7-7s2 8 6 8 3-7 7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
};
for(const [id,body] of Object.entries(glyphs))await writeFile(new URL(`../../public/assets/ui/radar-${id}.svg`,import.meta.url),`<svg id="glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${body}</svg>\n`);
