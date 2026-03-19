import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.js';

async function testParse() {
    const data = new Uint8Array(fs.readFileSync('C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/public/test-sheet.pdf'));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    const extractedFields = {};
    const numPages = pdfDocument.numPages;
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const annotations = await page.getAnnotations();
        for (const annotation of annotations) {
            if (annotation.subtype === 'Widget' && annotation.fieldName) {
                const value = annotation.fieldValue ?? annotation.buttonValue ?? '';
                extractedFields[annotation.fieldName] = typeof value === 'string' ? value : String(value);
            }
        }
    }

    // Dump raw equipment fields
    const eqKeys = Object.keys(extractedFields).filter(k => k.includes('Eq') || k.includes('Equipment') || k.includes('CP') || k.includes('SP') || k.includes('GP'));
    console.log("Raw Equipment Fields:");
    for (const key of eqKeys) {
        if (extractedFields[key]) {
            console.log(`${key}: "${extractedFields[key]}"`);
        }
    }
}

testParse().catch(console.error);
