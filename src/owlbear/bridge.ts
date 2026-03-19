import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { useCampaignStore } from '../store/campaignStore';
import { useCharacterStore } from '../store/characterStore';
import { useCombatStore } from '../store/combatStore';
import type { Character } from '../types/character';
import type { Combatant } from '../types/combat';
import { deriveSmokeVisionProfile } from './integrations';
import {
    IMPORT_BROADCAST_CHANNEL,
    ROOM_STATE_KEY,
    TOKEN_LINK_KEY,
    buildCampaignSummaries,
    buildEncounterSummary,
    cloneCharacterForToken,
    getItemDisplayName,
    getItemPortraitUrl,
    getLinkedCharacterData,
    getRoomStateFromMetadata,
    type OwlbearRoomState,
    type PlayerCharacterResolution,
    type SharedCharacterSummary,
} from './shared';
import { type PendingTokenImport } from './shared';

function buildCombatantFromCharacterSnapshot(character: Character, item: Item): Combatant {
    return {
        id: crypto.randomUUID(),
        type: 'player',
        name: character.name || getItemDisplayName(item),
        portraitUrl: character.portraitUrl || getItemPortraitUrl(item),
        ac: character.ac,
        maxHp: character.maxHp,
        currentHp: character.currentHp,
        tempHp: character.tempHp,
        speed: character.speed,
        initiativeMod: character.initiativeMod,
        initiativeScore: null,
        dexterityScore: character.abilityScores.dex,
        abilityScores: character.abilityScores,
        proficiencyBonus: character.proficiencyBonus,
        savingThrowProficiencies: character.savingThrows,
        spellcastingAbility: character.spellcastingAbility,
        spellSaveDc: character.spellSaveDc,
        spellAttackMod: character.spellAttackMod,
        passivePerception: character.passivePerception,
        passiveInvestigation: character.passiveInvestigation,
        passiveInsight: character.passiveInsight,
        senses: character.senses,
        conditions: [...character.conditions],
        spellSlots: character.spellSlots ? character.spellSlots.map((slot) => ({ ...slot })) : undefined,
        deathSaves: { ...character.deathSaves },
        exhaustion: character.exhaustion,
        resistances: [...character.resistances],
        immunities: [...character.immunities],
        vulnerabilities: [...character.vulnerabilities],
        conditionImmunities: [...character.conditionImmunities],
        damageNotes: character.damageNotes,
        sourceId: character.id,
        monsterData: {
            owlbearItemId: item.id,
            owlbearLayer: item.layer,
            owlbearName: getItemDisplayName(item),
        },
    };
}

function buildGenericCombatantFromItem(item: Item): Combatant {
    const isCharacterLayer = item.layer === 'CHARACTER';
    return {
        id: crypto.randomUUID(),
        type: isCharacterLayer ? 'npc' : 'monster',
        name: getItemDisplayName(item),
        portraitUrl: getItemPortraitUrl(item),
        ac: 10,
        maxHp: 10,
        currentHp: 10,
        tempHp: 0,
        speed: '30 ft',
        initiativeMod: 0,
        initiativeScore: null,
        dexterityScore: 10,
        conditions: [],
        sourceId: `owlbear:${item.id}`,
        monsterData: {
            owlbearItemId: item.id,
            owlbearLayer: item.layer,
            owlbearName: getItemDisplayName(item),
        },
    };
}

function buildCombatantFromItem(item: Item): Combatant {
    const linked = getLinkedCharacterData(item);
    if (linked?.snapshot) {
        return buildCombatantFromCharacterSnapshot(linked.snapshot, item);
    }

    return buildGenericCombatantFromItem(item);
}

export async function getSelectedSceneItems(): Promise<Item[]> {
    const selection = await OBR.player.getSelection();
    if (!selection?.length) {
        return [];
    }

    return OBR.scene.items.getItems(selection);
}

async function getLinkedTokenIdsByCharacterId(): Promise<Map<string, string[]>> {
    const items = await OBR.scene.items.getItems();
    const byCharacterId = new Map<string, string[]>();

    items.forEach((item) => {
        const linked = getLinkedCharacterData(item);
        if (!linked) {
            return;
        }

        const existing = byCharacterId.get(linked.characterId) ?? [];
        existing.push(item.id);
        byCharacterId.set(linked.characterId, existing);
    });

    return byCharacterId;
}

function buildCharacterSummaries(
    characters: Character[],
    linkedTokenIds: Map<string, string[]>,
): SharedCharacterSummary[] {
    return characters.map((character) => ({
        id: character.id,
        name: character.name,
        playerName: character.playerName,
        className: character.className,
        level: character.level,
        ac: character.ac,
        currentHp: character.currentHp,
        maxHp: character.maxHp,
        linkedTokenIds: linkedTokenIds.get(character.id) ?? [],
    }));
}

