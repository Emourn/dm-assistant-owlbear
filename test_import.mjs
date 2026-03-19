import fs from 'fs';
import path from 'path';
import { extractCharacterFromPdf } from './src/engine/pdfExtractor.ts';

// We need to mock File for Node
class MockFile {
    constructor(buffer, name) {
        this.buffer = buffer;
        this.name = name;
    }
    async arrayBuffer() {
        return this.buffer;
    }
}

async function testExtraction() {
    const elfPath = "C:/Users/carlo/OneDrive/Desktop/elf wizard.pdf";
    const dwarfPath = "C:/Users/carlo/OneDrive/Desktop/dwarf cleric.pdf";

    const elfBuffer = fs.readFileSync(elfPath);
    const elfFile = new MockFile(elfBuffer, "elf wizard.pdf");

    console.log('Testing Elf Wizard...');
    const elfChar = await extractCharacterFromPdf(elfFile);
    console.log(`- Ability: ${elfChar.spellcastingAbility}`);
    console.log(`- Save DC: ${elfChar.spellSaveDc}`);
    console.log(`- Attack Mod: ${elfChar.spellAttackMod}`);
    console.log(`- Spell Slots:`, JSON.stringify(elfChar.spellSlots));
    console.log(`- Spells Count: ${elfChar.spells?.length}`);
    console.log(`- First Spells:`, elfChar.spells?.slice(0, 3).map(s => `${s.name} (Lvl ${s.level})`));

    const dwarfBuffer = fs.readFileSync(dwarfPath);
    const dwarfFile = new MockFile(dwarfBuffer, "dwarf cleric.pdf");

    console.log('\nTesting Dwarf Cleric...');
    const dwarfChar = await extractCharacterFromPdf(dwarfFile);
    console.log(`- Ability: ${dwarfChar.spellcastingAbility}`);
    console.log(`- Save DC: ${dwarfChar.spellSaveDc}`);
    console.log(`- Attack Mod: ${dwarfChar.spellAttackMod}`);
    console.log(`- Spell Slots:`, JSON.stringify(dwarfChar.spellSlots));
    console.log(`- Spells Count: ${dwarfChar.spells?.length}`);
    console.log(`- First Spells:`, dwarfChar.spells?.slice(0, 3).map(s => `${s.name} (Lvl ${s.level})`));
}

testExtraction().catch(console.error);
