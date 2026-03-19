import React from 'react';
import { EntityLink, EntityCategory } from '../components/navigator/EntityLink';

// In a real implementation, this would be fueled by 5e.tools indices.
// For now, we seed it with some known entities from the Death House mock data.
const KNOWN_ENTITIES: Record<string, { key: string, category: EntityCategory }> = {
    // Monsters
    'animated armor': { key: 'Animated Armor', category: 'monster' },
    'specter': { key: 'Specter', category: 'monster' },
    'specters': { key: 'Specter', category: 'monster' },
    'ghast': { key: 'Ghast', category: 'monster' },
    'ghasts': { key: 'Ghast', category: 'monster' },
    'ghoul': { key: 'Ghoul', category: 'monster' },
    'ghouls': { key: 'Ghoul', category: 'monster' },
    'shadow': { key: 'Shadow', category: 'monster' },
    'shadows': { key: 'Shadow', category: 'monster' },
    'mimic': { key: 'Mimic', category: 'monster' },
    'grick': { key: 'Grick', category: 'monster' },
    'swarm of insects (centipedes)': { key: 'Swarm of Insects (Centipedes)', category: 'monster' },
    'centipede swarm': { key: 'Swarm of Insects (Centipedes)', category: 'monster' },
    'shambling mound': { key: 'Shambling Mound', category: 'monster' },
    'lorghoth the decayer': { key: 'Shambling Mound', category: 'monster' },
    'lorghoth': { key: 'Shambling Mound', category: 'monster' },
    'broom of animated attack': { key: 'Broom of Animated Attack', category: 'monster' },
    'animated broom': { key: 'Broom of Animated Attack', category: 'monster' },
    'wolf': { key: 'Wolf', category: 'monster' },
    'wolves': { key: 'Wolf', category: 'monster' },

    // NPCs — keys match campaignLore.json names/aliases
    'rose': { key: 'Rose Durst', category: 'npc' },
    'rose durst': { key: 'Rose Durst', category: 'npc' },
    'rosavalda': { key: 'Rose Durst', category: 'npc' },
    'thorn': { key: 'Thorn Durst', category: 'npc' },
    'thorn durst': { key: 'Thorn Durst', category: 'npc' },
    'thorvaldur': { key: 'Thorn Durst', category: 'npc' },
    'gustav': { key: 'Gustav Durst', category: 'npc' },
    'gustav durst': { key: 'Gustav Durst', category: 'npc' },
    'elisabeth': { key: 'Elisabeth Durst', category: 'npc' },
    'elisabeth durst': { key: 'Elisabeth Durst', category: 'npc' },
    'nursemaid': { key: 'The Nursemaid', category: 'npc' },
    'margaret': { key: 'The Nursemaid', category: 'npc' },
    'walter durst': { key: 'Walter Durst', category: 'npc' },
    'walter': { key: 'Walter Durst', category: 'npc' },
    'lord neverember': { key: 'Lord Neverember', category: 'npc' },
    'dagult neverember': { key: 'Lord Neverember', category: 'npc' },
    'neverember': { key: 'Lord Neverember', category: 'npc' },
    'kevori fearnehart': { key: 'Kevori Fearnehart', category: 'npc' },
    'kevori': { key: 'Kevori Fearnehart', category: 'npc' },
    'delvin fearnehart': { key: 'Delvin Fearnehart', category: 'npc' },
    'delvin': { key: 'Delvin Fearnehart', category: 'npc' },

    // Items
    'longsword': { key: 'Longsword', category: 'item' },
    'shortsword': { key: 'Shortsword', category: 'item' },
    'silvered shortsword': { key: 'Shortsword (Silvered)', category: 'item' },
    'light crossbow': { key: 'Light Crossbow', category: 'item' },
    'heavy crossbow': { key: 'Heavy Crossbow', category: 'item' },
    'chain shirt': { key: 'Chain Shirt', category: 'item' },
    'plate armor': { key: 'Plate Armor', category: 'item' },
    'potion of healing': { key: 'Potion of Healing', category: 'item' },
    'healing potion': { key: 'Potion of Healing', category: 'item' },
    'scroll of protection from evil and good': { key: 'Spell Scroll (Protection from Evil and Good)', category: 'item' },
    'blank book': { key: 'Blank Book', category: 'item' },
    'jewelry box': { key: 'Jewelry Box', category: 'item' },
    'gold ring': { key: 'Signet Ring (Vecna)', category: 'item' },
    'signet ring': { key: 'Signet Ring (Vecna)', category: 'item' },
    'silver necklace': { key: 'Silver Necklace', category: 'item' },
    'ruby brooch': { key: 'Ruby Brooch', category: 'item' },
    'platinum necklace': { key: 'Platinum Necklace', category: 'item' },
    'cloak of protection': { key: 'Cloak of Protection', category: 'item' },
    'crystal orb': { key: 'Crystal Orb', category: 'item' },
    'topaz pendant': { key: 'Topaz Pendant', category: 'item' },
    'eldritch eye': { key: 'Eldritch Eye', category: 'item' },
    'iron key': { key: 'Iron Key', category: 'item' },

    // Spells
    'fireball': { key: 'Fireball', category: 'spell' },
    'magic missile': { key: 'Magic Missile', category: 'spell' },
    'shield': { key: 'Shield', category: 'spell' },
    'mage armor': { key: 'Mage Armor', category: 'spell' },
    'cure wounds': { key: 'Cure Wounds', category: 'spell' },

    // Lore / World — keys match campaignLore.json names/aliases
    'vecna': { key: 'Vecna', category: 'npc' },
    'eye of vecna': { key: 'Eye of Vecna', category: 'item' },
    'hand of vecna': { key: 'Hand of Vecna', category: 'item' },
    'vecna symbol': { key: 'Vecna Symbol', category: 'lore' },
    'mark of vecna': { key: 'Vecna Symbol', category: 'lore' },
    'strahd': { key: 'Strahd von Zarovich', category: 'npc' },
    'strahd von zarovich': { key: 'Strahd von Zarovich', category: 'npc' },
    'barovia': { key: 'Barovia', category: 'location' },
    'neverwinter': { key: 'Neverwinter', category: 'location' },
    'death house': { key: 'Death House', category: 'location' },
    'durst estate': { key: 'Death House', category: 'location' },
    'ritual chamber': { key: 'Ritual Chamber', category: 'location' },
};

