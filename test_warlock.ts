import { getClassFeatures } from './src/engine/fiveEToolsParser.js';
import * as fs from 'fs';

async function test() {
    const data = await getClassFeatures("Warlock", 2);
    const invocations = data.features.filter(f => f.name.toLowerCase().includes("invocation"));
    fs.writeFileSync('warlock_invocations.json', JSON.stringify(invocations, null, 2));
}

test().catch(console.error);
