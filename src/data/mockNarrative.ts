import { CampaignNarrative, NarrativeScene, DungeonMap, NarrationBlock } from '../types/campaignNavigator';

/**
 * MOCK DATA for the Campaign Navigator
 * Multi-floor Death House with placeholder text to test the engine
 */

// ─────────────────────────────────────────────────────────
// DUNGEON MAPS — One per floor
// ─────────────────────────────────────────────────────────

const GROUND_FLOOR_MAP: DungeonMap = {
    id: 'map-dh-ground',
    name: 'Death House — Ground Floor',
    floorId: 'floor-ground',
    floorLabel: 'Ground Floor',
    floorOrder: 1,
    width: 1000,
    height: 800,
    chapterIds: ['chap-1'],
    rooms: [
        {
            id: 'room-1a', label: '1A', name: 'Entrance',
            x: 45, y: 75, width: 12, height: 10, shape: 'rect',
            sceneId: 'scene-entrance',
            description: 'Heavy oak doors with wolf-head knockers lead inside.',
            isRevealed: true, isActive: true, status: 'current'
        },
        {
            id: 'room-1b', label: '1B', name: 'Main Hall',
            x: 45, y: 55, width: 14, height: 14, shape: 'rect',
            sceneId: 'scene-main-hall',
            description: 'A wide hall with a sweeping marble staircase and a crystal chandelier.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
        {
            id: 'room-1c', label: '1C', name: 'Den of Wolves',
            x: 25, y: 55, width: 12, height: 12, shape: 'rect',
            sceneId: 'scene-den',
            description: 'Mounted wolves snarl from the walls. A fireplace crackles with dying embers.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
        {
            id: 'room-1d', label: '1D', name: 'Dining Room',
            x: 68, y: 55, width: 12, height: 12, shape: 'rect',
            sceneId: 'scene-dining',
            description: 'An 8-person table set with fine porcelain and silver. Candles burn low.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
        {
            id: 'room-1e', label: '1E', name: 'Kitchen',
            x: 68, y: 35, width: 12, height: 12, shape: 'rect',
            description: 'A stone kitchen with an iron stove. Something smells rotten.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
    ],
    connections: [
        { fromRoomId: 'room-1a', toRoomId: 'room-1b', type: 'door', isRevealed: true },
        { fromRoomId: 'room-1b', toRoomId: 'room-1c', type: 'door', isRevealed: false },
        { fromRoomId: 'room-1b', toRoomId: 'room-1d', type: 'passage', isRevealed: false },
        { fromRoomId: 'room-1d', toRoomId: 'room-1e', type: 'door', isRevealed: false },
    ],
    // Tactical grid defaults
    gridWidth: 20, gridHeight: 20, cellSizePx: 40,
    gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [],
    fogOfWar: [], fogOfWarFreehand: [],
};

const UPPER_FLOOR_MAP: DungeonMap = {
    id: 'map-dh-upper',
    name: 'Death House — Upper Floor',
    floorId: 'floor-upper',
    floorLabel: 'Upper Floor',
    floorOrder: 2,
    width: 1000,
    height: 800,
    chapterIds: ['chap-1'],
    rooms: [
        {
            id: 'room-2a', label: '2A', name: 'Upper Hall',
            x: 45, y: 65, width: 14, height: 10, shape: 'rect',
            sceneId: 'scene-upper-hall',
            description: 'A dusty hallway with portraits that seem to follow you with their eyes.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
        {
            id: 'room-2b', label: '2B', name: 'Master Bedroom',
            x: 25, y: 50, width: 15, height: 14, shape: 'rect',
            sceneId: 'scene-master-bedroom',
            description: 'A four-poster bed draped in moth-eaten velvet. A vanity mirror is cracked.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
        {
            id: 'room-2c', label: '2C', name: 'Nursery',
            x: 65, y: 50, width: 12, height: 12, shape: 'rect',
            sceneId: 'scene-nursery',
            description: 'A crib stands in the corner. Toys are scattered. The air is ice cold.',
            isRevealed: false, isActive: false, status: 'unexplored'
        },
    ],
    connections: [
        { fromRoomId: 'room-2a', toRoomId: 'room-2b', type: 'door', isRevealed: false },
        { fromRoomId: 'room-2a', toRoomId: 'room-2c', type: 'door', isRevealed: false },
    ],
    gridWidth: 20, gridHeight: 20, cellSizePx: 40,
    gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [],
    fogOfWar: [], fogOfWarFreehand: [],
};

const DUNGEON_FLOOR_MAP: DungeonMap = {
    id: 'map-dh-dungeon',
    name: 'Death House — Dungeon Level',
    floorId: 'floor-dungeon',
    floorLabel: 'Dungeon Level',
    floorOrder: 0,
    width: 1000,
    height: 800,
    chapterIds: ['chap-1'],
    rooms: [
        {
            id: 'room-d1', label: 'D1', name: 'Ritual Chamber',
            x: 40, y: 50, width: 20, height: 18, shape: 'rect',
            sceneId: 'scene-ritual-chamber',
            description: 'A vast underground chamber. An altar of black stone. Symbols of Vecna carved into the pillars.',
            isRevealed: false, isActive: false, status: 'locked'
        },
        {
            id: 'room-d2', label: 'D2', name: 'Crypts',
            x: 25, y: 35, width: 12, height: 10, shape: 'rect',
            description: 'Rows of stone coffins. One is slightly ajar.',
            isRevealed: false, isActive: false, status: 'locked'
        },
    ],
    connections: [
        { fromRoomId: 'room-d2', toRoomId: 'room-d1', type: 'passage', isRevealed: false },
    ],
    gridWidth: 16, gridHeight: 16, cellSizePx: 40,
    gridColor: 'rgba(255,255,255,0.12)',
    tokens: [], shapes: [], freehandPaths: [],
    fogOfWar: [], fogOfWarFreehand: [],
};

export const MOCK_DUNGEON_MAPS: DungeonMap[] = [GROUND_FLOOR_MAP, UPPER_FLOOR_MAP, DUNGEON_FLOOR_MAP];

// ─────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────

const bid = () => Math.random().toString(36).substr(2, 9);

const block = (type: NarrationBlock['type'], text: string, extra: Partial<NarrationBlock> = {}): NarrationBlock => ({
    id: bid(), type, text, ...extra
});

// ─────────────────────────────────────────────────────────
// SCENES
// ─────────────────────────────────────────────────────────

const SCENE_ENTRANCE: NarrativeScene = {
    id: 'scene-entrance',
    chapterId: 'chap-1',
    title: 'The Mists Part',
    subtitle: 'Before the Durst Estate',
    order: 1,
    mapRoomId: 'room-1a',
    mapFloorId: 'floor-ground',
    narrationBlocks: [
        block('atmosphere', 'The heavy scent of damp earth and stale wine hangs in the air as the grey mists pull back, revealing a towering, three-story townhouse that seems to loom over the narrow street.'),
        block('read-aloud', 'The house is a vision of dark, weathered stone and rotting wood. Its windows look like hollow eyes, watching as the mists swirl around its base. A rusted iron gate hangs open, leading to an entrance with heavy oak doors.'),
        block('dm-note', 'The players have just been deposited here by the mists. They have level 1 characters. The atmosphere should feel oppressive and silent. Per Fixing Vecna, "the Mists snatch them up from their home area."'),
        block('dialog', 'Welcome to our home. Would you like to come inside where it is warm?', { speaker: 'Rose Durst', emotion: 'Sweet, yet unnerving' }),
        block('description', 'Two small children stand on the cobblestones before the house, their clothes expensive but tattered. The girl, who looks about ten, holds the hand of her younger brother, who clutches a stuffed doll.'),
    ],
    choices: [
        { id: 'c-enter', text: 'Enter the House', targetSceneId: 'scene-main-hall', icon: 'door', consequence: 'The heavy doors creak shut behind you, locking firmly.' },
        { id: 'c-talk', text: 'Question the Children', targetSceneId: 'scene-talk-children', icon: 'dialog', condition: 'Insight (DC 10) to notice their fear' },
        { id: 'c-search', text: 'Examine the Exterior', targetSceneId: 'scene-exterior', icon: 'search', consequence: 'You circle the house, looking for other ways in.' },
    ],
    sources: [
        { documentTitle: 'Fixing Vecna', pageNumber: 2, sectionTitle: 'Levels 1 to 4' },
        { documentTitle: 'Curse of Strahd', pageNumber: 211, sectionTitle: 'Death House' }
    ],
    entities: [
        { id: 'ent-rose', name: 'Rose Durst', type: 'npc', description: 'A 10-year-old girl with dark curls and a dirty dress. She seems frightened but composed.' },
        { id: 'ent-thorn', name: 'Thorn Durst', type: 'npc', description: 'A small boy, about 7, clutching a tattered doll. He hides behind Rose.' },
    ],
    tags: ['exploration', 'roleplay'],
    dmNotes: 'Per Fixing Vecna: "Characters can be created and start in any setting, FR, Eberron, Greyhawk, etc. because the mists will collect them." Rose and Thorn are actually projections — they cannot enter the house.',
};

const SCENE_MAIN_HALL: NarrativeScene = {
    id: 'scene-main-hall',
    chapterId: 'chap-1',
    title: 'The Grand Foyer',
    subtitle: 'Ground Floor — Main Hall',
    order: 2,
    mapRoomId: 'room-1b',
    mapFloorId: 'floor-ground',
    narrationBlocks: [
        block('transition', 'The doors swing inward with a groan...'),
        block('read-aloud', 'A grand entrance hall stretches before you. A red marble staircase climbs along the wall to the upper floor, and a crystal chandelier hangs overhead, coated in a thick layer of dust and cobwebs. Faded portraits line the walls — they depict a stern-looking noble family.'),
        block('atmosphere', 'The air inside is colder than outside. Your breath fogs. The smell of old wood, dust, and something faintly metallic — like old blood — fills your nostrils.'),
        block('description', 'A suit of armor stands in a niche by the staircase, posed with a longsword. The visor seems to track your movement. Double doors lead west, east, and a narrow hallway continues north toward what appears to be a kitchen.'),
        block('dm-note', 'The armor is decorative — it does not animate. On close inspection (Investigation DC 12), one portrait shows Gustav Durst with a small symbol on the ring finger of his right hand: an eye within a palm. Per Fixing Vecna: the Dursts are followers of Vecna.'),
        block('skill-check', 'Investigation (DC 12) on the portraits reveals a peculiar symbol: an eye within an open palm — the mark of Vecna.'),
        block('loot-ref', 'A dusty longsword can be pried from the armor (longsword, mundane, 3 lb, 15 gp value).', { lootDetails: '1× Longsword (mundane)' }),
    ],
    choices: [
        { id: 'c-west', text: 'Go West — The Den of Wolves', targetSceneId: 'scene-den', icon: 'door', consequence: 'Heavy wooden doors open to a parlor full of mounted wolves.' },
        { id: 'c-east', text: 'Go East — The Dining Room', targetSceneId: 'scene-dining', icon: 'door', consequence: 'Double doors reveal a candlelit dining table.' },
        { id: 'c-upstairs', text: 'Climb the Staircase', targetSceneId: 'scene-upper-hall', icon: 'stairs', consequence: 'The marble steps groan beneath your weight.' },
    ],
    sources: [
        { documentTitle: 'Curse of Strahd', pageNumber: 212, sectionTitle: 'Area 1 — Entrance' },
        { documentTitle: 'Fixing Vecna', pageNumber: 10, sectionTitle: 'Level 1 Notes' }
    ],
    entities: [
        { id: 'ent-longsword', name: 'Longsword', type: 'item', lookupKey: 'longsword', description: 'A standard longsword, 3 lb., 15 gp' },
    ],
    tags: ['exploration', 'loot'],
    dmNotes: 'This is the first real room inside. Set the tone here — play up the cold, the silence. The Vecna symbol on the ring is subtle foreshadowing.',
};

const SCENE_UPPER_HALL: NarrativeScene = {
    id: 'scene-upper-hall',
    chapterId: 'chap-1',
    title: 'The Upper Hall',
    subtitle: 'Upper Floor',
    order: 5,
    mapRoomId: 'room-2a',
    mapFloorId: 'floor-upper',
    narrationBlocks: [
        block('transition', 'The marble stairs creak and groan as you ascend...'),
        block('read-aloud', 'The upper hallway is narrower than below. Oil paintings hang crookedly from the walls — each depicts the Durst family, but as you walk past, the painted expressions seem to shift from contentment to distress to outright horror.'),
        block('atmosphere', 'A child\'s laughter echoes from somewhere above, then abruptly stops. The floorboards protest every step.'),
        block('dm-note', 'The moving portraits are a haunt — not a combat encounter. They are unsettling but not dangerous. A DC 14 Perception check notices the last portrait shows a figure in a dark robe with the Vecna symbol stitched into the collar.'),
    ],
    choices: [
        { id: 'c-bedroom', text: 'Enter the Master Bedroom', targetSceneId: 'scene-master-bedroom', icon: 'door', consequence: 'A door hangs slightly ajar, velvet curtains visible within.' },
        { id: 'c-nursery', text: 'Investigate the Nursery', targetSceneId: 'scene-nursery', icon: 'search', consequence: 'A cold draft blows from beneath this door.' },
        { id: 'c-downstairs', text: 'Return Downstairs', targetSceneId: 'scene-main-hall', icon: 'stairs', consequence: 'You head back down the groaning staircase.' },
    ],
    sources: [{ documentTitle: 'Curse of Strahd', pageNumber: 215, sectionTitle: 'Upper Floor' }],
    entities: [],
    tags: ['exploration'],
    dmNotes: 'This floor transitions from eerie to frightening. The portraits are the key atmospheric tool here.',
};

const SCENE_DEN: NarrativeScene = {
    id: 'scene-den',
    chapterId: 'chap-1',
    title: 'Den of Wolves',
    subtitle: 'Ground Floor — West Wing',
    order: 3,
    mapRoomId: 'room-1c',
    mapFloorId: 'floor-ground',
    narrationBlocks: [
        block('read-aloud', 'Mounted wolf heads line the walls, their glass eyes glinting in the firelight. A stone fireplace dominates the far wall, its embers dying. Two leather armchairs face the fire, and a small table between them holds a half-finished game of chess.'),
        block('atmosphere', 'The wolves\' eyes catch the flame just right — for a moment, they seem alive. The room smells of old leather and smoke.'),
        block('dm-note', 'One of the chess pieces is unusual — the king piece is carved into a small hand with an eye (Vecna symbol). A DC 13 Perception check spots it.'),
        block('encounter-ref', 'If players touch the wolves, two animated wolves spring from the wall!', { encounterDetails: '2× Animated Wolf (CR 1/4 each)' }),
    ],
    choices: [
        { id: 'c-back-hall', text: 'Return to the Main Hall', targetSceneId: 'scene-main-hall', icon: 'door' },
    ],
    sources: [{ documentTitle: 'Curse of Strahd', pageNumber: 213, sectionTitle: 'Den' }],
    entities: [],
    tags: ['exploration', 'combat', 'loot'],
    dmNotes: 'The chess king with the Vecna symbol is a Fixing Vecna addition — not in the original adventure.',
    encounter: { monsters: [{ name: 'Wolf', count: 2, cr: '1/4' }], difficulty: 'Easy', description: 'Animated wolves leap from their wall mounts.' }
};

const SCENE_DINING: NarrativeScene = {
    id: 'scene-dining',
    chapterId: 'chap-1',
    title: 'The Silent Feast',
    subtitle: 'Ground Floor — Dining Room',
    order: 4,
    mapRoomId: 'room-1d',
    mapFloorId: 'floor-ground',
    narrationBlocks: [
        block('read-aloud', 'An eight-person dining table is set with fine porcelain plates, tarnished silver cutlery, and crystal goblets filled with a dark red wine. The candelabras still burn. Nobody sits at the table, but every place is set — as if the diners simply vanished.'),
        block('atmosphere', 'The candles flicker despite no breeze. The wine in the goblets is warm to the touch.'),
        block('description', 'A mahogany hutch against the east wall displays fine china. A door to the north leads toward the kitchen.'),
        block('dm-note', 'The wine is harmless but tastes of copper. Anyone who drinks it has vivid but harmless nightmares during their next long rest.'),
    ],
    choices: [
        { id: 'c-kitchen', text: 'Continue to the Kitchen', targetSceneId: 'scene-main-hall', icon: 'door', consequence: 'The kitchen lies through a narrow servant\'s door.' },
        { id: 'c-back-hall2', text: 'Return to the Main Hall', targetSceneId: 'scene-main-hall', icon: 'door' },
    ],
    sources: [{ documentTitle: 'Curse of Strahd', pageNumber: 214, sectionTitle: 'Dining Room' }],
    entities: [],
    tags: ['exploration', 'roleplay'],
    dmNotes: 'The warm wine is a ghost echo of the last dinner the Dursts had before the ritual.',
};

// Placeholder scenes for choices that don't have full content yet
const SCENE_TALK_CHILDREN: NarrativeScene = {
    id: 'scene-talk-children',
    chapterId: 'chap-1', title: 'Words with the Dead', subtitle: 'Before the Durst Estate', order: 1,
    mapRoomId: 'room-1a', mapFloorId: 'floor-ground',
    narrationBlocks: [
        block('dialog', 'There\'s a monster in our house. We\'re scared. Please, will you help us?', { speaker: 'Rose Durst', emotion: 'Tearful, trembling' }),
        block('dialog', '...', { speaker: 'Thorn Durst', emotion: 'Won\'t speak — just points at the house and shakes' }),
        block('dm-note', 'Rose can share: their parents went to the basement and never came back. She heard chanting. She doesn\'t know what Vecna is but may mention "the hand mark" the adults wore.'),
    ],
    choices: [
        { id: 'c-enter2', text: 'Enter the House', targetSceneId: 'scene-main-hall', icon: 'door', consequence: 'The children watch as you step through the gate.' },
        { id: 'c-examine', text: 'Examine the Exterior', targetSceneId: 'scene-exterior', icon: 'search' },
    ],
    sources: [{ documentTitle: 'Fixing Vecna', pageNumber: 10, sectionTitle: 'Level 1 Notes' }],
    entities: [],
    tags: ['roleplay'],
    dmNotes: 'Rose knows about the "hand mark" (Vecna symbol) — she calls it "the grown-up tattoo."',
};

const SCENE_EXTERIOR: NarrativeScene = {
    id: 'scene-exterior',
    chapterId: 'chap-1', title: 'Circling the Estate', subtitle: 'Outside the Durst Home', order: 1,
    mapRoomId: 'room-1a', mapFloorId: 'floor-ground',
    narrationBlocks: [
        block('read-aloud', 'You walk the perimeter of the estate. The walls are thick stone, the windows dark and shuttered. No other doors. The iron fence surrounds the property entirely — no back entrance that you can find.'),
        block('dm-note', 'There is genuinely no other way in. The Mists also prevent leaving the area. The front door is the only option.'),
    ],
    choices: [
        { id: 'c-enter3', text: 'Enter Through the Front Door', targetSceneId: 'scene-main-hall', icon: 'door' },
        { id: 'c-talk2', text: 'Speak with the Children First', targetSceneId: 'scene-talk-children', icon: 'dialog' },
    ],
    sources: [],
    entities: [],
    tags: ['exploration'],
    dmNotes: '',
};

const SCENE_MASTER_BEDROOM: NarrativeScene = {
    id: 'scene-master-bedroom',
    chapterId: 'chap-1', title: 'The Master\'s Quarters', subtitle: 'Upper Floor — Master Bedroom', order: 6,
    mapRoomId: 'room-2b', mapFloorId: 'floor-upper',
    narrationBlocks: [
        block('read-aloud', 'A massive four-poster bed dominates the room, its velvet curtains moth-eaten and grey. A vanity table holds a cracked mirror and scattered jewelry. A writing desk by the window contains a leather journal.'),
        block('loot-ref', 'The jewelry on the vanity: a silver necklace (25 gp), a ruby brooch (40 gp), and a gold ring with the Vecna symbol engraved inside the band.', { lootDetails: '1× Silver Necklace, 1× Ruby Brooch, 1× Signet Ring (Vecna)' }),
        block('dm-note', 'The journal is from Elisabeth Durst. It describes "the Master\'s teachings" and references secret meetings in the basement. One entry mentions: "The hand reveals what the eye conceals." — a Vecna phrase. Per Fixing Vecna: "the Durst family [are] followers of Vecna."'),
    ],
    choices: [
        { id: 'c-back-upper', text: 'Return to the Upper Hall', targetSceneId: 'scene-upper-hall', icon: 'stairs' },
        { id: 'c-to-nursery', text: 'Check the Nursery', targetSceneId: 'scene-nursery', icon: 'door' },
    ],
    sources: [{ documentTitle: 'Fixing Vecna', pageNumber: 2, sectionTitle: 'Death House Modifications' }],
    entities: [],
    tags: ['exploration', 'loot', 'story'],
    dmNotes: 'The ring with the Vecna symbol is key evidence. Players who collect it may recognize the symbol later.',
};

const SCENE_NURSERY: NarrativeScene = {
    id: 'scene-nursery',
    chapterId: 'chap-1', title: 'The Empty Cradle', subtitle: 'Upper Floor — Nursery', order: 7,
    mapRoomId: 'room-2c', mapFloorId: 'floor-upper',
    narrationBlocks: [
        block('read-aloud', 'A wooden crib stands against the wall, its blankets undisturbed. Toys are scattered across the floor — wooden soldiers, a rocking horse missing an eye, and a small doll that looks eerily like Thorn. The temperature drops sharply.'),
        block('atmosphere', 'The doll\'s glass eyes seem to follow you. A music box on the shelf begins to play by itself — a slow, discordant tune.'),
        block('encounter-ref', 'A spectral nursemaid materializes from the crib, wailing!', { encounterDetails: '1× Specter (CR 1)' }),
    ],
    choices: [
        { id: 'c-back-upper2', text: 'Return to the Upper Hall', targetSceneId: 'scene-upper-hall', icon: 'stairs' },
    ],
    sources: [{ documentTitle: 'Curse of Strahd', pageNumber: 216, sectionTitle: 'Nursery' }],
    entities: [],
    tags: ['combat', 'exploration'],
    dmNotes: 'The specter is the nursemaid. She won\'t attack if players show kindness to the doll.',
    encounter: { monsters: [{ name: 'Specter', count: 1, cr: '1' }], difficulty: 'Medium' }
};

// ─────────────────────────────────────────────────────────
// NARRATIVE
// ─────────────────────────────────────────────────────────

export const MOCK_NARRATIVE: CampaignNarrative = {
    id: 'narrative-vecna-death-house',
    title: 'Fixing Vecna: The Durst Legacy',
    description: 'An immersive reimagining of the Death House adventure, following the Fixing Vecna guidelines.',
    sourceDocumentIds: ['pdf-fixing-vecna', 'pdf-death-house'],
    chapters: [
        {
            id: 'chap-1',
            title: 'Chapter 1: Death House',
            subtitle: 'The Durst Estate — Levels 1-3',
            levelRange: '1-3',
            order: 1,
            isUnlocked: true,
            scenes: [
                SCENE_ENTRANCE,
                SCENE_TALK_CHILDREN,
                SCENE_EXTERIOR,
                SCENE_MAIN_HALL,
                SCENE_DEN,
                SCENE_DINING,
                SCENE_UPPER_HALL,
                SCENE_MASTER_BEDROOM,
                SCENE_NURSERY,
            ]
        }
    ],
    currentSceneId: 'scene-entrance',
    visitedSceneIds: ['scene-entrance'],
    createdAt: Date.now(),
    updatedAt: Date.now()
};
