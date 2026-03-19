import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'src', 'data', 'narrative');

fs.readdirSync(dir).filter(f => f.endsWith('.ts')).forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    content = content.replace(/â€”/g, '—');
    content = content.replace(/â€˜/g, "'");
    content = content.replace(/â€™/g, "'");
    content = content.replace(/â€œ/g, '"'); // Left double quote
    content = content.replace(/â€\x9D/g, '"'); // Right double quote
    content = content.replace(/â€/g, '"'); // Catch any remaining
    content = content.replace(/â€¦/g, '...');
    
    fs.writeFileSync(path.join(dir, file), content);
    console.log(`Updated encoding in ${file}`);
});
console.log('Encoding cleanup complete.');
