import { NarrativeScene } from '../../types/campaignNavigator';
import { B } from './builder';

export const atticScenes: NarrativeScene[] = [
    // ══════════════════════════════════════════════════════════════════════
    // AREA 16 – ATTIC HALL
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-16', chapterId: 'chap-deathhouse',
        title: 'Attic Hall', subtitle: 'Attic, Area 16', order: 16,
        mapRoomId: 'at-16', mapFloorId: 'floor-attic',
        narrationBlocks: [
            B('read-aloud', "The attic is a different house entirely. No carpets. No carved panels. No pretense. Bare plank floors, bare timber walls, cobwebs in every corner, the raw smell of old wood and dust and something biological that has been sealed here long enough to stop having a distinct smell and just become part of the air. The ceiling slopes sharply to the roofline overhead, making the hall feel like a throat."),
            B('atmosphere', "The temperature has equalized. The attic is not cold the way the nursemaid's suite was cold. It is simply still. The kind of still that descends on a room that has not been entered in a very long time, where even the dust does not move without encouragement."),
            B('read-aloud', "A heavy padlocked door stands at the far end of the hall. The padlock is iron, thick, relatively new compared to the rest of the house — placed here deliberately, recently, by whoever cared about keeping something behind it secured. On either side of it, two other doors lead into storage on the left and a spare room on the right."),
            B('skill-check', "DC 11 Perception — Looking at the padlocked door:\n\nSUCCESS: The door has scratch marks on the inside face — visible at the bottom gap between door and floor. Something wanted out from inside. The scratches are at floor level, the height a small child might make. They are old."),
            B('dm-note', "ATTIC HALL CONNECTIONS:\n• Left door → Spare Bedroom (Area 17)\n• Right door → Storage Room (Area 18)\n• Padlocked door → Children's Room (Area 20) [Iron Key from Library, Area 8]\n• Back through the nursemaid's stairs → Third Floor (Area 15)"),
            B('dm-note', "PADLOCK:\n\n• Iron Key from the Library desk (Area 8): opens it automatically.\n• DC 16 Thieves' Tools to pick: the lock is good quality.\n• DC 20 Athletics to force the bar: possible but loud — the house will respond by dropping the temperature 10 degrees and having the shadows in every room deepen.\n• The padlock was placed here by Gustav Durst to keep the children in."),
        ],
        choices: [
            { id: 'c-at17', text: 'Eastern Spare Bedroom', targetSceneId: 'dh-17', icon: 'door', consequence: 'You enter the spare bedroom.' },
            { id: 'c-at18', text: 'Western Storage Room', targetSceneId: 'dh-18', icon: 'door', consequence: 'You enter the storage room.' },
            { id: 'c-at20', text: 'Unlock the Padlocked Door', targetSceneId: 'dh-20', icon: 'door', consequence: 'You use the iron key on the padlock. It opens.' },
            { id: 'c-tf15', text: 'Go Back Down (Nursemaid Stairs)', targetSceneId: 'dh-15', icon: 'stairs', consequence: 'You take the narrow stairs back down to the third floor.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 16. Attic Hall' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'Attic pacing note: the horror here is simpler and more personal than the ornate dread of the lower floors. The attic is where the house stops performing elegance. It is just bare wood and cold and what was done to children. Keep descriptions spare — the lack of ornamentation is itself the horror.',
        estimatedMinutes: 5,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 17 – SPARE BEDROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-17', chapterId: 'chap-deathhouse',
        title: 'Spare Bedroom', subtitle: 'Attic, Area 17', order: 17,
        mapRoomId: 'at-17', mapFloorId: 'floor-attic',
        narrationBlocks: [
            B('read-aloud', "A spare room. A cot with a straw mattress. A washstand. A small oval window looking out over the village street, its glass wavy with age, the misty village below barely visible. On the windowsill sits a porcelain doll — perfectly upright, hands folded in its lap, face forward. Its painted smile is wrong in the way that painted smiles on dolls are always slightly wrong: too wide, too fixed, showing too many teeth for the size of the face."),
            B('atmosphere', "The doll has been here long enough that the windowsill has grown slightly darker under it. It has been placed here deliberately and left. No child played with this doll. It was positioned."),
            B('skill-check', "DC 12 Investigation — Examining the doll:\n\nSUCCESS: The doll's dress has a small stylized eye embroidered at the collar hem — a very old symbol for warding against the evil eye. But the eye is inverted in the embroidery. An inverted ward doesn't protect — it invites. Someone embroidered this protection wrong on purpose.\n\nThe doll's head can be removed: inside, packed in wool, is a small brass locket. The locket contains a tiny painted portrait of a woman on one side and a tiny painted portrait of an infant on the other. The woman is not Elisabeth Durst. The infant looks like any infant. On the back of the locket: 'For when he comes into his power.'"),
            B('dm-note', "The doll is not magical. The locket is not cursed. The room contains no encounter. This is pure atmosphere and lore seeding.\n\nThe 'he' in the locket inscription refers to Walter. The woman is the nursemaid. She made this locket herself and placed it in the doll — a small act of genuine love in a house that was never oriented toward love. This detail makes the nursemaid's specter hit differently if players got here after that encounter."),
        ],
        choices: [
            { id: 'c-at16', text: 'Return to Attic Hall', targetSceneId: 'dh-16', icon: 'path', consequence: 'You step back into the hall.' },
            { id: 'c-at19', text: 'Enter the Empty Bedroom Beyond', targetSceneId: 'dh-19', icon: 'door', consequence: 'You find a connecting door.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 17. Spare Bedroom' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'Three minutes, maximum. The doll and the locket do their work quickly. Do not linger here.',
        estimatedMinutes: 4,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 19 – EMPTY BEDROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-19', chapterId: 'chap-deathhouse',
        title: 'Empty Bedroom', subtitle: 'Attic, Area 19', order: 19,
        mapRoomId: 'at-19', mapFloorId: 'floor-attic',
        narrationBlocks: [
            B('read-aloud', "A room with nothing in it. No bed, no furniture, no stored materials. Floor to wall to sloped ceiling. Bare, unfinished, empty. You search it because that is what people do when they enter rooms in haunted houses. There is nothing to find."),
            B('atmosphere', "The absence feels intentional. As if whatever was in this room was removed to make a point, or taken away as punishment, or never placed here because this room was always meant to be punishment itself."),
            B('skill-check', "DC 13 Arcana — Detecting magic in the empty room:\n\nSUCCESS: There is a very faint residue. Not active magic — the memory of magic, the kind that lingers in a space where a ritual has been performed repeatedly over a long period of time. Not a necromantic residue. Something older and harder to classify. The resonance is structured — call-and-response patterns, like a prayer given back as an echo.\n\nThis room was used for devotional practice. Vecna is called through repetition, not ceremony. This was where the cultist who died in the secret room below came to pray."),
        ],
        choices: [
            { id: 'c-at17', text: 'Return to Spare Bedroom', targetSceneId: 'dh-17', icon: 'path', consequence: 'You step back through the connecting door.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 19. Empty Bedroom' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'The power of this room is that it has nothing in it. Do not add things to it. Describe the nothing. Then the one perception that something WAS here. Then move on.',
        estimatedMinutes: 2,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 18 – ATTIC STORAGE
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-18', chapterId: 'chap-deathhouse',
        title: 'Attic Storage Room', subtitle: 'Attic, Area 18', order: 18,
        mapRoomId: 'at-18', mapFloorId: 'floor-attic',
        narrationBlocks: [
            B('read-aloud', "A storage room. Broken furniture in pieces against the walls — a chair with two legs, a bedside table with a shattered top, a mirror frame with no glass. Old paintings stacked with their faces to the wall. An iron-bound trunk occupies the center of the space, heavy enough that it has left impression marks in the floor around it where it has settled over years."),
            B('skill-check', "DC 12 Investigation — Turning the paintings to face outward:\n\nSUCCESS: Every painting is of the same subject — the Death House itself, rendered from slightly different angles and at slightly different times. The paintings span at least three decades based on stylistic variation and the aging of the house: the first shows it new-built and pristine, each subsequent one shows more decay. The last painting, the most recent, shows the house as it appears now — but with light in every window and the silhouettes of figures inside each frame. None of those figures are human in proportion."),
            B('skill-check', "DC 12 Investigation or DC 14 Perception — Examining the trunk:\n\nSUCCESS: The trunk lid is unlatched. Inside, coiled carefully on top of old linens: a human skeleton. An adult, female, based on bone structure. Arranged with care — not discarded, not posed dramatically, simply placed as if someone took the time to fold the bones together neatly. A nursemaid's uniform, mended and clean, is draped over the remains like a shroud.\n\nThis is the nursemaid. This is what was done with her body after she died."),
            B('dm-note', "THE NURSEMAID'S BONES:\n\nIf players have already fought the Nursemaid's Specter (Area 15), this is the gut-punch ending of that story. Say: 'You recognize the uniform. It is exactly the dress the specter was wearing.'\n\nThis is the full context: The nursemaid died in this house, unacknowledged. The cultists who killed her folded her remains neatly into a trunk where she would not be found. Her ghost awoke and defended the nursery, not understanding that Walter was already dead. She has been there ever since.\n\nIf players find this BEFORE they encounter the specter: they know the specter's story before they meet her. It changes the encounter — give players who speak to the specter about her bones a DC 12 Persuasion option to delay her attack for one round while she processes what they are saying."),
            B('dm-note', "SECRET DOOR:\n\nDC 13 Investigation (or DC 10 if the character mentions looking at the wall beside the trunk): A wooden panel in the north wall is hinged. Behind it: a narrow spiral staircase descending 50 feet into darkness. This is the main attic path to the dungeon level (Area 21)."),
        ],
        choices: [
            { id: 'c-at16', text: 'Return to Attic Hall', targetSceneId: 'dh-16', icon: 'path', consequence: 'You step back into the hall.' },
            { id: 'c-at21', text: 'Descend the Hidden Spiral Stairs', targetSceneId: 'dh-21', icon: 'stairs', consequence: 'You find the panel and open it, revealing stairs into darkness.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 18. Storage Room' }],
        entities: [],
        tags: ['exploration', 'story'],
        dmNotes: 'The paintings and the nursemaid\'s remains are two of the best quiet horror moments in the attic. Do not rush either. The nursemaid reveal — especially if they\'ve already fought her specter — is one of the most emotionally effective beats in the module. It asks players to feel something for the ghost they just destroyed.',
        estimatedMinutes: 10,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 20 – CHILDREN'S ROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-20', chapterId: 'chap-deathhouse',
        title: "Children's Room", subtitle: 'Attic, Area 20', order: 20,
        mapRoomId: 'at-20', mapFloorId: 'floor-attic',
        narrationBlocks: [
            B('read-aloud', "The padlock opens without resistance. The door swings inward. And you see:\n\nTwo small skeletons lying in the center of the floor, side by side, their hands touching. Not posed — they fell here, or were laid here. Around them, the room that was built for them: two small beds with wooden headboards painted with rabbits and flowers, a toy chest with a broken hinge, a bookshelf with illustrated children's books, a dollhouse on a table in the corner."),
            B('read-aloud', "The dollhouse is a perfect scale replica of the house you are standing in. Every room is present. Every detail is correct — the red marble staircase, the chandeliers, the wolf armor, the family portrait. When you look through the tiny windows of the dollhouse attic: there is a tiny replica of this room. And in that room, two tiny figures."),
            B('atmosphere', "The room is cold. Not unnaturally cold — just the cold of a space that has not been heated since the children died. The drafts from the roofline move here. The house here is not sealed."),
            B('skill-check', "DC 11 Investigation — Examining the dollhouse:\n\nSUCCESS: The figures in the dollhouse's attic room are not carved wooden dolls like the rest. They are made from cloth and stuffed. Someone took the time to make them look like specific children — the older one with dark hair, the younger one with lighter hair, smaller. The miniature dollhouse within the dollhouse also contains miniature figures. The recursion does not end at three levels — the fourth is too small to make out. But it continues.\n\nAlso: In the dollhouse dungeon level, one tiny room contains a miniature altar. On the altar: a tiny metallic sphere, smaller than a pin head, that catches light in a way that is not possible for an object that size."),
            B('skill-check', "DC 12 Investigation — Searching the room:\n\nSUCCESS: Under the toy chest: a small iron box, unrusted, warm to the touch. Inside the iron box: two small pouches of bone and ash — the remains of Rose and Thornboldt, removed from wherever they died and stored here. Also: a child's drawing on folded paper. Two stick figures holding hands under what might be a sun, or an eye. Signed, in large unsteady letters: 'ROSE AND THORN WE ARE HERE.'"),
            B('read-aloud', "The ghost children appear. Not dramatically — they are simply there, at the room's threshold, looking at the skeletons on the floor. Rose has her hand pressed over her mouth. Thorn presses against her side, eyes down."),
            B('dialog', "Is that us?", { speaker: 'Thorn', emotion: 'Very small voice. He already knows the answer.' }),
            B('dialog', "Yes. Those are our bones. We... have been here a very long time, I think.", { speaker: 'Rose', emotion: 'Trying to be gentle for Thorn. Not quite managing it.' }),
            B('dm-note', "GHOST CHILDREN SCENE:\n\nRose and Thorn want to be at rest. They cannot achieve it themselves — the house trapped them here. But if the party:\n\n1. Takes their remains and buries them in the Family Crypts (Area 23) in the dungeon\n2. Treats the burial with dignity rather than treating it as a puzzle to solve\n\n...the children achieve peace. Their ghost forms fade with a simple, direct 'thank you' to whoever carried them. No drama. No fanfare. Just: gone.\n\nREWARDS:\n• Inspiration to every character present at the burial\n• Rose's ghost will briefly appear in the dungeon stairwell as the party passes and point in the direction of the safer path through the dungeon — a single, silent gesture, then gone\n• The house becomes 5 degrees warmer in all rooms immediately after the burial, as if exhaling\n\nIf the party IGNORES the children or refuses: no combat, no penalty. But Rose and Thorn will appear one more time — at the ritual chamber door — and watch the party go in. They do not say anything. That might be worse."),
            B('dm-note', "DOLLHOUSE META PUZZLE:\n\nThe dollhouse mirrors the house in real time: if the party moves a piece of furniture in the actual house, the dollhouse updates. If they look into the dungeon rooms of the dollhouse, they can see a crude preview of what those rooms contain (DM's discretion on detail level — the dollhouse shows major features like altars and statues but not specific creature positions).\n\nThis is optional complexity for players who engage with it. Do not force the puzzle. Let it reward curious players."),
        ],
        choices: [
            { id: 'c-at16', text: 'Return to Attic Hall', targetSceneId: 'dh-16', icon: 'path', consequence: 'You carry whatever you have decided to carry and leave the children\'s room.' },
            { id: 'c-at21', text: 'Descend Via Hidden Stairs (through Storage Room)', targetSceneId: 'dh-21', icon: 'stairs', consequence: 'You take the spiral stairs toward the dungeon.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: "Area 20. Children's Room" }],
        entities: [
            { id: 'ent-rose', name: 'Rose (Ghost)', type: 'npc', description: 'The ghost of Rosavalda Durst. Appears near the children\'s room. Wants to rest but cannot alone.' },
            { id: 'ent-thorn', name: 'Thorn (Ghost)', type: 'npc', description: 'The ghost of Thornboldt Durst. Stays close to his sister. Cried when he asked if the skeletons were them.' }
        ],
        tags: ['story', 'roleplay'],
        dmNotes: 'The strongest emotional scene in the entire module. Two children\'s skeletons on the floor. Their ghost asking "Is that us?" Your table should be quiet for this. Encourage players to react in character. The dollhouse reveal — a tiny altar with a tiny metallic sphere — is the final Vecna seed of the upper house, paying off when the party finds the Eldritch Eye on Delvin\'s body below.',
        estimatedMinutes: 20,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 21 – SECRET SPIRAL STAIRS
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-21', chapterId: 'chap-deathhouse',
        title: 'Secret Spiral Staircase', subtitle: 'Attic to Dungeon, Area 21', order: 21,
        mapRoomId: 'at-21', mapFloorId: 'floor-attic',
        narrationBlocks: [
            B('read-aloud', "The spiral staircase is stone — narrow, without a handrail, the steps worn smooth from use. Moisture runs down the walls in thin rivulets. The smell changes with every few steps of descent: first the attic's dry dust, then something woodsy and organic, then something older. Older than wood. Mud and limestone and something underneath that, something that does not have a good name."),
            B('read-aloud', "The staircase takes fifty feet of descent to deliver you to the bottom. Fifty feet. The house is three stories. The dungeon is beneath the house. The math does not add up in any normal way. You have gone farther down than the building above you goes up."),
            B('atmosphere', "The descent feels longer than its length. Each footstep is louder than it should be. Your light seems to advance more slowly than you do. The chanting, faint before, is thicker here — below you, resonant through the stone walls, the same phrase repeated in a language that sounds old and deliberately private."),
            B('dm-note', "DARKNESS NOTE:\n\nThe dungeon is completely dark. Characters without darkvision or a light source are Blinded on the dungeon level. Describe the first step off the stairs onto dirt floor carefully — the texture change from stone to mud under their boots, the ceiling close and irregular above them, the smell.\n\nThe chanting: 'He is the ancient. He is the land. He is the eye that does not close.' It does not repeat identically — each cycle varies slightly, suggesting either many voices or one voice that has been going long enough to lose coherence."),
            B('description', "The stairs empty onto a narrow dirt corridor braced with rotting timber. The dungeon stretches ahead: low ceilings, packed earth, the smell of deep underground. The chanting is everywhere."),
        ],
        choices: [
            { id: 'c-dg22', text: 'Step into the Dungeon', targetSceneId: 'dh-22', icon: 'path', consequence: 'Your boots hit damp earth. The dungeon begins.' },
            { id: 'c-at18', text: 'Climb Back Up', targetSceneId: 'dh-18', icon: 'stairs', consequence: 'You retreat back to the attic storage room.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 21. Spiral Staircase' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'The geometry note — going farther down than the building is tall — is the pivot moment where players feel the domain at work. The house exists in a place that does not follow normal architectural physics. Deliver this matter-of-factly: "The math does not add up." Then move on. The mystery is more effective than an explanation.',
        estimatedMinutes: 5,
    },
];
