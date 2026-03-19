// Quick script to dump all PDF form field names and values from a character sheet
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const filePath = process.argv[2] || 'C:/Users/carlo/OneDrive/Desktop/elf wizard.pdf';

async function dumpFields(path) {
    const data = new Uint8Array(await (await import('fs')).promises.readFile(path));
    const doc = await pdfjsLib.getDocument({ data }).promise;

    console.log(`\nPDF: ${path}`);
    console.log(`Pages: ${doc.numPages}`);
    console.log('='.repeat(80));

    const allFields = {};
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const annotations = await page.getAnnotations();

        for (const ann of annotations) {
            if (ann.subtype === 'Widget' && ann.fieldName) {
                const value = ann.fieldValue ?? ann.buttonValue ?? '';
                const valStr = typeof value === 'string' ? value : String(value);
                if (valStr && valStr.trim()) {
                    allFields[ann.fieldName] = valStr;
                } else {
                    allFields[ann.fieldName] = '(empty)';
                }
            }
        }
    }

    // Sort and print
    const sorted = Object.entries(allFields).sort(([a], [b]) => a.localeCompare(b));
    for (const [name, value] of sorted) {
        const display = String(value).substring(0, 80);
        console.log(`  ${name.padEnd(40)} = ${display}`);
    }
    console.log(`\nTotal fields: ${sorted.length}`);
    console.log(`Fields with values: ${sorted.filter(([, v]) => v !== '(empty)').length}`);
}

dumpFields(filePath).catch(console.error);
