import type { ImportProvenance } from './source';

export interface SessionNote {
    id: string;
    sessionNumber: number;
    title: string;
    content: string; // Markdown text
    date: number; // Real-world timestamp
    inGameDate?: string;
}

export interface NPC {
    id: string;
    name: string;
    role?: string;
    faction?: string;
    location?: string;
    description: string;
    armorClass?: number;
    hitPoints?: number;
    challengeRating?: string;
    tags?: string[];
    provenance?: ImportProvenance;
}

export interface Location {
    id: string;
    name: string;
    region?: string;
    description: string;
    mapUrl?: string; // Optional specific map for this location
}

export interface Campaign {
    id: string;
    title: string;
    description: string;
    partyIds: string[]; // Character IDs belonging to this campaign
    timeTracking: {
        currentDay: number;
        currentHour: number;
        currentMinute: number;
        calendarSystem?: 'generic' | 'harptos';
    };
    sessionNotes: SessionNote[];
    npcs: NPC[];
    locations: Location[];
    worldMapUrl?: string; // Optional regional/world map image
    createdAt: number;
    updatedAt: number;
}
