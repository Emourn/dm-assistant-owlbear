import { NarrativeScene } from '../../types/campaignNavigator';
import { B } from './builder';

export const groundFloorScenes: NarrativeScene[] = [
    // ══════════════════════════════════════════════════════════════════════
    // AREA 1 – THE ENTRANCE
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-1', chapterId: 'chap-deathhouse',
        title: 'The Entrance', subtitle: 'Death House – Ground Floor, Area 1', order: 1,
        mapRoomId: 'gf-1', mapFloorId: 'floor-ground',
        narrationBlocks: [
            B('read-aloud', "The village street before you is empty. Not the empty of a sleeping town — the empty of abandonment, as though everyone left in a hurry long ago and did not bother to tell the buildings. Most windows are boarded. Most doors are sealed. The fog presses close on all sides, all but the road directly ahead."),
            B('read-aloud', "And directly ahead: a house. A tall, narrow, three-story brick rowhouse with a jutting attic above. It is the only building in this village with its lights on — faint, orange-yellow, like candlelight behind dirty glass. The windows are not boarded. The iron gate in the stone portico stands slightly, deliberately, ajar."),
            B('atmosphere', "No wind. The air is absolutely still. And yet the heavy oak doors behind the gate shudder — once — as if settling their weight. As if breathing."),
            B('read-aloud', "Then you see the children. A boy and an older girl, huddled together in the middle of the street in front of the gate. The boy wears tattered breeches and a dirty blue shirt, clutching a stuffed cloth doll to his chest, tears streaking through filth on his face. The girl holds his hand with both of hers, eyes wide, looking at each of you in the desperate way that children look at adults when they need someone larger to make the terrible thing stop."),
            B('dialog', "There's a monster. In our house. Our mama and papa went to the basement to trap it and they didn't come back and the baby — Walter, our baby brother — he's crying upstairs and we can't go in because of the monster and —", { speaker: 'Rose (the older girl)', emotion: 'Terrified, tumbling over words, trying very hard not to cry and failing' }),
            B('dialog', "Please. Please help us. We just want to go home.", { speaker: 'Thorn (the younger boy)', emotion: 'A whisper. He does not take his eyes off the house.' }),
            B('atmosphere', "Behind them, through the iron gate, the oak doors remain slightly open. Just enough to show darkness inside."),
            B('skill-check', "DC 12 Insight — Ask only if players interact with the children:\n\nSUCCESS: Everything about them is right — the emotion, the body language, the desperation. But their clothes are dry. It has been drizzling since you arrived in the village, and they've been standing here. They should be soaked. Also, when the wind doesn't blow, the girl's hair doesn't move either.\n\nFAILURE: They read as two frightened, ordinary children. Your heart probably breaks a little."),
            B('skill-check', "DC 14 Investigation — If a player looks at the street around the children:\n\nSUCCESS: There are muddy child-sized footprints on the cobblestones. They lead from the portico gate to where the children stand, then back, then forward again — as if they've been pacing. But there are no footprints that lead away from the house from any other direction. They didn't walk from anywhere else."),
            B('dm-note', "CHILDREN MECHANICS — Print this. You will need it:\n\nRose and Thorn are illusions created by the house. They are bound to lure visitors inside. Despite this, they experience fear and sadness in a completely genuine way — the house shaped them from the real children's last emotional imprints.\n\n• Physical contact: They feel cold and solid. Unnervingly real.\n• If attacked or forcibly moved: They vanish — not dramatically, not with a flash. Just not there anymore, mid-step.\n• If players try to leave: The girl looks at you with something worse than pleading. 'You can't go. The fog won't let you.' And she's right — the fog closes in behind the party. The only clear path is the door.\n• If players enter without the children: The children remain in the street. If players look back, the children are always watching. If the party waves at them from inside, the children wave back.\n\nThe children will not answer questions about the cult, the Durst family secrets, or why they are afraid to go in. They know what children know. No more."),
            B('dm-note', "FIXNG VECNA HOOK — VECNA SEED (do this subtly, not overtly):\n\nAs the party approaches the gate, let one character — ideally whoever seems most perceptive or magically inclined — notice something on the back of the older girl's right hand: a faint pattern, like a birthmark or old ink. It looks like it could be an eye in the center of a palm. She keeps her hand turned inward, but it catches the light for just a moment.\n\nDO NOT point it out explicitly. Do not have an NPC comment on it. Let the player notice or not notice. This is a seed plant. It will matter later."),
            B('read-aloud', "The iron gate swings the rest of the way open on its own — a slow, rusty creak followed by silence. Through the portico, the oak doors wait. Behind you, the fog tightens."),
            B('description', "The portico is stone. Stone columns, an arched ceiling, oil lamps dark in their wall mounts. The gate has a lock but it is open. The oak doors are ajar. There is nothing stopping you from walking in except every instinct in your body."),
        ],
        choices: [
            { id: 'c-enter', text: 'Step Through the Gate and Enter', targetSceneId: 'dh-2', icon: 'door', consequence: `You push through the oak doors into the darkness of the foyer.` },
        ],
        sources: [
            { documentTitle: 'Curse of Strahd', sectionTitle: 'Rose and Thorn / Area 1. Entrance' },
            { documentTitle: 'Fixing Vecna', sectionTitle: 'Vecna Seed — Durst Family' }
        ],
        entities: [
            { id: 'ent-rose', name: 'Rose (Rosavalda Durst)', type: 'npc', description: `Appears as a girl of about 10. An illusion shaped from the memory of the real child. She is genuinely afraid, genuinely loving, and genuinely dead.` },
            { id: 'ent-thorn', name: 'Thorn (Thornboldt Durst)', type: 'npc', description: `Appears as a boy of about 7. Clutches a stuffed doll. Will not look directly at the house. Has not let go of his sister's hand since the party arrived.` }
        ],
        tags: ['story', 'roleplay'],
        dmNotes: `THIS IS THE HOOK SCENE. Play the children as genuine, not theatrical. Real children who are terrified do not perform their terror — they get small and quiet and try to hold onto someone bigger. The horror of this scene is NOT the children being scary. It is that they are not scary at all. They are just two kids who are going to ask you to walk into something awful. Give players the moment to ache.`,
        estimatedMinutes: 12,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 2 – THE MAIN HALL
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-2', chapterId: 'chap-deathhouse',
        title: 'The Main Hall', subtitle: 'Ground Floor, Area 2', order: 2,
        mapRoomId: 'gf-2', mapFloorId: 'floor-ground',
        narrationBlocks: [
            B('read-aloud', "The moment the last of you is inside, the oak doors slam. Not swing — slam. The sound of it reverberates through the house like a struck bell and dies not with an echo but with a horrible completeness, as if the house swallowed the sound. You listen for the village. For any sound from outside. There is nothing. The house has sealed."),
            B('read-aloud', "You are in a wide entry foyer. A sweeping red marble staircase curves upward to your left, its banister polished to a dark gleam that light doesn't quite bounce off the right way. A crystal chandelier hangs above you — unlit but present, hundreds of cut crystals catching your torchlight and throwing it into cold prisms across the floor. The floor itself is inlaid black marble with a family crest at the center: a windmill on a red field, ringed by carved wolves."),
            B('atmosphere', "The air inside is warmer than outside. Not warm the way a lit hearth makes a room warm. Warm the way a closed space full of old things gets warm — the warmth of preservation. Of things kept too long."),
            B('read-aloud', "The walls are dark wood paneling carved with scenes of nature — vines and flowers and nymphs in the lower panels, but let your light play across them for a moment longer and the details emerge: the vines are thorned. The flowers are not opening but closing. The nymphs have their mouths open in what might be song or might be screaming, and you cannot quite tell which because the light keeps moving."),
            B('skill-check', "DC 10 Perception (Passive check, no roll needed unless passive is under 10):\n\nSUCCESS: There is a faint sound from above. High and pure, almost like a music box — but with the phrasing of a lullaby. It comes in fragments, stopping and starting, as if interrupted by someone crying.\n\nFAILURE: The house is very quiet. Uncomfortably so."),
            B('skill-check', "DC 12 Investigation — If players examine the carved wall panels closely:\n\nSUCCESS: The serpents and skulls are there. Woven into the design so naturally that you almost miss them — a coiled serpent hidden at the base of a grapevine, a skull formed by the negative space between two overlapping flowers. Someone designed these very specifically."),
            B('skill-check', "DC 14 Investigation — If players examine the family crest on the floor:\n\nSUCCESS: The windmill on the crest is wrong. Standard heraldry shows the sails moving deosil — clockwise. The Durst windmill sails are turning the other way. Against the sun. Against the natural order. A character with religious training might note this as a deliberate inversion — a sign of something that worships in opposition to natural things."),
            B('dm-note', "MAIN HALL INTERACTABLES — Keep a note of these:\n\n• DOORS: The front doors are sealed by the house. Any attempt to force them physically: DC 22 Athletics to budge, and they close again the following round. Attacks: the wood bleeds black sap instead of breaking. Spells of 4th level and under do nothing visible. Tell players the house doesn't want them to leave. It's not dramatic — it's just true.\n\n• CHANDELIER: DC 12 Athletics to climb. Can be swung to reach the upper landing without the stairs. Can be dropped on the landing with a DC 15 Strength check — it falls for 4d8 bludgeoning + shattered crystal shards deal 1d4 to everything in 15 feet (DC 12 Dex save for half on the shards).\n\n• ARMOR STAND: A decorative suit of plate with a longsword. The longsword is real and functions normally. The plate is decorative and cannot be worn. The armor does NOT animate here — that happens on the third floor.\n\n• STAIRCASES: The red marble staircase goes up. A narrower service stair is partially visible at the hall's east end. A closed door is visible to the west (Den of Wolves). An archway to the south leads toward dining.\n\n• LULLABY: The sound from above is the Walter illusion. If players ask what it is — it sounds like a baby crying. Then it stops. Then it starts again. They cannot localize it precisely."),
            B('description', "Three options forward: a heavy door to the west, an archway to the south, and the staircase upward."),
        ],
        choices: [
            { id: 'c-gf3', text: 'Open the West Door — Den of Wolves', targetSceneId: 'dh-3', icon: 'door', consequence: `You pull the heavy western door open.` },
            { id: 'c-gf5', text: 'Pass Through the Archway — Dining Room', targetSceneId: 'dh-5', icon: 'path', consequence: `You walk south under the carved archway.` },
            { id: 'c-2f6', text: 'Ascend the Staircase', targetSceneId: 'dh-6', icon: 'stairs', consequence: `You begin climbing the red marble stairs.` },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 2. Main Hall' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: `Let the door slam moment land. Pause after it. Let the players feel trapped before you describe anything else. The house is beautiful in the way that some predators are beautiful — superficially appealing, deeply wrong. The key design tone for the first floor is: PRESERVED. Everything is too perfect, too clean, for a house that's supposedly been abandoned. Something has been maintaining this place. Do not explain that. Let it unsettle.`,
        estimatedMinutes: 8,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 3 – DEN OF WOLVES
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-3', chapterId: 'chap-deathhouse',
        title: 'Den of Wolves', subtitle: 'Ground Floor, Area 3', order: 3,
        mapRoomId: 'gf-3', mapFloorId: 'floor-ground',
        narrationBlocks: [
            B('read-aloud', "A hunter's den, or what was one. Dark oak walls, cold fireplace, mounted game. Three stuffed wolves are positioned around the room with a taxidermist's skill — crouched, alert, heads slightly lowered. Their glass eyes catch your light and hold it. They are looking at the fireplace. All three of them. Arranged around it as though in observation of something that once burned there."),
            B('read-aloud', "A heavy mahogany table between two armchairs has a cask of dark wine, two wooden goblets, a pipe rack with three pipes still loaded, and a candlestick burned down to a waxy stub. The wine in the cask is still liquid. The ashes in the closest pipe are still gray, not black with age. Someone was here recently enough that these things haven't dried."),
            B('atmosphere', "The room smells of old pipe tobacco, dried pine resin, and something beneath those things — faint, sweet, wrong. Like spoiled meat left in the cold."),
            B('skill-check', "DC 10 Perception — Looking at the wolves:\n\nSUCCESS: The wolves are all pointed at something specific — not toward the hearth generally, but toward the fireplace's left corner. A slight crumbling of mortar there. A seam."),
            B('skill-check', "DC 13 Investigation — Examining the fireplace ashes:\n\nSUCCESS: The ashes contain remnants of paper — partially burned sheets, dense with handwritten text. Most is illegible, but you can make out fragments: '...offerings made in the name of...' and '...the Eye that does not close...' and what appears to be '...our lord whose hand reaches from the grave...' \n\nNone of this refers to Strahd."),
            B('skill-check', "DC 13 Investigation — Examining the chess set on the table:\n\nSUCCESS: It is a fine ivory-and-obsidian set. The black pieces are carved normally. The white pieces are all missing their faces — smoothly blank where features should be. The white king piece is not blank: it is carved as a small hand with a single eye in its palm, lidless, staring up from the board.\n\nA character with Religious knowledge (DC 11 Religion, passive counts) recognizes this: the Hand with the Eye is associated with Vecna, the Lich-God, the Whispered One. It is an Underdark cult symbol rarely seen in the Sword Coast."),
            B('dm-note', "OPTIONAL ENCOUNTER — WOLVES (only run if players specifically attack or desecrate the wolves):\n\nThe three stuffed wolves are exactly what they appear — taxidermied, dead. But the house can animate them if players are destructive or attempting to use them as cover/weapons. Standard Wolf statblocks, but their attacks feel wrong — too coordinated for beasts, too purposeful.\n\nLoot from den cabinets:\n• East cabinet (locked, DC 15 Thieves' Tools): A heavy crossbow, a hand crossbow, a light crossbow, and 20 bolts for each.\n• North cabinet (unlocked): A small box of playing cards — ordinary — and eight crystal wine glasses. One glass has a faint inscription at the base: 'To the Knowing One's glory.'\n• Wine cask: Drinkable, dark, earthy. A character with Poisoner's Kit or Herbalism DC 12 can detect trace amounts of a sleep-inducing herb — not dangerous in this quantity, but present. Someone was drugging their guests."),
            B('dm-note', "VECNA HOOK — CHESS PIECE:\n\nMark in your notes: any character who handles the white king chess piece feels a faint, rhythmic warmth — like a pulse — under their fingertips. It lasts only a moment and cannot be reproduced by re-touching the piece. This is the first in-person Vecna resonance. Do not explain it. Do not have a character explain it. Just note that it happens and file it."),
            B('description', "The only exit is the door back to the main hall."),
        ],
        choices: [
            { id: 'c-return-gf2', text: 'Return to the Main Hall', targetSceneId: 'dh-2', icon: 'path', consequence: `You step back into the foyer.` },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 3. Den of Wolves' }, { documentTitle: 'Fixing Vecna', sectionTitle: 'Vecna Seeds — Death House' }],
        entities: [],
        tags: ['exploration', 'loot'],
        dmNotes: `This is a quiet room — no immediate combat, no trap. Its job is to be beautiful and wrong. The wolves, the drugged wine, the burned papers, the Vecna chess piece. Every single detail in this room points at a wealthy, comfortable family that was also something much, much worse. Let players take their time. This is a lore room.`,
        estimatedMinutes: 8,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 4 – KITCHEN & PANTRY
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-4', chapterId: 'chap-deathhouse',
        title: 'Kitchen and Pantry', subtitle: 'Ground Floor, Area 4', order: 4,
        mapRoomId: 'gf-4', mapFloorId: 'floor-ground',
        narrationBlocks: [
            B('read-aloud', "The kitchen is tidy, which is wrong. Pots hang clean on their hooks. The worktable has been scrubbed. Flour and dried herbs are stored in labeled glass jars behind the counter. An iron dome oven stands near the east wall, cold now but with no sign of the years of use you'd expect on a working oven — no grease, no carbon buildup, no blackened crust at the rim."),
            B('read-aloud', "A pantry door stands ajar to one side. Inside: bread that does not have mold on it. Potatoes that are not wrinkled. A string of dried sausages that smell the way sausages are supposed to smell. In a house that has supposedly been abandoned long enough for the children in the street to be centuries-dead, every piece of food in this kitchen is fresh."),
            B('atmosphere', "It smells of kitchen heat and baking bread. Warm, domestic, utterly false. Like a trap baited with comfort."),
            B('dm-note', "THE FOOD:\n\nAny character who eats the food — anything from the pantry, anything in the kitchen — let them swallow, let them start to describe how it tastes, and then tell them:\n\nThe taste changes mid-swallow. What was bread becomes something gray and cold. It tastes of wet grave dirt and old ash. Their body tries to reject it — a Retching Roll: DC 12 Constitution or the character is Incapacitated for 1 round from the reflex. The food provides no nourishment, no healing, no sustenance. But it doesn't damage them.\n\nNote to DM: This is the house being cruel in a petty way. It presents comfort and then robs it."),
            B('skill-check', "DC 13 Investigation — Examining the flour on the worktable:\n\nSUCCESS: There is a handprint in the flour. Child-sized. The print is fresh — the flour hasn't even settled back into it yet. It leads from the table toward the dumbwaiter in the southwest corner. The print has five fingers and is clean — no calluses, no roughness. This was a small child who is not currently visible."),
            B('dm-note', "THE DUMBWAITER:\n\nA 2-foot wooden box on a rope-and-pulley in the southwest corner. A button on the wall next to it rings a tiny bell in the servants' room above (Area 7). The shaft connects to Area 7 on the second floor and Area 12 (the master suite) on the third.\n\nA Small creature can squeeze into the box with a DC 10 Acrobatics check. The rope mechanism can support 200 lbs before breaking.\n\nIf a player uses it to travel: the journey up is slow, creaking, and in complete darkness. At any floor, pushing the box wall reveals the landing. If a player goes to the third floor (master suite), they emerge into an empty room and can catch a DC 13 Investigation check to see the journal mentioning the nursemaid's name."),
            B('description', "A swinging door on the north wall leads to the dining room."),
        ],
        choices: [
            { id: 'c-gf5', text: 'Enter the Dining Room', targetSceneId: 'dh-5', icon: 'door', consequence: `You push through the swinging door northward.` },
            { id: 'c-return-gf2', text: 'Return to Main Hall', targetSceneId: 'dh-2', icon: 'path', consequence: `You head back through the hall.` },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 4. Kitchen and Pantry' }],
        entities: [],
        tags: ['exploration', 'trap'],
        dmNotes: `The food trick is the right kind of horrible — it is not dangerous, it is just deeply unpleasant and disorienting. Feed it to the character who seems most likely to eat something ("I check if the food is fresh" → "Yes, it appears fresh" → watches them eat it). The child handprint in the flour is meant to create unease — where is that child now? Answer: the ghost children left it when they passed through the kitchen intangibly. Players don't need to know that.`,
        estimatedMinutes: 7,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 5 – DINING ROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-5', chapterId: 'chap-deathhouse',
        title: 'Dining Room', subtitle: 'Ground Floor, Area 5', order: 5,
        mapRoomId: 'gf-5', mapFloorId: 'floor-ground',
        narrationBlocks: [
            B('read-aloud', "A dining room for a family that wanted to appear more than it was. The mahogany table seats eight — its surface polished to a dark mirror — and the eight settings that remain are perfect: crystal glasses, silver-plate cutlery, porcelain dishes with a windmill pattern at their rims. Everything is set as if for a dinner party that is two minutes from beginning. And everything is wrong."),
            B('read-aloud', "The crystal glasses have the faintest ring of old dried liquid at their bases. The silver has tarnished at its edges into brown. The porcelain dishes have infinitely fine hairline cracks following the windmill pattern like fault lines in something that was shaken very hard once and never properly healed. A crystal chandelier hangs above, unlit, the crystals giving back no light at all — absorbing it instead, somehow."),
            B('atmosphere', "The smell here is harder to place. Beneath the furniture polish and dust, something older. A smell you would not expect in a dining room. Rust, and copper, and something organic that has been here long enough to stop actively smelling and just become part of the room."),
            B('skill-check', "DC 15 Perception — Examining the silverware closely:\n\nSUCCESS: The tarnish pattern on each piece of silverware is wrong. Tarnish spreads from handling, from use, from fingerprints and oils. But the tarnish on these pieces forms faces. Small, smeared, agonized faces — the same face repeated, or many different ones, you can't tell. When you look away and look back they may have moved slightly. May have."),
            B('skill-check', "DC 12 Investigation — Examining the tapestry:\n\nSUCCESS: The tapestry shows a hunting scene — riders in formal dress, hounds, a wolf being driven toward a cliff. The riders are distinctly portrayed: a wide man (Gustav?), a narrow woman (Elisabeth?), two smaller figures (Rose and Thorn?), and — partially obscured by the tapestry's fold — a fifth rider you can't see clearly. In the woven pond at the tapestry's bottom corner, none of the riders cast reflections.\n\nDC 14: The wolf they are hunting has been cornered not by the hunters but by the hounds. The hunters are watching. They are not ending the hunt. They are... feeding something."),
            B('skill-check', "DC 13 Investigation — The sideboard cabinet:\n\nSUCCESS: Behind the cracked plates and cloudy glasses: a carving knife, real and functional (treat as a Dagger). Also: a stack of ivory calling cards with the Durst family crest. These are for leaving at houses during formal visits. On the bottom of the stack, someone has written across several cards in different handwriting: 'He Sees All.' 'Vecna Waits.' 'His Eye, Our Offering.' None of the handwriting matches."),
            B('dm-note', "ATMOSPHERE DELIVERY NOTES:\n\nThis room is the upper class nightmare version of the horror. It looks expensive. It looks formal. It looks like a family that had money, manners, and a good tailor. And underneath all of that is something deeply wrong that the trappings of wealth couldn't paper over.\n\nIf players are quiet in here: let them feel the silence. If they're talking: let them. Then, clearly and without warning or drama, just describe: 'One of the crystal glasses shifts exactly a quarter-inch across its plate without sound and stops. Nothing else moves.'"),
            B('description', "The swinging door to the kitchen is south. The archway back to the main hall is north."),
        ],
        choices: [
            { id: 'c-gf2', text: 'Return to Main Hall', targetSceneId: 'dh-2', icon: 'path', consequence: `You step back under the carved archway.` },
            { id: 'c-gf4', text: 'Enter the Kitchen', targetSceneId: 'dh-4', icon: 'door', consequence: `You push through the swinging door.` }
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 5. Dining Room' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: `USE THE CALLING CARDS. If players find them and read "His Eye, Our Offering" and "Vecna Waits" — do not confirm or explain. Just let it sit in the room with them. This is one of the clearest signs the Dursts were Vecna cultists, not Strahd cultists, but resist the urge to underline it. The calling cards are a perfect, quiet horror detail. The ghost glass moving — use that if the scene needs a jolt. Deliver it flat, no buildup.`,
        estimatedMinutes: 8,
    },
];
