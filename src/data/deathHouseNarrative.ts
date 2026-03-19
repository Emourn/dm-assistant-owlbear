import { CampaignNarrative, DungeonMap, NarrativeScene } from '../types/campaignNavigator';
import { prologueScenes } from './narrative/prologue';
import { groundFloorScenes } from './narrative/groundFloor';
import { secondFloorScenes } from './narrative/secondFloor';
import { thirdFloorScenes } from './narrative/thirdFloor';
import { atticScenes } from './narrative/attic';
import { dungeonScenes } from './narrative/dungeon';
import { escapeScenes } from './narrative/escape';

// --- DUNGEON MAPS - 5 FLOORS -------------------------------------------------

const GROUND_FLOOR: DungeonMap = {
    id: 'map-gf', name: 'Death House - Ground Floor',
    chapterIds: ['chap-deathhouse'],
    floorId: 'floor-ground', floorLabel: 'Ground Floor', floorOrder: 1,
    width: 1000, height: 800,
    rooms: [
        { id: 'gf-1', label: '1', name: 'Entrance', x: 45, y: 80, width: 12, height: 8, shape: 'rect', sceneId: 'dh-1', description: 'Portico with iron gate and heavy oak doors.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'gf-2', label: '2', name: 'Main Hall', x: 45, y: 60, width: 14, height: 14, shape: 'rect', sceneId: 'dh-2', description: 'Sweeping red marble staircase and crystal chandelier.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'gf-3', label: '3', name: 'Den of Wolves', x: 22, y: 55, width: 14, height: 14, shape: 'rect', sceneId: 'dh-3', description: 'Dark oak panels, stuffed wolves, cold fireplace.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'gf-4', label: '4', name: 'Kitchen & Pantry', x: 70, y: 38, width: 12, height: 12, shape: 'rect', sceneId: 'dh-4', description: 'Stone oven, worktable, pantry with "fresh" food.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'gf-5', label: '5', name: 'Dining Room', x: 70, y: 58, width: 12, height: 14, shape: 'rect', sceneId: 'dh-5', description: 'Mahogany table for eight, crystal glasses, tapestry.', isRevealed: false, isActive: false, status: 'unexplored' },
    ],
    connections: [
        { fromRoomId: 'gf-1', toRoomId: 'gf-2', type: 'door', isRevealed: true },
        { fromRoomId: 'gf-2', toRoomId: 'gf-3', type: 'door', isRevealed: false },
        { fromRoomId: 'gf-2', toRoomId: 'gf-5', type: 'passage', isRevealed: false },
        { fromRoomId: 'gf-5', toRoomId: 'gf-4', type: 'door', isRevealed: false },
    ],
    gridWidth: 20, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

const SECOND_FLOOR: DungeonMap = {
    id: 'map-sf', name: 'Death House - Second Floor',
    chapterIds: ['chap-deathhouse'],
    floorId: 'floor-second', floorLabel: 'Second Floor', floorOrder: 2,
    width: 1000, height: 800,
    rooms: [
        { id: 'sf-6', label: '6', name: 'Upper Hall', x: 45, y: 65, width: 14, height: 10, shape: 'rect', sceneId: 'dh-6', description: 'Family portrait and wolf-helm armor.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'sf-7', label: '7', name: "Servants' Room", x: 70, y: 65, width: 10, height: 10, shape: 'rect', sceneId: 'dh-7', description: 'Two beds, pressed uniforms, dumbwaiter.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'sf-8', label: '8', name: 'Library', x: 25, y: 50, width: 15, height: 14, shape: 'rect', sceneId: 'dh-8', description: 'Bookshelves, mahogany desk, iron key.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'sf-9', label: '9', name: 'Secret Room', x: 25, y: 35, width: 12, height: 10, shape: 'rect', sceneId: 'dh-9', description: "Fiend-summoning texts, Strahd's letter, treasure chest.", isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'sf-10', label: '10', name: 'Conservatory', x: 65, y: 45, width: 14, height: 12, shape: 'rect', sceneId: 'dh-10', description: 'Harpsichord, standing harp, alabaster figurines.', isRevealed: false, isActive: false, status: 'unexplored' },
    ],
    connections: [
        { fromRoomId: 'sf-6', toRoomId: 'sf-7', type: 'door', isRevealed: false },
        { fromRoomId: 'sf-6', toRoomId: 'sf-8', type: 'door', isRevealed: false },
        { fromRoomId: 'sf-8', toRoomId: 'sf-9', type: 'secret', isRevealed: false, label: 'Red book trigger' },
        { fromRoomId: 'sf-6', toRoomId: 'sf-10', type: 'door', isRevealed: false },
    ],
    gridWidth: 20, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

const THIRD_FLOOR: DungeonMap = {
    id: 'map-tf', name: 'Death House - Third Floor',
    chapterIds: ['chap-deathhouse'],
    floorId: 'floor-third', floorLabel: 'Third Floor', floorOrder: 3,
    width: 1000, height: 800,
    rooms: [
        { id: 'tf-11', label: '11', name: 'Balcony', x: 45, y: 70, width: 14, height: 10, shape: 'rect', sceneId: 'dh-11', description: 'Overlooks main hall; animated armor guard.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'tf-12', label: '12', name: 'Master Suite', x: 25, y: 50, width: 16, height: 14, shape: 'rect', sceneId: 'dh-12', description: 'Ruined four-poster bed, dusty mirror, jewelry box.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'tf-13', label: '13', name: 'Bathroom', x: 50, y: 45, width: 10, height: 10, shape: 'rect', sceneId: 'dh-13', description: 'Claw-footed tub, rusted kettle.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'tf-14', label: '14', name: 'Storage Room', x: 65, y: 45, width: 10, height: 10, shape: 'rect', sceneId: 'dh-14', description: 'Folded sheets, soap, and a hostile broom.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'tf-15', label: '15', name: "Nursemaid's Suite", x: 65, y: 60, width: 14, height: 12, shape: 'rect', sceneId: 'dh-15', description: 'Ornate mirror, icy nursery with empty crib.', isRevealed: false, isActive: false, status: 'unexplored' },
    ],
    connections: [
        { fromRoomId: 'tf-11', toRoomId: 'tf-12', type: 'door', isRevealed: false },
        { fromRoomId: 'tf-12', toRoomId: 'tf-13', type: 'door', isRevealed: false },
        { fromRoomId: 'tf-11', toRoomId: 'tf-14', type: 'door', isRevealed: false },
        { fromRoomId: 'tf-14', toRoomId: 'tf-15', type: 'door', isRevealed: false },
        { fromRoomId: 'tf-11', toRoomId: 'tf-15', type: 'secret', isRevealed: false, label: 'West wall panel' },
    ],
    gridWidth: 20, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

const ATTIC_FLOOR: DungeonMap = {
    id: 'map-at', name: 'Death House - Attic',
    chapterIds: ['chap-deathhouse'],
    floorId: 'floor-attic', floorLabel: 'Attic', floorOrder: 4,
    width: 1000, height: 800,
    rooms: [
        { id: 'at-16', label: '16', name: 'Attic Hall', x: 45, y: 75, width: 14, height: 8, shape: 'rect', sceneId: 'dh-16', description: 'Bare planks, cobwebs, padlocked door.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'at-17', label: '17', name: 'Spare Bedroom', x: 25, y: 60, width: 12, height: 12, shape: 'rect', sceneId: 'dh-17', description: 'Smiling porcelain doll in the window.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'at-18', label: '18', name: 'Storage Room', x: 65, y: 55, width: 12, height: 10, shape: 'rect', sceneId: 'dh-18', description: "Nursemaid's skeletal remains in a trunk.", isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'at-19', label: '19', name: 'Empty Bedroom', x: 25, y: 42, width: 12, height: 12, shape: 'rect', sceneId: 'dh-19', description: 'Nothing. The absence is the unease.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'at-20', label: '20', name: "Children's Room", x: 45, y: 40, width: 16, height: 14, shape: 'rect', sceneId: 'dh-20', description: 'Two small skeletons. Dollhouse replica. Ghost children.', isRevealed: false, isActive: false, status: 'locked' },
        { id: 'at-21', label: '21', name: 'Secret Stairs', x: 65, y: 38, width: 8, height: 8, shape: 'rect', sceneId: 'dh-21', description: 'Spiral staircase descending 50 ft to dungeon.', isRevealed: false, isActive: false, status: 'locked' },
    ],
    connections: [
        { fromRoomId: 'at-16', toRoomId: 'at-17', type: 'door', isRevealed: false },
        { fromRoomId: 'at-16', toRoomId: 'at-20', type: 'door', isRevealed: false, label: 'Padlocked (key from area 8)' },
        { fromRoomId: 'at-17', toRoomId: 'at-19', type: 'passage', isRevealed: false },
        { fromRoomId: 'at-16', toRoomId: 'at-18', type: 'door', isRevealed: false },
        { fromRoomId: 'at-18', toRoomId: 'at-21', type: 'secret', isRevealed: false, label: 'Revealed by letter or dollhouse' },
    ],
    gridWidth: 20, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

const DUNGEON_LEVEL: DungeonMap = {
    id: 'map-dg', name: 'Death House - Dungeon',
    chapterIds: ['chap-deathhouse'],
    floorId: 'floor-dungeon', floorLabel: 'Dungeon Level', floorOrder: 0,
    width: 1200, height: 1000,
    rooms: [
        { id: 'dg-22', label: '22', name: 'Dungeon Access', x: 50, y: 80, width: 6, height: 14, shape: 'rect', sceneId: 'dh-22', description: 'Base of the spiral stairs. Dirt floor, rotting timber ceilings.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-23', label: '23', name: 'Family Crypts', x: 25, y: 75, width: 14, height: 14, shape: 'rect', sceneId: 'dh-23', description: 'Four stone sarcophagi. Gustav, Elisabeth, Rose, Thorn.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-24', label: '24', name: "Cult Initiates' Quarters", x: 25, y: 45, width: 14, height: 16, shape: 'rect', sceneId: 'dh-24', description: 'Straw pallets and centipede swarms.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-26', label: '26', name: 'Hidden Shrine', x: 50, y: 45, width: 22, height: 14, shape: 'rect', sceneId: 'dh-26', description: "Ghoul statues, bloodstained altar, Delvin's corpse.", isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-27', label: '27', name: 'The Prison', x: 80, y: 45, width: 10, height: 16, shape: 'rect', sceneId: 'dh-27', description: 'Four iron cages, chained skeletons.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-28', label: '28', name: "Darklord's Shrine", x: 50, y: 15, width: 14, height: 14, shape: 'rect', sceneId: 'dh-28', description: 'Statue of Strahd in water, crystal orb.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-29', label: '29', name: 'Master Crypt', x: 25, y: 20, width: 14, height: 12, shape: 'rect', sceneId: 'dh-29', description: 'Gustav and Elisabeth as ghasts.', isRevealed: false, isActive: false, status: 'locked' },
        { id: 'dg-30', label: '30', name: 'Reliquary', x: 20, y: 8, width: 8, height: 8, shape: 'rect', sceneId: 'dh-30', description: 'Gouged earth cave. Cult treasures in a chest.', isRevealed: false, isActive: false, status: 'unexplored' },
        { id: 'dg-31', label: '31', name: 'The Ritual Chamber', x: 80, y: 15, width: 18, height: 20, shape: 'rect', sceneId: 'dh-31', description: 'Blood-drenched altar, cult echoes, flesh mound.', isRevealed: false, isActive: false, status: 'locked' },
    ],
    connections: [
        { fromRoomId: 'dg-22', toRoomId: 'dg-23', type: 'passage', isRevealed: false },
        { fromRoomId: 'dg-22', toRoomId: 'dg-26', type: 'passage', isRevealed: false },
        { fromRoomId: 'dg-23', toRoomId: 'dg-24', type: 'passage', isRevealed: false },
        { fromRoomId: 'dg-26', toRoomId: 'dg-27', type: 'passage', isRevealed: false },
        { fromRoomId: 'dg-24', toRoomId: 'dg-28', type: 'door', isRevealed: false, label: 'Locked iron gate' },
        { fromRoomId: 'dg-27', toRoomId: 'dg-28', type: 'stairs', isRevealed: false },
        { fromRoomId: 'dg-28', toRoomId: 'dg-29', type: 'passage', isRevealed: false, label: 'Rusted portcullis' },
        { fromRoomId: 'dg-28', toRoomId: 'dg-31', type: 'door', isRevealed: false },
        { fromRoomId: 'dg-29', toRoomId: 'dg-30', type: 'passage', isRevealed: false },
    ],
    gridWidth: 24, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.08)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

export const DEATH_HOUSE_MAPS: DungeonMap[] = [GROUND_FLOOR, SECOND_FLOOR, THIRD_FLOOR, ATTIC_FLOOR, DUNGEON_LEVEL];

// --- NEVERWINTER PROLOGUE MAPS -----------------------------------------------

const NEVERWINTER_CITY: DungeonMap = {
    id: 'map-nw-city', name: 'Neverwinter — City Overview',
    chapterIds: ['chap-prologue', 'chap-deathhouse-escape'],
    floorId: 'floor-nw-city', floorLabel: 'City Overview', floorOrder: 0,
    width: 1200, height: 1000,
    rooms: [
        { id: 'nw-harbor', label: 'H', name: 'Harbor District', x: 75, y: 15, width: 18, height: 12, shape: 'rect', sceneId: undefined, description: 'Docks, warehouses, and the fish market. Fog rolls in from here.', isRevealed: true, isActive: false, status: 'explored' },
        { id: 'nw-enclave', label: 'PE', name: "Protector's Enclave", x: 45, y: 30, width: 20, height: 14, shape: 'rect', sceneId: undefined, description: 'The civic heart of Neverwinter — markets, taverns, and the road to the Keep.', isRevealed: true, isActive: false, status: 'explored' },
        { id: 'nw-keep', label: 'K', name: "Neverember's Keep", x: 45, y: 55, width: 16, height: 16, shape: 'rect', sceneId: 'prologue-keep', description: 'Seat of the Lord Protector. Private study on the second floor.', isRevealed: true, isActive: false, status: 'unexplored' },
        { id: 'nw-western-ruins', label: 'WR', name: 'Western Ruins', x: 15, y: 50, width: 18, height: 18, shape: 'rect', sceneId: undefined, description: 'Crumbling district above the catacombs. The cult operates beneath.', isRevealed: true, isActive: false, status: 'unexplored' },
        { id: 'nw-saltriver', label: 'SL', name: 'Saltriver Lane', x: 15, y: 75, width: 14, height: 10, shape: 'rect', sceneId: undefined, description: "Hendrick's cooperage. Drainage tunnel entry to the catacombs behind it.", isRevealed: true, isActive: false, status: 'unexplored' },
        { id: 'nw-cloak-tower', label: 'CT', name: 'Cloak Tower', x: 75, y: 55, width: 10, height: 10, shape: 'circle', sceneId: undefined, description: 'Ancient wizard tower. Its wards hum faintly — thinner today than usual.', isRevealed: true, isActive: false, status: 'explored' },
    ],
    connections: [
        { fromRoomId: 'nw-enclave', toRoomId: 'nw-harbor', type: 'passage', isRevealed: true, label: 'Harbor Road' },
        { fromRoomId: 'nw-enclave', toRoomId: 'nw-keep', type: 'passage', isRevealed: true, label: 'Keep Road' },
        { fromRoomId: 'nw-enclave', toRoomId: 'nw-western-ruins', type: 'passage', isRevealed: true, label: 'West Road' },
        { fromRoomId: 'nw-western-ruins', toRoomId: 'nw-saltriver', type: 'passage', isRevealed: true, label: 'Alley' },
        { fromRoomId: 'nw-enclave', toRoomId: 'nw-cloak-tower', type: 'passage', isRevealed: true },
    ],
    gridWidth: 24, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.08)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

const NEVERWINTER_KEEP: DungeonMap = {
    id: 'map-nw-keep', name: "Neverember's Keep — Interior",
    chapterIds: ['chap-prologue'],
    floorId: 'floor-nw-keep', floorLabel: "The Keep", floorOrder: 1,
    width: 1000, height: 800,
    rooms: [
        { id: 'keep-gate', label: 'G', name: 'Main Gate', x: 50, y: 85, width: 14, height: 8, shape: 'rect', sceneId: undefined, description: 'Iron-banded oak doors. Guards wave you through without checking credentials.', isRevealed: true, isActive: false, status: 'explored' },
        { id: 'keep-hall', label: 'H', name: 'Entrance Hall', x: 50, y: 70, width: 20, height: 12, shape: 'rect', sceneId: undefined, description: 'Usually crowded with petitioners and clerks. Today: empty. Silent.', isRevealed: true, isActive: false, status: 'explored' },
        { id: 'keep-garrison', label: 'GR', name: 'Garrison Hall', x: 25, y: 55, width: 16, height: 14, shape: 'rect', sceneId: undefined, description: 'Off-duty soldiers playing cards with distracted energy.', isRevealed: true, isActive: false, status: 'explored' },
        { id: 'keep-anteroom', label: 'A', name: 'Anteroom', x: 25, y: 38, width: 12, height: 12, shape: 'rect', sceneId: 'prologue-fearneharts', description: 'Small fieldstone room. Table with hand-drawn map. The Fearneharts wait here.', isRevealed: true, isActive: false, status: 'unexplored' },
        { id: 'keep-stairs', label: 'S', name: 'Spiral Staircase', x: 50, y: 50, width: 6, height: 10, shape: 'rect', sceneId: undefined, description: 'Tight stone spiral leading to the private study above.', isRevealed: true, isActive: false, status: 'explored' },
        { id: 'keep-study', label: 'PS', name: "Lord Protector's Study", x: 50, y: 30, width: 18, height: 16, shape: 'rect', sceneId: 'prologue-keep', description: 'Oak-paneled walls. Maps buried under red pins. Decanter of amber liquor, untouched.', isRevealed: true, isActive: false, status: 'unexplored' },
        { id: 'keep-armory', label: 'AR', name: 'Armory', x: 75, y: 55, width: 12, height: 12, shape: 'rect', sceneId: undefined, description: 'Weapons racks and supply crates. Neverember said to take what you need.', isRevealed: true, isActive: false, status: 'unexplored' },
    ],
    connections: [
        { fromRoomId: 'keep-gate', toRoomId: 'keep-hall', type: 'door', isRevealed: true },
        { fromRoomId: 'keep-hall', toRoomId: 'keep-garrison', type: 'passage', isRevealed: true },
        { fromRoomId: 'keep-garrison', toRoomId: 'keep-anteroom', type: 'door', isRevealed: true, label: 'Side door' },
        { fromRoomId: 'keep-hall', toRoomId: 'keep-stairs', type: 'stairs', isRevealed: true },
        { fromRoomId: 'keep-stairs', toRoomId: 'keep-study', type: 'stairs', isRevealed: true, label: 'Up to 2nd floor' },
        { fromRoomId: 'keep-hall', toRoomId: 'keep-armory', type: 'door', isRevealed: true },
    ],
    gridWidth: 20, gridHeight: 20, cellSizePx: 40, gridColor: 'rgba(255,255,255,0.10)',
    tokens: [], shapes: [], freehandPaths: [], fogOfWar: [], fogOfWarFreehand: [],
};

export const NEVERWINTER_MAPS: DungeonMap[] = [NEVERWINTER_CITY, NEVERWINTER_KEEP];
export const ALL_CAMPAIGN_MAPS: DungeonMap[] = [...NEVERWINTER_MAPS, ...DEATH_HOUSE_MAPS];

// --- COMPILE MODULE SCENES --------------------------------------------------

const ALL_SCENES: NarrativeScene[] = [
    ...prologueScenes,
    ...groundFloorScenes,
    ...secondFloorScenes,
    ...thirdFloorScenes,
    ...atticScenes,
    ...dungeonScenes,
    ...escapeScenes
];

// --- CAMPAIGN EXPORT --------------------------------------------------------

export const DEATH_HOUSE_NARRATIVE: CampaignNarrative = {
    id: 'cp-death-house',
    campaignId: 'cp-death-house',
    title: 'Fixing Vecna: Prologue + Death House',
    description: 'Prologue into Death House with full narrative, horror pacing, and integrated Vecna hooks.',
    chapters: [
        {
            id: 'chap-prologue',
            title: 'Prologue: The Eye and the Mists',
            order: 0,
            levelRange: 'Levels 1-2',
            isUnlocked: true,
            scenes: ALL_SCENES.filter(s => s.chapterId === 'chap-prologue')
        },
        {
            id: 'chap-deathhouse',
            title: 'The Death House',
            order: 1,
            levelRange: 'Levels 1-3',
            isUnlocked: true,
            scenes: ALL_SCENES.filter(s => s.chapterId === 'chap-deathhouse')
        },
        {
            id: 'chap-deathhouse-escape',
            title: 'The Gauntlet',
            order: 2,
            levelRange: 'Level 3',
            isUnlocked: true,
            scenes: ALL_SCENES.filter(s => s.chapterId === 'chap-deathhouse-escape')
        }
    ],
    currentSceneId: 'prologue-morning',
    visitedSceneIds: [],
    sourceDocumentIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
};

