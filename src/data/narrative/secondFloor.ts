import { NarrativeScene } from '../../types/campaignNavigator';
import { B } from './builder';

export const secondFloorScenes: NarrativeScene[] = [
    // ══════════════════════════════════════════════════════════════════════
    // AREA 6 – UPPER HALL
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-6', chapterId: 'chap-deathhouse',
        title: 'Upper Hall', subtitle: 'Second Floor, Area 6', order: 6,
        mapRoomId: 'sf-6', mapFloorId: 'floor-second',
        narrationBlocks: [
            B('read-aloud', "The staircase delivers you to a wide, carpeted hallway of the second floor. The red-and-gold runner underfoot muffles your steps completely. Oil lamps in wall sconces are unlit, but the wick-stains suggest they were lit often. Heavy velvet drapes divide the hall from a narrow alcove at the far end — dark behind them, the darkness very still."),
            B('read-aloud', "Two suits of plate armor flank the hallway, standing at attention beside their respective doors. Both helms are forged into snarling wolf faces — jaws open, teeth prominent, eye sockets dark and empty. Both suits hold halberds angled inward at 45 degrees, the blades meeting in an X that spans the corridor if you tried to pass between them."),
            B('atmosphere', "It is colder here than the ground floor. Noticeably. Not the cold of poor insulation — the stone walls are thick. Something is drawing heat out of this hallway specifically. Your breath doesn't mist, but it almost should."),
            B('read-aloud', "At the hallway's center, a large family portrait hangs in a gilt frame darkened with age. The Durst family, formally posed: a heavyset man with an air of authority, a narrow-faced woman in a high-collared gown, two children standing with the rigid discomfort of children who have been told many times not to fidget. The man holds a swaddled infant in the crook of his arm."),
            B('skill-check', "DC 14 Perception — Studying the portrait carefully:\n\nSUCCESS: The composition of every family portrait places parents facing their children, or everyone facing outward. This one is different: the father faces forward, the children look toward the father, and the mother looks at neither. Her eyes are aimed with absolute precision at the infant he holds. Her expression is not love or pride or anxiety. It is contempt. Pure and cold and painted with careful craft by someone who either did not notice or did not care to flatter her.\n\nAlso: in the background of the painting, barely visible and almost obscured by the formal drape, there is a fifth door — one that does not correspond to any door in the hallway you are standing in."),
            B('skill-check', "DC 12 Investigation — Examining the armor suits:\n\nSUCCESS: The suits are occupied. Not by creatures — by something preserved inside. The joint seams bleed when pressed: not fresh blood, but something thicker and darker that smells of old iron. The halberds are functional and could be taken (reach weapon, 1d10 slashing). The armor itself is fused from years of the house's peculiar preservation — useless as equipment.\n\nIf a character tries to force the armor out of their path: each suit weighs approximately 450 lbs and will not yield. They have no apparent mechanism that can be activated from the outside."),
            B('dm-note', "ARMOR RULE FOR THIS FLOOR:\n\nThe wolf armor does NOT animate on the second floor. That happens on the third. The second-floor suits are locked in place and function purely as environmental dread — heavy, watching, full of something dead.\n\nIf players attack them: they take 6 damage before announcing: 'The armor shudders when struck but not with vibration — with something that feels like surprise, like being woken up. Its head turns slowly to look at whoever struck it. It does not move toward you. It just looks.'\n\nIf they take the halberds: they work normally. The suits don't protest."),
            B('dm-note', "SECOND FLOOR CONNECTIONS:\n• North door (behind armor) → Servants' Room (Area 7)\n• South door → Library (Area 8)\n• East door → Conservatory (Area 10)\n• Stairway → Third Floor (Area 11)"),
            B('description', "Doors lead to the Servants' Room (north), the Library (south), and the Conservatory (east). The staircase continues up to the third floor."),
        ],
        choices: [
            { id: 'c-gf2', text: 'Go Downstairs', targetSceneId: 'dh-2', icon: 'stairs', consequence: 'You descend back to the ground floor.' },
            { id: 'c-sf7', text: "Enter Servants' Room (North)", targetSceneId: 'dh-7', icon: 'door', consequence: 'You edge past the wolf helm and try the northern door.' },
            { id: 'c-sf10', text: 'Enter Conservatory (East)', targetSceneId: 'dh-10', icon: 'door', consequence: 'You open the eastern door.' },
            { id: 'c-sf8', text: 'Enter Library (South)', targetSceneId: 'dh-8', icon: 'door', consequence: 'You open the southern door.' },
            { id: 'c-tf11', text: 'Climb to the Third Floor', targetSceneId: 'dh-11', icon: 'stairs', consequence: 'You continue up the staircase.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 6. Upper Hall' }],
        entities: [],
        tags: ['exploration', 'story'],
        dmNotes: 'The portrait is one of the best moments in this house. Pause after describing the mother\'s expression. Let it sink in. If players ask what she is looking at: "The baby." The tone of that answer should tell them everything about what kind of mother Elisabeth Durst was. The wolf armor paranoia isn\'t resolved here — it pays off on Floor 3.',
        estimatedMinutes: 10,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 7 – SERVANTS' ROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-7', chapterId: 'chap-deathhouse',
        title: "Servants' Room", subtitle: 'Second Floor, Area 7', order: 7,
        mapRoomId: 'sf-7', mapFloorId: 'floor-second',
        narrationBlocks: [
            B('read-aloud', "A plain, undecorated room. Two narrow beds with wool blankets folded tight at their corners. A small table between them with a stub candle and an unlit lamp. Pressed servant uniforms are draped over the bed frames — ironed, buttoned to the collar, ready for a body to step into them. The boots are gone."),
            B('atmosphere', "Unlike the rest of the house, this room has no pretense. It was functional, it served, and it was abandoned with the domestic urgency of people who left in the middle of a task they didn't get to finish."),
            B('skill-check', "DC 11 Investigation — Looking under the beds or inside the mattress seams:\n\nSUCCESS: Under the left mattress: a small handmade cloth wallet containing 3 sp and a folded letter, written in a cramped, careful hand: 'Mia — Do not go in the basement when the candles are lit. I mean it. Whatever the Mister and Missus do down there is not our concern and God help you if you make it yours. Burn this. — T'\n\nThe letter is not burned. Whether Mia listened or not, you have no way of knowing."),
            B('dm-note', "DUMBWAITER:\n\nA wooden box on a rope-and-pulley in the northwest corner. Press the button on the wall beside it and a small bell rings in the kitchen below. The shaft connects to the kitchen (Area 4) and to an access point beside the master suite (Area 12) on the third floor.\n\nA Small creature can ride it. A Medium creature can attempt to squeeze: DC 12 Acrobatics, failure means they get stuck for 1 round before the box returns to where it started.\n\nPotential uses:\n• A familiar can travel between floors via the dumbwaiter shaft\n• A Small character can reconnoiter the master suite before the party arrives\n• Climbing the rope instead of using the box: DC 13 Athletics"),
        ],
        choices: [
            { id: 'c-sf6', text: 'Return to Upper Hall', targetSceneId: 'dh-6', icon: 'path', consequence: "You step back out into the hall past the wolf armor." },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: "Area 7. Servants' Room" }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'The letter is a small, human horror. Two servants. One is trying to warn the other. The warning was not heeded. Leave the players to sit with that. Do not give this scene more than 5 minutes — it is a breather and a lore crumb.',
        estimatedMinutes: 5,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 8 – LIBRARY
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-8', chapterId: 'chap-deathhouse',
        title: 'Library', subtitle: 'Second Floor, Area 8', order: 8,
        mapRoomId: 'sf-8', mapFloorId: 'floor-second',
        narrationBlocks: [
            B('read-aloud', "Floor-to-ceiling shelves wrap three walls, packed with hundreds of heavy volumes. A mahogany desk sits in the center, positioned to face the door — whoever worked here liked to see who was entering. A red leather high-back chair faces the desk. The lamp above the desk is iron, elegant, unlit. They spent money on this room. Spent significant money."),
            B('read-aloud', "Every book on every shelf is perfectly upright. Spine out, precisely placed, alphabetized in Old Common. Whoever did this was meticulous. Or obsessive. Or both. Every book except one: a fat red tome on the middle shelf, slightly out of alignment, its spine worn smooth at eye level where fingers have found it again and again."),
            B('atmosphere', "Old paper and dried ink. Beneath that: faint sulfur, the residue of a room where certain kinds of texts have been read many times over many years. This is not a reading room. This is a workroom."),
            B('skill-check', "DC 12 Investigation — Examining the books generally:\n\nSUCCESS: Most are legitimate academic texts: natural philosophy, history, cartography, heraldry, architecture. But the subjects cluster around a specific period of Pre-Spellplague history — specifically works relating to arcanist death cults of the Eastern Underdark. There are also several texts on the anatomic differences between living and undead tissue. These books are annotated in multiple hands, as if they were studied by several people."),
            B('skill-check', "DC 14 Investigation — Examining the red book specifically:\n\nSUCCESS: 'The Anatomy of Beasts' — a legitimate natural history text on the surface. The shelf shows fresh scuff marks where the book has been pulled forward hundreds of times. If pulled: the entire shelf section swings inward on a hidden pivot, revealing the Secret Room (Area 9). The mechanism is well-oiled — completely silent."),
            B('loot-ref', "On the desk: a heavy iron key with a wolf-head bow. It fits the padlocked door to the Children's Room in the attic (Area 20).", { lootDetails: 'Iron Key (unlocks Attic Area 20)' }),
            B('dm-note', "DESK CONTENTS — If searched:\n\n• Top drawer: dried ink, two quill pens, a blank sheaf of parchment.\n• Bottom drawer (stuck, DC 10 Strength): a brass paperweight in the shape of a hand holding an eye — clearly a Vecna cult object. Worth 15 gp as a curiosity; 45 gp if sold to the right collector who knows what it is.\n• On the desk surface: a half-filled logbook with entries noting dates, names, and amounts. Some entries read: 'Offering received. 6 silver, 2 cp.' and 'Two more swear the Oath.' The last entry is dated and the ink is smeared as if the writer was hurried: 'The Eye accepts. It is done. Walter is —' It ends there."),
            B('dm-note', "VECNA LOG KEY:\n\nThe 'Eye' in the logbook is the Eldritch Eye — the artifact the party will find on Delvin's body in the dungeon. The Dursts were not Strahd's servants. They were Vecna's. They were placed here through Strahd's domain by Vecna's influence, tasked with building a cell. The Eye was meant to be delivered to a greater collector. It was not."),
            B('description', "The secret door is behind the red book. The only other exit is back to the upper hall."),
        ],
        choices: [
            { id: 'c-sf6', text: 'Return to Upper Hall', targetSceneId: 'dh-6', icon: 'path', consequence: 'You leave the library.' },
            { id: 'c-sf9', text: "Pull the Red Book → Secret Room", targetSceneId: 'dh-9', icon: 'search', consequence: 'The shelf swings inward without a sound. Cold air exhales from beyond.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 8. Library' }],
        entities: [],
        tags: ['exploration', 'puzzle', 'loot'],
        dmNotes: 'MAKE SURE THE KEY IS FOUND. Players who miss the attic key will face a lockpick bottleneck later. If they search the desk, they find it. If they don\'t search the desk by the time they reach the attic, feel free to have one player notice it glinting under the desk lamp or have it visible in a DC 10 Perception check. It is too important to miss.',
        estimatedMinutes: 12,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 9 – SECRET ROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-9', chapterId: 'chap-deathhouse',
        title: 'Secret Room', subtitle: 'Second Floor, Area 9', order: 9,
        mapRoomId: 'sf-9', mapFloorId: 'floor-second',
        narrationBlocks: [
            B('read-aloud', "The shelf opens onto a room with no windows, no decoration, and no pretense. The smell hits immediately: sulfur, old blood, and the particular sharpness of preserved things in a sealed space. Shelves hold grimoires bound in what you would rather not identify as leather. Iron brackets line the walls, the rings and chains hanging from them long since gone cold and still."),
            B('read-aloud', "A figure in black robes is slumped over a small writing desk in the far corner. Not dramatically — they have simply ceased to be upright, their weight settling forward over years until their forehead rests on the desk surface. Their hands still grip a parchment. Their flesh has long dried and gone tight. This person did not leave."),
            B('atmosphere', "The cold here is specific. Not the general cold of the second floor hallway. This is the cold of a room where something happened that cannot be taken back, and the space remembers it."),
            B('skill-check', "DC 13 Medicine or Investigation — Examining the skeleton:\n\nSUCCESS: This person died of thirst, over a period of no less than a week. There are no wounds. Nothing killed them except being sealed in a room with no exit — the secret door only opens from the library side. The door they used to enter is not present in this room. They were locked in from outside and chose to write rather than beat on the wall.\n\nThe parchment they clutch is from Strahd. Read aloud immediately after describing this."),
            B('dialog', "My most pathetic servant,\n\nI am not a messiah. I am not a god waiting to repay devotion. You are not missionaries. You are not chosen ones. You are worms writhing in my earth, and your underground games and your little eye-and-hand prayers are an amusement that has grown tiresome.\n\nYou reached out to me. You offered. I did not respond. The correct lesson is silence, not repeat correspondence.\n\nIf you write again, I will stop ignoring you.\n\n— S.Z.V.", { speaker: 'The Letter (signed by Strahd von Zarovich)', emotion: 'Elegant penmanship. Ice-cold register. Written with the absolute economy of someone who has never in their life needed to raise their voice to be frightening.' }),
            B('dm-note', "LETTER CONTEXT:\n\nThis is critical campaign lore. The Dursts were Vecna cultists trying to gain Strahd's patronage as a secondary power. Strahd refused them entirely. They died here not because of Strahd but despite him — their devotion to Vecna ultimately consumed them in ways Strahd never needed to engineer.\n\nThe skeleton is not Gustav Durst. Gustav became a ghast in the dungeon. This is a tertiary cultist — a priest or acolyte who was locked in here as punishment for sending the letter without permission and then simply... never let out."),
            B('loot-ref', "An iron-bound chest in the corner contains the party's most significant finds in the house above the dungeon.", { lootDetails: 'Cloak of Protection (+1 AC & saves, attunement) • 4x Potion of Healing • Chain Shirt • Silver Shortsword • Iron Gate Key (unlocks dungeon Area 24 gate)' }),
            B('dm-note', "CHEST DETAILS:\n\n• Lock: DC 15 Thieves' Tools to pick. Alternatively, AC 15, 20 HP to break.\n• Cloak of Protection: Gives +1 to AC and saving throws while attuned. Worth giving to whoever needs it most.\n• Silver Shortsword: Functions as a magic weapon for purposes of overcoming resistances; useful against the undead ahead.\n• Iron Gate Key: THIS IS CRITICAL. It opens the iron gate in the dungeon (Area 24). Players who miss this key face DC 16 picking or DC 20 forcing to proceed past that chokepoint. Make sure someone picks this up.\n\nBooks on the shelves: include texts in Abyssal and Infernal, one in an entirely unknown script. Reading them requires 8 hours and a DC 15 Arcana; results in a temporary madness. Do not encourage players to read them deeply during the session."),
        ],
        choices: [
            { id: 'c-sf8', text: 'Return to the Library', targetSceneId: 'dh-8', icon: 'path', consequence: 'You leave the sealed room, grateful for the relatively cleaner air of the library.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 9. Secret Room' }],
        entities: [
            { id: 'ent-cloak', name: 'Cloak of Protection', type: 'item', description: '+1 AC and saving throws, requires attunement. Found in the iron-bound chest.' }
        ],
        tags: ['exploration', 'story', 'loot'],
        dmNotes: 'Read the letter slowly. Pause between paragraphs. Strahd\'s letters are one of the great character-defining moments in Curse of Strahd — use the condescension fully. After the letter, let players register the horror that the skeleton died in here with that letter in hand, writing repeatedly to someone who never responded. That is who these cultists were. Not powerful. Just wrong.',
        estimatedMinutes: 15,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 10 – CONSERVATORY
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-10', chapterId: 'chap-deathhouse',
        title: 'Conservatory', subtitle: 'Second Floor, Area 10', order: 10,
        mapRoomId: 'sf-10', mapFloorId: 'floor-second',
        narrationBlocks: [
            B('read-aloud', "A music room, or it was. The western wall holds a harpsichord of dark cherry wood, its lid propped open, strings stretched with age but unbroken. A standing silver-stringed harp occupies the corner by the rain-streaked window. Four alabaster figurines stand on marble plinths between them — dancers, arrested mid-step, carved with extraordinary detail: the turn of a wrist, the curve of a shoulder, the tilt of a chin."),
            B('read-aloud', "As you enter the room, the harpsichord plays three notes. Not a full phrase — just three: descending, unresolved, the beginning of something that refuses to be finished. Then silence. Then, approximately thirty seconds later: the same three notes. Descending. Unresolved."),
            B('atmosphere', "The room smells of old rosin and the particular dry cold of string instruments in an unheated space. The window has three cracks in its panes, each sealed with dark wax from the inside — someone spent time up here and was bothered by the draft."),
            B('skill-check', "DC 12 Performance or Arcana — If a player plays the harpsichord:\n\nSUCCESS: They can play normally. Every melody they attempt sounds technically correct but emotionally wrong — as if the instrument is performing a perfect simulation of music without understanding why music exists. Any song a player plays: the harpsichord plays it back in a minor key, five seconds later, even if they have stopped playing.\n\nDC 14 Arcana (follow-up, same check): The harpsichord is under a minor enchantment of the house — not a trap, not a spirit, just the house itself, maintaining the sound the room used to make."),
            B('skill-check', "DC 14 Perception — Examining the figurines:\n\nSUCCESS: The fourth figurine — the one farthest from the window — has been moved from its original position. You can see the clean circle its plinth left in the dust on the floor, about eight inches from where it currently stands. Whatever moved it placed it facing the door. The figurine's carved stone face is positioned to watch the entrance."),
            B('dm-note', "CONSERVATORY INTERACTABLES:\n\n• Air vent near the baseboard: DC 14 Perception to hear a faint, rhythmic sound from below — not quite a heartbeat but with similar regularity. It is the chanting in the ritual chamber far below, traveling up through the structural walls.\n\n• Wax window seals: DC 11 Investigation reveals the wax contains embedded hair — fine, dark, possibly from the children or the nursemaid.\n\n• No combat here. The room is a mood piece.\n\nIF PLAYERS BREAK A FIGURINE: They take no damage. But the remaining three figurines' heads turn to look at whoever broke it. They do not move again after that. Do not explain this."),
        ],
        choices: [
            { id: 'c-sf6', text: 'Return to Upper Hall', targetSceneId: 'dh-6', icon: 'path', consequence: 'You step back out into the hallway.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 10. Conservatory' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'Pacing note: this is a SHORT room. Do not over-explain. The three notes on repeat, the figurine watching the door, maybe the air vent pulse — pick TWO of those three and keep the scene moving. The house builds dread through accumulation, not through long individual scenes. Five minutes maximum.',
        estimatedMinutes: 6,
    },
];
