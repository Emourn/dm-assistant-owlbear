import https from 'https';

const url = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/bestiary-mm.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const imp = json.monster.find(m => m.name === 'Imp');
            console.log('--- IMP DATA ---');
            console.log(JSON.stringify({
                name: imp.name,
                resist: imp.resist,
                immune: imp.immune,
                vulnerable: imp.vulnerable,
                conditionImmune: imp.conditionImmune
            }, null, 2));
        } catch (e) {
            console.error('Parse error: ' + e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
});