export async function publishRoomStateFromStores(
    playerAssignments?: Record<string, string>,
): Promise<OwlbearRoomState> {
    const characterState = useCharacterStore.getState();
    const campaignState = useCampaignStore.getState();
    const combatState = useCombatStore.getState();
    const metadata = await OBR.room.getMetadata();
    const current = getRoomStateFromMetadata(metadata);
    const linkedTokenIds = await getLinkedTokenIdsByCharacterId();

    const roomState: OwlbearRoomState = {
        updatedAt: Date.now(),
        activeCampaignId: campaignState.activeCampaignId,
        campaigns: buildCampaignSummaries(campaignState.campaigns),
        characters: buildCharacterSummaries(characterState.characters, linkedTokenIds),
        activeEncounter: buildEncounterSummary(combatState.activeEncounter),
        playerAssignments: playerAssignments ?? current?.playerAssignments ?? {},
        compatibility: {
            tokenMetadataNamespace: TOKEN_LINK_KEY,
            nonDestructive: true,
            notes: [
                'DM Assistant only writes to its own metadata namespace.',
                'Smoke & Specter!, Embers, and similar map/effect extensions keep ownership of their own overlays and metadata.',
            ],
        },
    };

    await OBR.room.setMetadata({
        [ROOM_STATE_KEY]: roomState,
    });

    return roomState;
}

export async function setPlayerAssignment(playerId: string, characterId: string | null): Promise<OwlbearRoomState> {
    const metadata = await OBR.room.getMetadata();
    const roomState = getRoomStateFromMetadata(metadata);
    const nextAssignments = { ...(roomState?.playerAssignments ?? {}) };

    if (characterId) {
        nextAssignments[playerId] = characterId;
    } else {
        delete nextAssignments[playerId];
    }

    return publishRoomStateFromStores(nextAssignments);
}

export async function linkCharacterToCurrentSelection(character: Character): Promise<number> {
    const items = await getSelectedSceneItems();
    if (items.length === 0) {
        return 0;
    }

    const snapshot = cloneCharacterForToken(character);
    const playerId = await OBR.player.getId();

    await OBR.scene.items.updateItems(items.map((item) => item.id), (draft) => {
        draft.forEach((item) => {
            item.metadata[TOKEN_LINK_KEY] = {
                characterId: character.id,
                snapshot,
                smokeVision: deriveSmokeVisionProfile(snapshot),
                linkedAt: Date.now(),
                linkedBy: playerId,
            };
        });
    });

    await publishRoomStateFromStores();
    return items.length;
}

export async function importItemsIntoCombat(
    items: Item[],
    source: PendingTokenImport['source'],
): Promise<number> {
    if (items.length === 0) {
        return 0;
    }

    const combatants = items.map(buildCombatantFromItem);
    const combatState = useCombatStore.getState();
    const activeCampaignId = useCampaignStore.getState().activeCampaignId ?? undefined;

    if (!combatState.activeEncounter) {
        combatState.startEncounter(
            `Owlbear Import (${items.length})`,
            combatants,
            activeCampaignId,
        );
        useCombatStore.getState().completeSetup();
        useCombatStore.getState().skipMapSetup();
    } else {
        const existingIds = new Set(
            combatState.activeEncounter.combatants
                .map((combatant) => combatant.sourceId)
                .filter((value): value is string => Boolean(value)),
        );

        combatants.forEach((combatant) => {
            if (combatant.sourceId && existingIds.has(combatant.sourceId)) {
                return;
            }
            useCombatStore.getState().addCombatant(combatant);
        });

        const latest = useCombatStore.getState().activeEncounter;
        if (latest?.isSetupComplete && !latest.mapSetupComplete) {
            useCombatStore.getState().skipMapSetup();
        }
    }

    await OBR.broadcast.sendMessage(IMPORT_BROADCAST_CHANNEL, { source, count: items.length }, { destination: 'LOCAL' });
    await publishRoomStateFromStores();
    return combatants.length;
}

export async function importCurrentSelectionIntoCombat(
    source: PendingTokenImport['source'],
): Promise<number> {
    const items = await getSelectedSceneItems();
    return importItemsIntoCombat(items, source);
}

export async function resolvePlayerCharacter(playerId?: string): Promise<PlayerCharacterResolution> {
    const currentPlayerId = playerId ?? await OBR.player.getId();
    const [metadata, selectedIds] = await Promise.all([
        OBR.room.getMetadata(),
        OBR.player.getSelection(),
    ]);

    const roomState = getRoomStateFromMetadata(metadata);
    const assignedCharacterId = roomState?.playerAssignments[currentPlayerId] ?? null;
    const selectedItems = selectedIds?.length ? await OBR.scene.items.getItems(selectedIds) : [];

    for (const item of selectedItems) {
        const linked = getLinkedCharacterData(item);
        if (linked && (!assignedCharacterId || linked.characterId === assignedCharacterId)) {
            return {
                characterId: linked.characterId,
                snapshot: linked.snapshot,
                source: 'selected-token',
            };
        }
    }

    if (assignedCharacterId) {
        const items = await OBR.scene.items.getItems();
        const linkedItem = items.find((item) => getLinkedCharacterData(item)?.characterId === assignedCharacterId);
        const linked = linkedItem ? getLinkedCharacterData(linkedItem) : null;

        if (linked) {
            return {
                characterId: linked.characterId,
                snapshot: linked.snapshot,
                source: 'assigned-token',
            };
        }

        const summary = roomState?.characters.find((character) => character.id === assignedCharacterId);
        if (summary) {
            return {
                characterId: assignedCharacterId,
                summary,
                source: 'room-summary',
            };
        }
    }

    return {
        characterId: null,
        source: 'none',
    };
}
