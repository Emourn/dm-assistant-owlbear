export const ABILITY_DEFINITIONS = [
    { id: 'str', label: 'STR', name: 'Strength' },
    { id: 'dex', label: 'DEX', name: 'Dexterity' },
    { id: 'con', label: 'CON', name: 'Constitution' },
    { id: 'int', label: 'INT', name: 'Intelligence' },
    { id: 'wis', label: 'WIS', name: 'Wisdom' },
    { id: 'cha', label: 'CHA', name: 'Charisma' },
] as const;

export const SKILL_DEFINITIONS = [
    { id: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
    { id: 'animal-handling', label: 'Animal Handling', ability: 'wis' },
    { id: 'arcana', label: 'Arcana', ability: 'int' },
    { id: 'athletics', label: 'Athletics', ability: 'str' },
    { id: 'deception', label: 'Deception', ability: 'cha' },
    { id: 'history', label: 'History', ability: 'int' },
    { id: 'insight', label: 'Insight', ability: 'wis' },
    { id: 'intimidation', label: 'Intimidation', ability: 'cha' },
    { id: 'investigation', label: 'Investigation', ability: 'int' },
    { id: 'medicine', label: 'Medicine', ability: 'wis' },
    { id: 'nature', label: 'Nature', ability: 'int' },
    { id: 'perception', label: 'Perception', ability: 'wis' },
    { id: 'performance', label: 'Performance', ability: 'cha' },
    { id: 'persuasion', label: 'Persuasion', ability: 'cha' },
    { id: 'religion', label: 'Religion', ability: 'int' },
    { id: 'sleight-of-hand', label: 'Sleight of Hand', ability: 'dex' },
    { id: 'stealth', label: 'Stealth', ability: 'dex' },
    { id: 'survival', label: 'Survival', ability: 'wis' },
] as const;

export const ABILITY_BY_ID = Object.fromEntries(
    ABILITY_DEFINITIONS.map((ability) => [ability.id, ability]),
);

export const SKILL_BY_ID = Object.fromEntries(
    SKILL_DEFINITIONS.map((skill) => [skill.id, skill]),
);

export const SKILL_ID_BY_LABEL = Object.fromEntries(
    SKILL_DEFINITIONS.map((skill) => [skill.label.toLowerCase(), skill.id]),
);
