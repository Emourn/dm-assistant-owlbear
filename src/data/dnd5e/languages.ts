export const STANDARD_LANGUAGES = [
    'Common',
    'Common Sign Language',
    'Draconic',
    'Dwarvish',
    'Elvish',
    'Giant',
    'Gnomish',
    'Goblin',
    'Halfling',
    'Orc'
];

export const RARE_LANGUAGES = [
    'Abyssal',
    'Celestial',
    'Deep Speech',
    'Druidic',
    'Infernal',
    'Primordial',
    'Sylvan',
    "Thieves' Cant",
    'Undercommon'
];

export const PRIMORDIAL_DIALECTS = ['Aquan', 'Auran', 'Ignan', 'Terran'];

// Additional official languages that can appear in published stat blocks and setting material.
export const LEGACY_OFFICIAL_LANGUAGES = [
    'Aarakocra',
    'Blink Dog',
    'Bullywug',
    'Gith',
    'Gnoll',
    'Grung',
    'Kuo-Toa',
    'Modron',
    'Otyugh',
    'Sahuagin',
    'Slaad',
    'Thri-kreen',
    'Troglodyte',
    'Umber Hulk',
    'Vegepygmy',
    'Winter Wolf',
    'Worg',
    'Yeti',
    'Yikaria'
];

export const ALL_OFFICIAL_LANGUAGES = Array.from(
    new Set([
        ...STANDARD_LANGUAGES,
        ...RARE_LANGUAGES,
        ...PRIMORDIAL_DIALECTS,
        ...LEGACY_OFFICIAL_LANGUAGES
    ])
);
