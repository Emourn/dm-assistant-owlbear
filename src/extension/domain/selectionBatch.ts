import type { StoredTokenLink } from './tokenLinks';

export interface SelectedLinkedCharacter {
    characterId: string;
    characterName: string;
    visibility: StoredTokenLink['visibility'];
    tokenCount: number;
}

export function getSelectedLinkedCharacters(links: StoredTokenLink[]): SelectedLinkedCharacter[] {
    const byCharacterId = new Map<string, SelectedLinkedCharacter>();

    for (const link of links) {
        const existing = byCharacterId.get(link.characterId);
        if (existing) {
            existing.tokenCount += 1;
            continue;
        }

        byCharacterId.set(link.characterId, {
            characterId: link.characterId,
            characterName: link.characterName,
            visibility: link.visibility,
            tokenCount: 1,
        });
    }

    return [...byCharacterId.values()];
}
