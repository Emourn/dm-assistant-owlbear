const fs = require('fs');
fetch('https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-wizard.json')
    .then(r => r.json())
    .then(d => {
        const wizard = d.class.find(c => c.name === 'Wizard');
        console.log(JSON.stringify(wizard.classTableGroups.find(g => g.title === 'Spell Slots per Spell Level'), null, 2));
    });
