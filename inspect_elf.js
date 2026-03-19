
import { fetch5eData } from './src/engine/fiveEToolsParser';

async function inspectElf() {
    const data = await fetch5eData('races.json');
    const elves = data.race.filter(r => r.name === 'Elf');
    console.log(JSON.stringify(elves, null, 2));
}

inspectElf();
