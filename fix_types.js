import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'src', 'data', 'narrative');

fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'builder.ts').forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Fix ActionIcons
    content = content.replace(/'arrow-(left|right|up|down)'/g, "'path'");
    content = content.replace(/'zap'/g, "'combat'");
    content = content.replace(/'check'/g, "'path'");
    content = content.replace(/'eye'/g, "'search'");
    
    // Fix SceneEncounter removing 'id'
    content = content.replace(/encounter: \{ id: '[^']+', name: /g, 'encounter: { name: ');

    // Fix SceneTags
    content = content.replace(/'lore'/g, "'story'");
    content = content.replace(/'boss'/g, "'combat'");
    content = content.replace(/'transition'/g, "'exploration'");
    
    fs.writeFileSync(path.join(dir, file), content);
    console.log(`Updated ${file}`);
});
console.log('Cleanup complete.');
