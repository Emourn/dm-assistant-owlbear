import OBR, { type Image, isImage } from '@owlbear-rodeo/sdk';
import type { Character } from '../types/character';
import type { Combatant } from '../types/combat';
import { getLinkedCharacterData, type SmokeVisionProfile } from './shared';

const EMBERS_APP_KEY = 'eu.armindo.embers';
const EMBERS_MESSAGE_CHANNEL = `${EMBERS_APP_KEY}/effects`;

const SUPPORTED_EMBERS_IDS = new Set([
    'arms_of_hadar',
    'antilife_shell',
    'arcane_hand',
    'banishment',
    'bardic_inspiration',
    'black_tentacles',
    'bless',
    'burning_hands',
    'call_lightning',
    'chain_lightning',
    'cloud_of_daggers',
    'cloudkill',
    'cone_of_cold',
    'cure_wounds',
    'dancing_lights',
    'darkness',
    'detect_magic',
    'dimension_door',
    'disintegrate',
    'eldritch_blast',
    'entangle',
    'fire_bolt',
    'fireball',
    'flaming_sphere',
    'fog_cloud',
    'frostbite',
    'grease',
    'guiding_bolt',
    'gust_of_wind',
    'hex',
    'hold_person',
    'hunters_mark',
    'ice_knife',
    'lightning_bolt',
    'magic_missiles',
    'melee_weapon_attack',
    'mind_sliver',
    'misty_step',
    'moonbeam',
    'ray_of_frost',
    'ranged_weapon_attack',
    'sacred_flame',
    'scorching_ray',
    'shadow_of_moil',
    'shatter',
    'shield',
    'shield_of_faith',
    'silence',
    'sleep',
    'sleet_storm',
    'sneak_attack',
    'spirit_guardians',
    'spiritual_weapon',
    'thunder_step',
    'toll_the_dead',
    'wall_of_fire',
    'wall_of_force',
    'web',
    'whirlwind',
    'wind_wall',
    'witch_bolt',
]);

const EMBERS_ALIASES: Record<string, string> = {
    'arcane hand': 'arcane_hand',
    'arms of hadar': 'arms_of_hadar',
    'black tentacles': 'black_tentacles',
    'call lightning': 'call_lightning',
    'chain lightning': 'chain_lightning',
    'cloud of daggers': 'cloud_of_daggers',
    'cone of cold': 'cone_of_cold',
    'cure wounds': 'cure_wounds',
    'dancing lights': 'dancing_lights',
    'detect magic': 'detect_magic',
    'dimension door': 'dimension_door',
    'eldritch blast': 'eldritch_blast',
    'fire bolt': 'fire_bolt',
    'flaming sphere': 'flaming_sphere',
    'fog cloud': 'fog_cloud',
    'guiding bolt': 'guiding_bolt',
    "hunter's mark": 'hunters_mark',
    'hunters mark': 'hunters_mark',
    'ice knife': 'ice_knife',
    'lightning bolt': 'lightning_bolt',
    'magic missile': 'magic_missiles',
    'magic missiles': 'magic_missiles',
    'mind sliver': 'mind_sliver',
    'misty step': 'misty_step',
    'ray of frost': 'ray_of_frost',
    'sacred flame': 'sacred_flame',
    'scorching ray': 'scorching_ray',
    'shield of faith': 'shield_of_faith',
    'spirit guardians': 'spirit_guardians',
    'spiritual weapon': 'spiritual_weapon',
    'thunder step': 'thunder_step',
    'toll the dead': 'toll_the_dead',
    'wall of fire': 'wall_of_fire',
    'wall of force': 'wall_of_force',
    'witch bolt': 'witch_bolt',
};