// Sort by length descending to match longest phrases first ("potion of healing" before "healing")
const ENTITY_PHRASES = Object.keys(KNOWN_ENTITIES).sort((a, b) => b.length - a.length);

// Escape string for regex
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Build a massive regex that matches any of the known entity phrases, surrounded by word boundaries
// We use a case-insensitive match
const ENTITY_REGEX = new RegExp(`\\b(${ENTITY_PHRASES.map(escapeRegExp).join('|')})\\b`, 'gi');

/**
 * Parses raw narration text and replaces known entities with interactive EntityLink components.
 * 
 * @param text The raw string from a NarrationBlock
 * @returns An array of React nodes (strings mixed with EntityLink components)
 */
export function parseNarrationText(text: string): React.ReactNode[] {
    if (!text) return [];

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    // Reset regex state just in case
    ENTITY_REGEX.lastIndex = 0;

    let match;
    while ((match = ENTITY_REGEX.exec(text)) !== null) {
        // Add the plain text before the match
        if (match.index > lastIndex) {
            nodes.push(text.substring(lastIndex, match.index));
        }

        // Add the EntityLink component
        const matchedText = match[0];
        const normalizedKey = matchedText.toLowerCase();
        const entityData = KNOWN_ENTITIES[normalizedKey];

        if (entityData) {
            nodes.push(
                <EntityLink
                    key={`${entityData.key}-${match.index}`}
                    text={matchedText}
                    lookupKey={entityData.key}
                    category={entityData.category}
                />
            );
        } else {
            // Fallback (shouldn't happen given the regex)
            nodes.push(matchedText);
        }

        lastIndex = ENTITY_REGEX.lastIndex;
    }

    // Add any remaining plain text after the last match
    if (lastIndex < text.length) {
        nodes.push(text.substring(lastIndex));
    }

    return nodes;
}

