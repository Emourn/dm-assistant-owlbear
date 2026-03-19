const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const inputDir = path.join(__dirname, 'campaign-material');
const outputDir = path.join(__dirname, 'campaign-material', 'extracted-text');

async function extractFiles() {
    const files = ['Fixing Vecna.pdf', 'Death House.pdf'];

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const pdfPath = path.join(inputDir, file);
        const outPath = path.join(outputDir, file.replace('.pdf', '-pdfparse.txt'));

        try {
            let dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdf(dataBuffer);

            console.log(`  - Total pages: ${data.numpages}`);

            let output = `${file.toUpperCase()} — TEXT EXTRACTION (pdf-parse)\nTotal Pages: ${data.numpages}\n${'='.repeat(60)}\n\n`;
            output += data.text;

            fs.writeFileSync(outPath, output, 'utf-8');
            console.log(`  ✓ Finished ${file} - Saved to ${outPath}`);

        } catch (e) {
            console.error(`  x Error processing ${file}:`, e.message);
        }
    }
}

extractFiles().catch(console.error);
