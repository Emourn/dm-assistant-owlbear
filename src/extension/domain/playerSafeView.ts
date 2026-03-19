import type { CharacterViewResolution } from './playerAssignments';
import { resolveCharacterView } from './playerAssignments';
import { getSelectedLinkedCharacters } from './selectionBatch';
import type { StoredTokenLink } from './tokenLinks';

export interface AccessPreviewCharacter {
    id: string;
    name: string;
}

export interface AccessPreviewPlayer {
    id: string;
    name: string;
    role: 'GM' | 'PLAYER';
}

export interface CurrentViewerAccessSummary {
    tone: 'sky' | 'amber' | 'rose';
    title: string;
    detail: string;
    notes: string[];
}

export interface PlayerAccessPreviewRow {
    playerId: string;
    playerName: string;
    assignedCharacterName: string | null;
    visibleCharacterName: string | null;
    source: CharacterViewResolution['source'];
    detail: string;
}

export interface SelectedLinkVisibilityRow {
    characterId: string;
    characterName: string;
    tokenCount: number;
    visibility: StoredTokenLink['visibility'];
    audienceLabel: string;
    audienceNames: string[];
}

interface CurrentViewerAccessOptions {
    role: 'GM' | 'PLAYER' | null;
    resolution: CharacterViewResolution;
    activeCharacterName: string | null;
    assignedCharacterName: string | null;
    selectedLinks: StoredTokenLink[];
}

function getCharacterNameById(characters: AccessPreviewCharacter[]): Map<string, string> {
    return new Map(characters.map((character) => [character.id, character.name]));
}

function getMatchedSelectedLink(
    resolution: CharacterViewResolution,
    selectedLinks: StoredTokenLink[],
): StoredTokenLink | null {
    if (resolution.source !== 'selected-token' || !resolution.characterId) {
        return null;
    }

    return selectedLinks.find((link) => link.characterId === resolution.characterId) ?? null;
}

export function buildCurrentViewerAccessSummary({
    role,
    resolution,
    activeCharacterName,
    assignedCharacterName,
    selectedLinks,
}: CurrentViewerAccessOptions): CurrentViewerAccessSummary {
    if (role === 'GM') {
        if (activeCharacterName) {
            return {
                tone: 'amber',
                title: 'GM view is using the active room sheet',
                detail: `${activeCharacterName} is visible because GMs control the active character record for the room.`,
                notes: selectedLinks.length > 0
                    ? [`${selectedLinks.length} linked selected token${selectedLinks.length === 1 ? '' : 's'} are available for assignment and token workflows.`]
                    : ['No linked selected tokens are active right now.'],
            };
        }

        return {
            tone: 'rose',
            title: 'No GM sheet is active',
            detail: 'Create or select a room character to resume GM-side sheet and token workflows.',
            notes: selectedLinks.length > 0
                ? [`${selectedLinks.length} selected token link${selectedLinks.length === 1 ? '' : 's'} exist, but no active room sheet is selected.`]
                : ['No selected token links are available yet.'],
        };
    }

    if (resolution.source === 'selected-token' && activeCharacterName) {
        const matchedLink = getMatchedSelectedLink(resolution, selectedLinks);
        return {
            tone: 'sky',
            title: 'Viewing a sheet from the selected token',
            detail: `${activeCharacterName} resolved from your current token selection.`,
            notes: matchedLink
                ? [`That token link is marked ${matchedLink.visibility}.`]
                : ['The selected token link resolved this sheet.'],
        };
    }

    if (resolution.source === 'assigned-character' && activeCharacterName) {
        return {
            tone: 'sky',
            title: 'Viewing your assigned character',
            detail: `${activeCharacterName} is visible because it is assigned to your player slot.`,
            notes: ['Selecting a visible linked token can temporarily override this view.'],
        };
    }

    if (selectedLinks.length > 0) {
        return {
            tone: 'rose',
            title: 'Your current selection does not resolve a visible sheet',
            detail: 'The selected token links are hidden from this player or belong to a different assigned character.',
            notes: assignedCharacterName
                ? [`Your fallback assigned character is ${assignedCharacterName}, but it is not active in this view.`]
                : ['You do not currently have an assigned character fallback.'],
        };
    }

    if (assignedCharacterName) {
        return {
            tone: 'rose',
            title: 'Your assigned sheet is not available',
            detail: `${assignedCharacterName} is assigned to you, but the room could not resolve that record right now.`,
            notes: ['This usually means the assigned character was removed or replaced in room metadata.'],
        };
    }

    return {
        tone: 'rose',
        title: 'No player-safe sheet is visible',
        detail: 'Players only see assigned sheets or selected token links that are visible to them.',
        notes: ['Ask the GM to assign a character or link a token with player-visible access.'],
    };
}

export function buildPlayerAccessPreview(
    players: AccessPreviewPlayer[],
    characters: AccessPreviewCharacter[],
    assignments: Record<string, string>,
    selectedLinks: StoredTokenLink[],
): PlayerAccessPreviewRow[] {
    const namesById = getCharacterNameById(characters);

    return players
        .filter((player) => player.role === 'PLAYER')
        .map((player) => {
            const assignedCharacterId = assignments[player.id] ?? null;
            const resolution = resolveCharacterView('PLAYER', selectedLinks, assignedCharacterId, null);
            const assignedCharacterName = assignedCharacterId ? namesById.get(assignedCharacterId) ?? null : null;
            const visibleCharacterName = resolution.characterId ? namesById.get(resolution.characterId) ?? null : null;
            const matchedLink = getMatchedSelectedLink(resolution, selectedLinks);

            let detail = 'No player-safe sheet resolves right now.';
            if (resolution.source === 'selected-token' && visibleCharacterName) {
                detail = `${visibleCharacterName} resolves from the current selection (${matchedLink?.visibility ?? 'linked'}).`;
            } else if (resolution.source === 'assigned-character' && visibleCharacterName) {
                detail = `${visibleCharacterName} resolves from assignment when no visible selected token overrides it.`;
            } else if (assignedCharacterName) {
                detail = `${assignedCharacterName} is assigned, but no current room record resolved for it.`;
            }

            return {
                playerId: player.id,
                playerName: player.name || 'Unknown Player',
                assignedCharacterName,
                visibleCharacterName,
                source: resolution.source,
                detail,
            };
        });
}

export function buildSelectedLinkVisibilityPreview(
    players: AccessPreviewPlayer[],
    assignments: Record<string, string>,
    selectedLinks: StoredTokenLink[],
): SelectedLinkVisibilityRow[] {
    const roomPlayers = players.filter((player) => player.role === 'PLAYER');

    return getSelectedLinkedCharacters(selectedLinks).map((link) => {
        const audienceNames = link.visibility === 'room'
            ? roomPlayers.map((player) => player.name || 'Unknown Player')
            : link.visibility === 'assigned-only'
                ? roomPlayers
                    .filter((player) => assignments[player.id] === link.characterId)
                    .map((player) => player.name || 'Unknown Player')
                : [];

        const audienceLabel = link.visibility === 'room'
            ? audienceNames.length > 0
                ? `Visible to all ${audienceNames.length} player${audienceNames.length === 1 ? '' : 's'}`
                : 'Visible to all players once they join'
            : link.visibility === 'assigned-only'
                ? audienceNames.length > 0
                    ? `Visible to ${audienceNames.join(', ')}`
                    : 'No assigned player can currently see this link'
                : 'GM only';

        return {
            characterId: link.characterId,
            characterName: link.characterName,
            tokenCount: link.tokenCount,
            visibility: link.visibility,
            audienceLabel,
            audienceNames,
        };
    });
}
