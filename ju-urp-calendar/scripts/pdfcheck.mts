import { writeFileSync } from 'node:fs';
const { generateLecturePdf } = await import('../src/lib/pdfgen.ts');
const b = generateLecturePdf('Lecture 04 - Four-Step Transport Model', 'URP 303', 'Prof. Dr. Akter Mahmud');
writeFileSync('/tmp/test.pdf', Buffer.from(await b.arrayBuffer()));
