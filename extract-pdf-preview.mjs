// Quick script to extract the first ~20 pages of "Fixing Vecna" 
// so we can understand its structure (chapters, levels, references to other PDFs)
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    // Dynamically import pdfjs-dist (ESM)
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const pdfPath = join(__dirname, 'campaign-material', 'Fixing Vecna.pdf');
    const data = new Uint8Array(readFileSync(pdfPath));

    const doc = await pdfjsLib.getDocument({ data }).promise;
    const totalPages = doc.numPages;
    console.log(`Total pages: ${totalPages}`);

    let output = `FIXING VECNA — PDF STRUCTURE ANALYSIS\nTotal Pages: ${totalPages}\n${'='.repeat(60)}\n\n`;

    // Extract first 30 pages to understand structure
    const pagesToRead = Math.min(totalPages, 30);
    for (let i = 1; i <= pagesToRead; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
            .map(item => ('str' in item) ? item.str : '')
            .join('');

        output += `\n--- PAGE ${i} ---\n${text}\n`;
    }

    // Also get pages from the middle and end to understand the full scope
    if (totalPages > 30) {
        const midPage = Math.floor(totalPages / 2);
        for (const p of [midPage, midPage + 1, totalPages - 1, totalPages]) {
            if (p > pagesToRead && p <= totalPages) {
                const page = await doc.getPage(p);
                const content = await page.getTextContent();
                const text = content.items
                    .map(item => ('str' in item) ? item.str : '')
                    .join('');
                output += `\n--- PAGE ${p} ---\n${text}\n`;
            }
        }
    }

    writeFileSync(join(__dirname, 'fixing-vecna-preview.txt'), output, 'utf-8');
    console.log(`Written to fixing-vecna-preview.txt (${output.length} chars)`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
