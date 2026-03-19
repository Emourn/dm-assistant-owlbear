import { NarrativeScene } from '../../types/campaignNavigator';
import { B } from './builder';

export const thirdFloorScenes: NarrativeScene[] = [
    // ══════════════════════════════════════════════════════════════════════
    // AREA 11 – BALCONY
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-11', chapterId: 'chap-deathhouse',
        title: 'Balcony', subtitle: 'Third Floor, Area 11', order: 11,
        mapRoomId: 'tf-11', mapFloorId: 'floor-third',
        narrationBlocks: [
            B('read-aloud', "The third floor balcony rings the stairwell, open on one side to a twenty-foot drop to the main hall below. The railing is carved mahogany, still solid. The smell here is different from the floors below: dust and dried lavender and beneath those, a sharp sting of old iron that you feel more in your sinuses than you smell."),
            B('read-aloud', "A suit of plate armor stands against the wall at the far end of the balcony — not decorative like the second-floor suits. This one is braced in a fighting stance, halberd gripped in both its gauntleted hands at the ready, the blade angled directly toward the stairwell opening. Its wolf-face helm is different from the others: the jaw is lowered rather than fixed, giving the impression of something panting."),
            B('atmosphere', "A baby's cry drifts across the balcony from no specific direction, rising and falling, cutting off abruptly, and then starting again after several seconds. You cannot triangulate it. It does not grow louder when you move toward any door; it does not fade when you move away."),
            B('dm-note', "TRIGGER FOR THE ARMOR:\n\nThe Animated Armor activates the moment any character either:\n• Moves toward the Master Suite door (west side of balcony)\n• Moves toward the Storage Room/Nursemaid wing (east side)\n• Lingers at the balcony edge for more than 6 seconds of in-game time\n• Touches the railing while looking down\n\nThe armor does not speak. It does not warn. It simply begins walking, halberd level, with mechanical precision. Run it as Animated Armor (MM p.19): AC 18, HP 33, immune to poison/psychic, vulnerable to thunder damage."),
            B('encounter-ref', "The wolf-face helm turns. The gauntlets tighten on the halberd. It moves.", { encounterDetails: '1x Animated Armor (HP 33, AC 18, immune to poison and psychic, vulnerable to thunder)' }),
            B('read-aloud', "When the armor finally stops — when the last piece of it clatters to the floor — black sap wells from the seams and crawls along the boards, pooling around the broken plates. Inside the chest cavity, where a heart would be: a crystallized rose, black and perfectly preserved, still warm to the touch."),
            B('dm-note', "POST-COMBAT NOTES:\n\nThe crystallized rose can be taken. It is warm, always, regardless of ambient temperature. No game mechanic — just lore. It belonged to Elisabeth Durst. It is the house's memory of her.\n\n• Balcony edge: A player who is pushed to the edge or falls over takes 2d6 bludgeoning (20-foot fall onto marble).\n• Halberd (pre-combat): If a player attempts to disarm the armor before it activates: DC 16 Sleight of Hand or the attempt triggers combat.\n• Armor remnants: A longsword can sometimes be looted from the Animated Armor if it hasn't already been taken from the first floor."),
            B('description', "With the armor destroyed, the balcony is open. Doors lead west to the master suite, east to the storage room. The staircase continues down to the second floor."),
        ],
        choices: [
            { id: 'c-tf12', text: 'Enter Master Suite (West)', targetSceneId: 'dh-12', icon: 'door', consequence: 'You approach the double doors of the master suite.' },
            { id: 'c-tf14', text: 'Enter Storage Room (East)', targetSceneId: 'dh-14', icon: 'door', consequence: 'You open the east-side door.' },
            { id: 'c-sf6', text: 'Go Downstairs', targetSceneId: 'dh-6', icon: 'stairs', consequence: 'You descend to the second floor.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 11. Balcony' }],
        encounter: { monsters: [{ name: 'Animated Armor', count: 1 }] },
        entities: [],
        tags: ['exploration', 'combat'],
        dmNotes: 'THIS IS THE FIRST REAL FIGHT. At level 1-2, an Animated Armor is dangerous because of its high AC — most low-level characters cannot hit it reliably. Use this to your advantage: let the first round sting. Consider having the baby crying grow louder and more distressed during the fight — the house uses it as accompaniment. The crystallized rose is a small, human, unexpected detail that lands better than it has any right to.',
        estimatedMinutes: 25,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 12 – MASTER SUITE
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-12', chapterId: 'chap-deathhouse',
        title: 'Master Suite', subtitle: 'Third Floor, Area 12', order: 12,
        mapRoomId: 'tf-12', mapFloorId: 'floor-third',
        narrationBlocks: [
            B('read-aloud', "The master bedroom is a ruin. A four-poster bed in the center of the room has its canopy shredded — not by age, not by rot. By something sharp and deliberate, the cuts running in long parallel lines as if someone needed to destroy something and had only their nails. The frame is intact. The mattress has a dark stain centered where a person sleeping would be. Not old brown. Deep, oxidized red-brown."),
            B('read-aloud', "A tall mirror occupies the east wall, framed in tarnished gilt. A wardrobe stands open on the south side, its fine clothes hanging in strips — slashed like the canopy, with the same violence, the same parallel marks. A vanity table between the wardrobe and the mirror holds combs, perfume vials, and a small locked jewelry box. The perfume vials are open. Whatever was in them has long since evaporated, but the vanity smells of something floral and oversweet, a ghost of a smell."),
            B('atmosphere', "The room feels bruised. Like the air still carries the memory of a terrible argument — not just the sound of it but the emotional weight, the kind that lingers in rooms after people stop fighting but before anyone apologizes. No one ever apologized in this room."),
            B('skill-check', "DC 14 Perception — Approaching the mirror:\n\nSUCCESS: Your reflection looks like you, but wrong. The reflection is slightly older, slightly drawn — the face hollowed, the eyes too much dark around them. The reflection's mouth moves without you moving yours. If you watch it long enough and make a DC 12 Wisdom save, you can almost parse the words. They are: 'It is cold. We are cold. Rot with us.'\n\nA character who fails the Wisdom save (DC 12): gains the Frightened condition for 1 minute; they cannot look at the mirror and must stay more than 10 feet from it. No damage. Just dread."),
            B('skill-check', "DC 14 Investigation (or DC 10 if they searched the library already and had context):\n\nSUCCESS: The jewelry box lock requires DC 15 Thieves' Tools or DC 18 Strength to force.\n\nWhen they examine the wardrobe — DC 12 Investigation: In the far corner of the wardrobe bottom, behind the hanging cloth strips: a small book, hardcover, navy blue. A woman's private journal. It is Gustav's wife Elisabeth's. Three entries are legible:\n\n1. 'G. found the new texts. Three volumes and a fragment. The fragment is different — older than anything else he has found. He won't let me see it yet. He says it requires preparation.'\n\n2. 'The ritual takes the blood of someone willing. G. says the offering must be clean. I said I would volunteer. He looked at me the way he looks at the servants. He said that would be unnecessary.'\n\n3. 'Walter is born. G. has decided what Walter is for. I do not object. I should. I have nothing left to object with.'"),
            B('loot-ref', "The locked jewelry box: a silver necklace with a moonstone pendant (30 gp), a gold enameled brooch in the shape of a butterfly (15 gp), and a signet ring — the inside of the band engraved with a hand and eye.", { lootDetails: 'Silver Moonstone Necklace (30 gp) • Butterfly Brooch (15 gp) • Signet Ring (Vecna cult signet)' }),
            B('dm-note', "THE JOURNAL — DELIVERY NOTES:\n\nDo not read the journal entries aloud verbatim. Summarize them in your own words and let players ask for specifics. The emotional content is more important than the exact wording.\n\nKey lore the journal reveals:\n• The Dursts are Vecna cultists, not Strahd cultists\n• Gustav found a 'fragment' of a text — likely a piece of Vecna's instructions or a creation manual for the Eldritch Eye\n• Walter was deliberately intended to be a sacrifice or a vessel from before birth\n• Elisabeth knew. She chose not to object. This makes her worse than a victim."),
            B('description', "A door on the south wall leads to the master bathroom."),
        ],
        choices: [
            { id: 'c-tf13', text: 'Enter Bathroom (South)', targetSceneId: 'dh-13', icon: 'door', consequence: 'You push the bathroom door open.' },
            { id: 'c-tf11', text: 'Return to Balcony', targetSceneId: 'dh-11', icon: 'path', consequence: 'You step back out.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 12. Master Suite' }],
        entities: [],
        tags: ['exploration', 'loot', 'story'],
        dmNotes: 'This room tells the full Durst family horror in three journal entries and one mirror. The violence in the room (the shredded canopy, the slashes in the wardrobe) was done by Elisabeth and is not explained anywhere. Players should be left to figure out whether it was despair, rage, or something the ritual required. Leave it ambiguous. The mirror is the best pure horror beat on this floor — use it gently.',
        estimatedMinutes: 10,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 13 – BATHROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-13', chapterId: 'chap-deathhouse',
        title: 'Bathroom', subtitle: 'Third Floor, Area 13', order: 13,
        mapRoomId: 'tf-13', mapFloorId: 'floor-third',
        narrationBlocks: [
            B('read-aloud', "A bathroom with cold marble tile and a claw-footed copper tub dominating the center. The tub is stained a deep brown along its inner basin — not from water but from something that sat in it and oxidized over years. A rusted copper kettle rests beside the tub on a wooden stool. The mirror above the washbasin has been covered with a single sheet of black cloth, knotted at the top. Someone did not want to see their reflection."),
            B('atmosphere', "The smell of copper is immediate and specific. There is no water in the tub. There is no water anywhere in the room. Whatever stained the basin evaporated long ago, leaving only the ghost of a smell that the copper amplified and kept."),
            B('dm-note', "IF A CHARACTER LOOKS INTO THE TUB:\n\nTell them they see the basin is dry and stained and at the very bottom, barely visible under the discoloration, something has been scratched into the copper with something sharp: '17 words.' Nothing else. Seventeen words were scratched here and then erased, leaving only the count.\n\nThis is Elisabeth's work. The seventeen words she scratched were, at some point, removed by the house. If a player makes a DC 18 Arcana check on the scratch marks, they can feel residual emotion — cold, absolute terror, not rage and not grief. Something beyond those. The house ate the words."),
            B('skill-check', "DC 12 Investigation — Removing the black cloth from the mirror:\n\nIf they take the cloth off: the mirror shows the room normally, except that behind the character looking into it, seated in the tub, there is a woman. Gaunt, dark-haired, in a ruined gown, submerged to the chest in water that is not there. Her eyes are closed. When a character blinks: she is gone. The tub is empty.\n\nNo attack. No damage. No save required. Just the image, present for one moment, and then not."),
        ],
        choices: [
            { id: 'c-tf12', text: 'Return to Master Suite', targetSceneId: 'dh-12', icon: 'path', consequence: 'You step out of the bathroom.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 13. Bathroom' }],
        entities: [],
        tags: ['exploration'],
        dmNotes: 'This room exists for two things: atmosphere and the "17 words" mystery that never resolves. Horror fiction is full of things that almost make sense and then don\'t quite. The mystery of what those seventeen words were is more disturbing than anything you could write in them. Keep it under three minutes. It is a punctuation mark, not a chapter.',
        estimatedMinutes: 4,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 14 – STORAGE ROOM
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-14', chapterId: 'chap-deathhouse',
        title: 'Storage Room', subtitle: 'Third Floor, Area 14', order: 14,
        mapRoomId: 'tf-14', mapFloorId: 'floor-third',
        narrationBlocks: [
            B('read-aloud', "A cramped room packed with household stores: folded sheets, spare wool blankets, bars of lye soap stacked by size, extra candles in bundles. A shelf holds labeled bottles of cleaning solution and polishing blends. Everything is meticulous. Someone cared about the order of small domestic things in this house even while larger, terrible things happened below."),
            B('read-aloud', "A heavy-bristled broom leans in the corner beside the door. The bristles are clean. The handle is smooth with use. As you cross the threshold, the broom falls away from the wall, catches itself — there is no catch, there is nothing — and comes straight at the nearest face."),
            B('dm-note', "TRIGGER: The broom animates the moment a character steps fully inside the room — even one step past the threshold counts. There is no Perception check, no warning. It simply moves. Run as Broom of Animated Attack: AC 15, HP 17, speed 30, immune to poison and psychic.\n\nPOST-COMBAT: The broom does not die with a visual. It simply stops moving, mid-air, and drops. The bristles splinter on impact. A character who inspects the remnants finds, embedded in the spine of the broom handle, a thin strip of parchment covered in infernal script too small to read without Thieves' Tools or magnification; DC 15 Arcana confirms it is a command word binding — the broom has been enchanted to obey whoever wrote this, and the command was written in Infernal."),
            B('encounter-ref', "The broom launches from the corner at eyebrow level.", { encounterDetails: '1x Broom of Animated Attack (HP 17, AC 15, immune to poison and psychic)' }),
            B('description', "A small door on the south side leads to the Nursemaid's Suite."),
        ],
        choices: [
            { id: 'c-tf11', text: 'Return to Balcony', targetSceneId: 'dh-11', icon: 'path', consequence: 'You back out of the storage room.' },
            { id: 'c-tf15', text: "Enter Nursemaid's Suite (South)", targetSceneId: 'dh-15', icon: 'door', consequence: 'You pass through the south door.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Area 14. Storage Room' }],
        encounter: { monsters: [{ name: 'Broom of Animated Attack', count: 1 }] },
        entities: [],
        tags: ['exploration', 'combat'],
        dmNotes: 'This is the house\'s most deliberately mundane jump scare. A broom. There is something wonderfully absurd about it — a house full of ancient evil and one of its attacks is a domestic cleaning implement. Play it with absolute seriousness. The infernal enchantment detail turns it dark again immediately after. The high AC (15) makes it frustrating for low-level characters, which is by design.',
        estimatedMinutes: 12,
    },

    // ══════════════════════════════════════════════════════════════════════
    // AREA 15 – NURSEMAID'S SUITE
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-15', chapterId: 'chap-deathhouse',
        title: "Nursemaid's Suite", subtitle: 'Third Floor, Area 15', order: 15,
        mapRoomId: 'tf-15', mapFloorId: 'floor-third',
        narrationBlocks: [
            B('read-aloud', "The temperature drops when you open this door. Not gradually — immediately, sharply, like stepping into a root cellar. Frost edges the windowpanes. Your breath mists, for the first time since you entered this house. A simple servant's bed sits in one corner, and in the center of the room, a wooden crib draped in tattered black lace. Whatever was in the crib is long gone. The lace moves very slightly, as if disturbed by an air current that is not there."),
            B('read-aloud', "A full-length silver mirror stands beside the crib, its surface unclouded, perfectly clear. In the mirror: the crib is not empty. In the reflection, swaddled in clean lace and breathing, is a perfect infant boy, eyes closed, clutching a small wooden rattle. His chest moves with the rhythm of a sleeping child. In the room, the crib is empty. In the mirror, he sleeps."),
            B('atmosphere', "Silence. Absolute silence, as if the room finally stopped pretending the baby would cry. The cold has weight. It presses."),
            B('skill-check', "DC 14 Perception — Watching the mirror image carefully:\n\nSUCCESS: The infant in the mirror opens his eyes. They are not infant eyes. They are old. Black, and old, and patient, and they are looking directly at whoever made this check. The infant's mouth opens. No sound comes from the room, but in the mirror's reflection, you can see the shape the mouth makes:\n\n'WHY DID YOU LEAVE ME HERE?'\n\nThen the eyes close. The infant sleeps again in the reflection. In the room, the crib is and has always been empty."),
            B('dm-note', "SECRET DOOR:\n\nA DC 12 Investigation check (or DC 10 if the character is actively searching the walls) reveals a seam in the north wall — a hidden door, well-fitted, flush with the plaster. Opening it reveals a narrow staircase leading up to the attic. This is the only path to the attic that does not require the padlocked door from Area 20 (which requires the key from the library)."),
            B('dm-note', "SPECTER TRIGGER:\n\nThe Nursemaid's Specter activates when ANY of the following happen:\n• A character touches the crib or removes the lace\n• A character touches the mirror\n• A character examines the mirror for longer than 30 in-game seconds without looking away\n• A character finds the hidden door (the specter considers this as someone intending to go further in)\n\nThe Specter is the nursemaid — she did not escape this house. She loved Walter genuinely. She hates what was done to him and cannot distinguish between 'caused his suffering' and 'is present in the room where his ghost rests'. Everyone in the room is a threat to her.\n\nStatblock: HP 22, AC 12, Speed 0/50 fly (hover), Intangible, incorporeality, life drain (2d6 necrotic on hit, target must DC 10 Con save or max HP reduced by the same amount until long rest — THIS IS DANGEROUS AT LEVEL 2."),
            B('read-aloud', "The temperature drops further, if that is possible. The frost on the windows spreads, crawling inward. The mirror goes dark. And then the nursemaid steps through it — not out of it, through it, as if the glass were smoke. She is very tall. She is very thin. Her jaw hangs slightly open. Her eyes are two pale reflections of the frost on the glass. She does not scream. She does not speak. She opens her hands toward you as if to take something from you, and her hands are larger than they should be."),
            B('encounter-ref', "The nursemaid's specter lunges, her touch draining warmth from bone.", { encounterDetails: '1x Specter (HP 22, AC 12, Life Drain: 2d6 necrotic, Con DC 10 or max HP reduced — potentially lethal at level 1-2)' }),
            B('dm-note', "MANAGING THE SPECTER'S LETHALITY:\n\nAt level 1-2, the Specter's max HP reduction can kill a character who fails two saves in a row. You have options:\n\n• If a character drops to 0 max HP from her drain: the specter pauses. She looks at the fallen character. She appears, for a moment, genuinely grieved rather than predatory. Then continues.\n\n• Retreat option: if the party flees through the hidden door, she does not follow past the nursery door. She stays with the crib.\n\n• If someone shows the characters' compassion toward the crib (speaks gently to the room, addresses Walter's memory): the specter pauses for one round, flickering with something that isn't rage. This lets a round of healing/repositioning happen.\n\n• Narrative mercy: if a character is about to die from max HP reduction, have the specter shift her attention to a different target for one round — 'she didn't choose this victim specifically, she's confused and lashing at everything.'"),
        ],
        choices: [
            { id: 'c-tf11', text: 'Return to Balcony', targetSceneId: 'dh-11', icon: 'path', consequence: 'You retreat back toward the balcony.' },
            { id: 'c-at16', text: 'Take the Hidden Stairs Up to the Attic', targetSceneId: 'dh-16', icon: 'stairs', consequence: 'You find the hidden door and take the narrow stairs upward.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: "Area 15. Nursemaid's Suite" }],
        encounter: { monsters: [{ name: 'Specter', count: 1 }] },
        entities: [],
        tags: ['combat', 'story'],
        dmNotes: "This is the most dangerous room in the house above the dungeon. Prepare the party survival options mentally before this fight. The baby in the mirror saying 'WHY DID YOU LEAVE ME HERE' needs to be delivered calmly, matter-of-factly, no drama added. Restraint is how this line hits. Don't over-play it.",
        estimatedMinutes: 25,
    },
];
