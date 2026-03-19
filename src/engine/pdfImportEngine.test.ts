import { describe, expect, it } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { mapPdfFieldsToCharacter } from './pdfImportEngine';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const campaignDir = path.join(workspaceRoot, 'campaign-material');
const standardFontDataUrl = `${pathToFileURL(path.join(workspaceRoot, 'node_modules', 'pdfjs-dist', 'standard_fonts')).href}/`;

async function extractFieldsFromPdf(fileName: string): Promise<Record<string, string>> {
    const pdfPath = path.join(campaignDir, fileName);
    const data = new Uint8Array(await fs.readFile(pdfPath));
    const document = await pdfjsLib.getDocument({ data, standardFontDataUrl }).promise;
    const fields: Record<string, string> = {};

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const annotations = await page.getAnnotations();
        for (const annotation of annotations) {
            if (annotation.subtype !== 'Widget' || !annotation.fieldName) continue;
            const value = annotation.fieldValue ?? annotation.buttonValue ?? '';
            fields[annotation.fieldName] = typeof value === 'string' ? value : String(value);
        }
    }

    return fields;
}

describe('pdfImportEngine', () => {
    it('maps the provided character PDFs into usable raw sheet data', async () => {
        const expectations = [
            {
                file: 'Coronal.pdf',
                name: 'Coronal',
                className: 'Artificer',
                level: 1,
                race: 'Elf',
                background: 'Archaeologist',
                spellAttackMod: 6,
                slotMax: 2,
                immunities: ['magical sleep']
            },
            {
                file: 'Lasair.pdf',
                name: 'Lasair',
                className: 'Sorcerer',
                level: 1,
                race: 'Dragonborn',
                background: 'Criminal',
                spellAttackMod: 6,
                slotMax: 2,
                resistances: ['cold']
            },
            {
                file: 'Leoric.pdf',
                name: 'Leoric Neverember',
                className: 'Wizard',
                level: 1,
                race: 'Human',
                background: 'Noble',
                spellAttackMod: 7,
                slotMax: 2
            },
            {
                file: 'Cassius.pdf',
                name: 'Cassius Neverember',
                className: 'Warlock',
                level: 1,
                race: 'Human',
                background: 'Wayfarer',
                spellAttackMod: 5,
                slotMax: 1
            },
            {
                file: 'Seelie.pdf',
                name: 'Seelie',
                className: 'Druid',
                level: 1,
                race: 'Elf',
                background: 'Guide',
                spellAttackMod: 6,
                slotMax: 2,
                immunities: ['magical sleep']
            },
            {
                file: 'Lithia.pdf',
                name: 'Lithia',
                className: 'Paladin',
                level: 1,
                race: 'Tiefling',
                background: 'Acolyte',
                spellAttackMod: 6,
                slotMax: 2,
                resistances: ['fire']
            }
        ];

        for (const expected of expectations) {
            const fields = await extractFieldsFromPdf(expected.file);
            const character = await mapPdfFieldsToCharacter(fields, {
                sourceFileName: expected.file,
                enrichExternalData: false,
                applyCompendiumAutomation: false
            });

            expect(character.name).toBe(expected.name);
            expect(character.className).toBe(expected.className);
            expect(character.level).toBe(expected.level);
            expect(character.race).toBe(expected.race);
            expect(character.background).toBe(expected.background);
            expect(character.spellAttackMod).toBe(expected.spellAttackMod);
            expect(character.spellSlots[1]?.max).toBe(expected.slotMax);

            if (expected.resistances) {
                expect(character.resistances).toEqual(expect.arrayContaining(expected.resistances));
            }
            if (expected.immunities) {
                expect(character.immunities).toEqual(expect.arrayContaining(expected.immunities));
            }
        }
    });
});
