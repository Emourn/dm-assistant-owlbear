import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const inputDir = join(__dirname, 'campaign-material');
    const outputDir = join(__dirname, 'campaign-material', 'extracted-text');

    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const files = readdirSync(inputDir).filter(f => f.endsWith('.pdf'));

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const pdfPath = join(inputDir, file);
        const outPath = join(outputDir, file.replace('.pdf', '.txt'));

        try {
            const data = new Uint8Array(readFileSync(pdfPath));
            const doc = await pdfjsLib.getDocument({ data }).promise;
            const totalPages = doc.numPages;

            console.log(`  - Total pages: ${totalPages}`);

            writeFileSync(outPath, `${file.toUpperCase()} — TEXT EXTRACTION\nTotal Pages: ${totalPages}\n${'='.repeat(60)}\n\n`, 'utf-8');

            for (let i = 1; i <= totalPages; i++) {
                const page = await doc.getPage(i);
                const content = await page.getTextContent();
                const textTokens = content.items
                    .map(item => ('str' in item) ? item.str : '');

                const text = textTokens.join(' ');

                appendFileSync(outPath, `\n--- PAGE ${i} ---\n${text}\n`, 'utf-8');

                if (i % 50 === 0) {
                    console.log(`  - Extracted page ${i}/${totalPages}...`);
                }
            }
            console.log(`  ✓ Finished ${file}`);
        } catch (e) {
            console.error(`  x Error processing ${file}:`, e.message);
        }
    }

    console.log('\nAll PDFs processed successfully. Text files are in campaign-material/extracted-text/');
}

main().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
});
