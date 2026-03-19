import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Campaign, SessionNote, NPC, Location } from '../types/campaign';

interface CampaignState {
    campaigns: Campaign[];
    activeCampaignId: string | null;

    // Campaign CRUD
    addCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'sessionNotes'>) => void;
    updateCampaign: (id: string, updates: Partial<Campaign>) => void;
    deleteCampaign: (id: string) => void;
    setActiveCampaign: (id: string | null) => void;

    // Party Management
    addCharacterToCampaign: (campaignId: string, characterId: string) => void;
    removeCharacterFromCampaign: (campaignId: string, characterId: string) => void;

    // Time Management
    advanceTime: (campaignId: string, minutes: number) => void;
    setTime: (campaignId: string, time: { day: number; hour: number; minute: number }) => void;

    // Session Notes
    addSessionNote: (campaignId: string, note: Omit<SessionNote, 'id' | 'date'>) => void;
    updateSessionNote: (campaignId: string, noteId: string, updates: Partial<SessionNote>) => void;
    deleteSessionNote: (campaignId: string, noteId: string) => void;

    // NPCs
    addNpc: (campaignId: string, npc: Omit<NPC, 'id'>) => void;
    updateNpc: (campaignId: string, npcId: string, updates: Partial<NPC>) => void;
    deleteNpc: (campaignId: string, npcId: string) => void;

    // Locations
    addLocation: (campaignId: string, location: Omit<Location, 'id'>) => void;
    updateLocation: (campaignId: string, locationId: string, updates: Partial<Location>) => void;
    deleteLocation: (campaignId: string, locationId: string) => void;

    // World Map
    updateWorldMap: (campaignId: string, mapUrl: string | undefined) => void;
}

export const useCampaignStore = create<CampaignState>()(
    persist(
        (set) => ({
            campaigns: [],
            activeCampaignId: null,

            addCampaign: (campaignData) => set((state) => ({
                campaigns: [...state.campaigns, {
                    ...campaignData,
                    id: crypto.randomUUID(),
                    sessionNotes: [],
                    npcs: [],
                    locations: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }],
            })),

            updateCampaign: (id, updates) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
                ),
            })),

            deleteCampaign: (id) => set((state) => ({
                campaigns: state.campaigns.filter((c) => c.id !== id),
                activeCampaignId: state.activeCampaignId === id ? null : state.activeCampaignId,
            })),

            setActiveCampaign: (id) => set({ activeCampaignId: id }),

            addCharacterToCampaign: (campaignId, characterId) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId && !c.partyIds.includes(characterId)
                        ? { ...c, partyIds: [...c.partyIds, characterId], updatedAt: Date.now() }
                        : c
                ),
            })),

            removeCharacterFromCampaign: (campaignId, characterId) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? { ...c, partyIds: c.partyIds.filter(id => id !== characterId), updatedAt: Date.now() }
                        : c
                ),
            })),

            advanceTime: (campaignId, addMinutes) => set((state) => ({
                campaigns: state.campaigns.map((c) => {
                    if (c.id !== campaignId) return c;

                    let newMinute = c.timeTracking.currentMinute + addMinutes;
                    let newHour = c.timeTracking.currentHour;
                    let newDay = c.timeTracking.currentDay;

                    if (newMinute >= 60) {
                        newHour += Math.floor(newMinute / 60);
                        newMinute = newMinute % 60;
                    }
                    if (newHour >= 24) {
                        newDay += Math.floor(newHour / 24);
                        newHour = newHour % 24;
                    }

                    return {
                        ...c,
                        timeTracking: {
                            ...c.timeTracking,
                            currentMinute: newMinute,
                            currentHour: newHour,
                            currentDay: newDay
                        },
                        updatedAt: Date.now()
                    };
                }),
            })),

            setTime: (campaignId, time) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            timeTracking: {
                                ...c.timeTracking,
                                currentDay: time.day,
                                currentHour: time.hour,
                                currentMinute: time.minute
                            },
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            addSessionNote: (campaignId, noteData) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            sessionNotes: [...c.sessionNotes, { ...noteData, id: crypto.randomUUID(), date: Date.now() }],
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            updateSessionNote: (campaignId, noteId, updates) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            sessionNotes: c.sessionNotes.map(n =>
                                n.id === noteId ? { ...n, ...updates } : n
                            ),
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            deleteSessionNote: (campaignId, noteId) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            sessionNotes: c.sessionNotes.filter(n => n.id !== noteId),
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            addNpc: (campaignId, npcData) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            npcs: [...(c.npcs || []), { ...npcData, id: crypto.randomUUID() }],
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            updateNpc: (campaignId, npcId, updates) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            npcs: (c.npcs || []).map(n =>
                                n.id === npcId ? { ...n, ...updates } : n
                            ),
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            deleteNpc: (campaignId, npcId) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            npcs: (c.npcs || []).filter(n => n.id !== npcId),
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            addLocation: (campaignId, locData) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            locations: [...(c.locations || []), { ...locData, id: crypto.randomUUID() }],
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            updateLocation: (campaignId, locId, updates) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            locations: (c.locations || []).map(l =>
                                l.id === locId ? { ...l, ...updates } : l
                            ),
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            deleteLocation: (campaignId, locId) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? {
                            ...c,
                            locations: (c.locations || []).filter(l => l.id !== locId),
                            updatedAt: Date.now()
                        }
                        : c
                ),
            })),

            updateWorldMap: (campaignId, mapUrl) => set((state) => ({
                campaigns: state.campaigns.map((c) =>
                    c.id === campaignId
                        ? { ...c, worldMapUrl: mapUrl, updatedAt: Date.now() }
                        : c
                ),
            })),
        }),
        {
            name: 'dm-assistant-campaigns',
        }
    )
);
