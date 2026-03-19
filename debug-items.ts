import { searchItems } from './src/engine/fiveEToolsParser';

async function run() {
    const url1 = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items.json';
    const url2 = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json';
    const data1 = await (await fetch(url1)).json();
    const data2 = await (await fetch(url2)).json();

    const leatherArmorSource = data2.baseitem.find((i: any) => i.name === 'Leather Armor');
    console.log("RAW Leather Armor from items-base.json:", JSON.stringify(leatherArmorSource, null, 2));
}

run();
