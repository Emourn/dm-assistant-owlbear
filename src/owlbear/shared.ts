import { isImage, isLabel, type Item, type Metadata } from '@owlbear-rodeo/sdk';
import type { Campaign } from '../types/campaign';
import type { Character } from '../types/character';
import type { Combatant, Encounter } from '../types/combat';

export const OBR_NAMESPACE = 'com.antigravity.dm-assistant';
export const ROOM_STATE_KEY = `${OBR_NAMESPACE}/room-state`;
export const TOKEN_LINK_KEY = `${OBR_NAMESPACE}/token-link`;
export const PENDING_IMPORT_KEY = `${OBR_NAMESPACE}:pending-token-import`;
export const PANEL_POPOVER_ID = `${OBR_NAMESPACE}/panel`;
export const IMPORT_CONTEXT_MENU_ID = `${OBR_NAMESPACE}/import-selection`;
export const IMPORT_BROADCAST_CHANNEL = `${OBR_NAMESPACE}/import-selection`;

export interface SharedCampaignSummary {
    id: string;
    title: string;
    partySize: number;
    sessionCount: number;
    npcCount: number;
    locationCount: number;
}

export interface SharedCharacterSummary {
    id: string;
    name: string;
    playerName: string;
    className: string;
    level: number;
    ac: number;
    currentHp: number;
    maxHp: number;
    linkedTokenIds: string[];
}

export interface SharedEncounterCombatantSummary {
    id: string;
    name: string;
    type: Combatant['type'];
    currentHp: number;
    maxHp: number;
    initiativeScore: number | null;
}

export interface SharedEncounterSummary {
    id: string;
    title: string;
    round: number;
    isActive: boolean;
    combatants: SharedEncounterCombatantSummary[];
}

export interface OwlbearRoomState {
    updatedAt: number;
    activeCampaignId: string | null;
    campaigns: SharedCampaignSummary[];
    characters: SharedCharacterSummary[];
    activeEncounter: SharedEncounterSummary | null;
    playerAssignments: Record<string, string>;
    compatibility: {
        tokenMetadataNamespace: string;
        nonDestructive: boolean;
        notes: string[];
    };
}

export interface SmokeVisionProfile {
    range: number;
    greyscale: boolean;
    falloff: number;
    notes: string[];
}

export interface LinkedCharacterTokenData {
    characterId: string;
    snapshot: Character;
    smokeVision?: SmokeVisionProfile;
    linkedAt: number;
    linkedBy: string;
}

export interface PendingTokenImport {
    capturedAt: number;
    source: 'context-menu' | 'popover' | 'workbench';
    items: Item[];
}

export interface PlayerCharacterResolution {
    characterId: string | null;
    snapshot?: Character;
    summary?: SharedCharacterSummary;
    source: 'selected-token' | 'assigned-token' | 'room-summary' | 'none';
}

export function cloneCharacterForToken(character: Character): Character {
    const { importedData, ...rest } = character;
    return JSON.parse(JSON.stringify(rest)) as Character;
}

export function getLinkedCharacterData(item: Item): LinkedCharacterTokenData | null {
    const value = item.metadata[TOKEN_LINK_KEY];
    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as Partial<LinkedCharacterTokenData>;
    if (!candidate.characterId || !candidate.snapshot) {
        return null;
    }

    return candidate as LinkedCharacterTokenData;
}

export function getRoomStateFromMetadata(metadata: Metadata): OwlbearRoomState | null {
    const value = metadata[ROOM_STATE_KEY];
    if (!value || typeof value !== 'object') {
        return null;
    }
    return value as OwlbearRoomState;
}

export function getItemDisplayName(item: Item): string {
    if (item.name?.trim()) {
        return item.name.trim();
    }

    if (isImage(item) && item.text.plainText.trim()) {
        return item.text.plainText.trim();
    }

    if (isLabel(item) && item.text.plainText.trim()) {
        return item.text.plainText.trim();
    }

    return `Token ${item.id.slice(0, 6)}`;
}

export function getItemPortraitUrl(item: Item): string | undefined {
    if (isImage(item)) {
        return item.image.url;
    }
    return undefined;
}

export function buildCampaignSummaries(campaigns: Campaign[]): SharedCampaignSummary[] {
    return campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        partySize: campaign.partyIds.length,
        sessionCount: campaign.sessionNotes.length,
        npcCount: campaign.npcs.length,
        locationCount: campaign.locations.length,
    }));
}

export function buildEncounterSummary(encounter: Encounter | null): SharedEncounterSummary | null {
    if (!encounter) {
        return null;
    }

    return {
        id: encounter.id,
        title: encounter.title,
        round: encounter.round,
        isActive: encounter.isActive,
        combatants: encounter.combatants.map((combatant) => ({
            id: combatant.id,
            name: combatant.name,
            type: combatant.type,
            currentHp: combatant.currentHp,
            maxHp: combatant.maxHp,
            initiativeScore: combatant.initiativeScore,
        })),
    };
}