function normalizeSpellName(spellName: string): string {
    return spellName
        .toLowerCase()
        .trim()
        .replace(/[’']/g, "'")
        .replace(/[^a-z0-9'\s-]/g, '')
        .replace(/\s+/g, ' ');
}

export function isOwlbearIntegrationAvailable(): boolean {
    return OBR.isAvailable;
}

export function getEmbersSpellId(spellName: string): string | null {
    const normalized = normalizeSpellName(spellName);
    const alias = EMBERS_ALIASES[normalized];
    if (alias && SUPPORTED_EMBERS_IDS.has(alias)) {
        return alias;
    }

    const generated = normalized.replace(/['-]/g, '').replace(/\s+/g, '_');
    if (SUPPORTED_EMBERS_IDS.has(generated)) {
        return generated;
    }

    return null;
}

export function deriveSmokeVisionProfile(character: Character): SmokeVisionProfile {
    const notes: string[] = [];
    const sensesText = `${character.senses || ''} ${character.notes || ''}`.toLowerCase();
    const darkvision = character.darkvision
        ?? Number((character.senses || '').match(/darkvision\s+(\d+)/i)?.[1] ?? 0)
        ?? 0;

    if (darkvision > 0) {
        notes.push(`Darkvision ${darkvision} ft`);
    }
    if (sensesText.includes('blindsight')) {
        notes.push('Blindsight is tracked on the sheet but still needs manual Smoke setup.');
    }
    if (sensesText.includes('truesight')) {
        notes.push('Truesight is tracked on the sheet but still needs manual Smoke setup.');
    }
    if (character.conditions.some((condition) => condition.name.toLowerCase() === 'blinded')) {
        notes.push('Blinded condition should disable Smoke vision until removed.');
    }

    return {
        range: darkvision > 0 ? darkvision : 30,
        greyscale: darkvision > 0,
        falloff: darkvision > 0 ? 1 : 0,
        notes,
    };
}

async function getSelectedImageItems(): Promise<Image[]> {
    const selection = await OBR.player.getSelection();
    if (!selection?.length) {
        return [];
    }

    const items = await OBR.scene.items.getItems(selection);
    return items.filter((item): item is Image => isImage(item));
}

async function getSceneImageById(itemId?: string): Promise<Image | null> {
    if (!itemId) {
        return null;
    }

    const items = await OBR.scene.items.getItems([itemId]);
    const image = items.find((item): item is Image => isImage(item));
    return image ?? null;
}

async function findLinkedCasterToken(characterId: string): Promise<Image | null> {
    const selected = await getSelectedImageItems();
    const selectedCaster = selected.find((item) => getLinkedCharacterData(item)?.characterId === characterId);
    if (selectedCaster) {
        return selectedCaster;
    }

    const items = await OBR.scene.items.getItems();
    const linked = items.find((item) => isImage(item) && getLinkedCharacterData(item)?.characterId === characterId);
    return linked && isImage(linked) ? linked : null;
}

async function findTokenForCombatant(combatant?: Combatant | null): Promise<Image | null> {
    if (!combatant) {
        return null;
    }

    const directItem = await getSceneImageById(combatant.monsterData?.owlbearItemId);
    if (directItem) {
        return directItem;
    }

    if (combatant.type === 'player' && combatant.sourceId) {
        return findLinkedCasterToken(combatant.sourceId);
    }

    if (combatant.sourceId?.startsWith('owlbear:')) {
        return getSceneImageById(combatant.sourceId.slice('owlbear:'.length));
    }

    return null;
}

async function sendEmbersEffect(
    spellName: string,
    embersSpellId: string,
    caster: Image | null,
    target: Image | null,
): Promise<boolean> {
    if (!caster && !target) {
        await OBR.notification.show('Select a target token or link this character to a token before sending an Embers effect.', 'WARNING');
        return false;
    }

    const playerId = await OBR.player.getId();
    const anchor = target ?? caster;
    const effectProperties = caster && target && caster.id !== target.id
        ? {
            copies: 1,
            source: caster.position,
            destination: target.position,
        }
        : {
            position: anchor!.position,
        };

    await OBR.broadcast.sendMessage(
        EMBERS_MESSAGE_CHANNEL,
        {
            instructions: [
                {
                    id: embersSpellId,
                    effectProperties,
                },
            ],
            interactions: { ids: [], count: 0 },
            spellData: {
                name: spellName,
                caster: playerId,
            },
        },
        { destination: 'ALL' },
    );

    await OBR.notification.show(`Sent ${spellName} to Embers.`, 'SUCCESS');
    return true;
}

export async function triggerEmbersSpellFromCharacter(character: Character, spellName: string): Promise<boolean> {
    if (!OBR.isAvailable) {
        return false;
    }

    const embersSpellId = getEmbersSpellId(spellName);
    if (!embersSpellId) {
        await OBR.notification.show(`No Embers mapping found for ${spellName}.`, 'WARNING');
        return false;
    }

    const caster = await findLinkedCasterToken(character.id);
    const selected = await getSelectedImageItems();
    const selectedTarget = selected.find((item) => item.id !== caster?.id) ?? selected[0] ?? caster ?? null;

    return sendEmbersEffect(spellName, embersSpellId, caster, selectedTarget);
}

export async function triggerEmbersSpellFromCombatant(
    combatant: Combatant,
    spellName: string,
    targetCombatant?: Combatant | null,
): Promise<boolean> {
    if (!OBR.isAvailable) {
        return false;
    }

    const embersSpellId = getEmbersSpellId(spellName);
    if (!embersSpellId) {
        await OBR.notification.show(`No Embers mapping found for ${spellName}.`, 'WARNING');
        return false;
    }

    const caster = await findTokenForCombatant(combatant);
    const explicitTarget = await findTokenForCombatant(targetCombatant);
    const selected = await getSelectedImageItems();
    const selectedTarget = explicitTarget
        ?? selected.find((item) => item.id !== caster?.id)
        ?? selected[0]
        ?? caster
        ?? null;

    return sendEmbersEffect(spellName, embersSpellId, caster, selectedTarget);
}
