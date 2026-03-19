import { NarrativeScene } from '../../types/campaignNavigator';
import { B } from './builder';

export const escapeScenes: NarrativeScene[] = [
    // ══════════════════════════════════════════════════════════════════════
    // THE ESCAPE
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-32', chapterId: 'chap-deathhouse-escape',
        title: 'The Escape', subtitle: 'Death House - The Exit', order: 31,
        narrationBlocks: [
            B('dm-note', "IF APPEASED (SACRIFICE MADE): The house lets you go. The tunnels are quiet. Each floor is exactly as you left it, but the air is thinner — as if the house's interest in you has faded. The front doors open without resistance. Outside: grey sky, cold air, gravel. (Skip the Gauntlet entirely)\n\nIF REFUSED (NO SACRIFICE): As you climb back up, the house wakes. The facade of beauty is gone. It is showing you what it actually is."),
            B('dm-note', "THE GAUNTLET HAZARDS (Active on all floors):\n• Bricked Windows: Every window is sealed with stone from inside. No escape.\n• Scythe Blades: Razor-sharp pendulum blades swing in repeating arcs filling each doorframe. (DC 15 Acrobatics to pass unharmed. DC 15 Intelligence to time it. Fail = 2d10 slashing)\n• Poison Smoke: Every fireplace/stove belches thick black smoke. Burns eyes and lungs. (DC 10 Con save per room. Fail = 1d10 poison damage per turn)\n• Rat Swarms: Wall splinters release hundreds of rats. (AC 5, 5 HP per section. Or DC 10 Strength to smash through)"),
            B('read-aloud', "(SCYTHE BLADES) The doors are gone. In every doorway, a blade swings in a repeating arc — razor-sharp, pendulum-steady. The edge gleams, and each swing fills the frame completely."),
            B('read-aloud', "(POISON SMOKE) Every fireplace and stove belches thick black smoke that hangs at shoulder height. The smell is acrid — chemical, almost alive."),
            B('read-aloud', "(RAT SWARMS) The wall splinters and a tide of rats pours out — hundreds, grey fur and black eyes and small sharp teeth, spilling from the walls like a hemorrhage."),
            B('atmosphere', "The oaken front doors. For one breath you think they might be sealed — that this house has decided you'll die in it. You push. They open."),
            B('read-aloud', "Outside: grey sky. Cold air. Gravel crunching beneath boots that have been in places boots shouldn't go. Death House stands behind you — not angry, not satisfied. Disappointed. As if you were a meal that wasn't worth finishing."),
            B('atmosphere', "The fog at the village edges has thinned. The boarded shops and silent tavern stand in grey light with the patience of things that know they'll be needed again."),
            B('dm-note', "Give this moment weight. They survived. They are Level 3. Let them feel it before moving to the Bridge.\nIf anyone looks back at the house: it looks exactly as it did when they entered. Pristine. Inviting. The gate is slightly ajar."),
        ],
        choices: [
            { id: 'c-dh33', text: 'Step Into the Mists', targetSceneId: 'dh-33', icon: 'path', consequence: 'You walk toward the only opening in the fog.' },
        ],
        sources: [{ documentTitle: 'Curse of Strahd', sectionTitle: 'Escape' }, { documentTitle: 'DM Script', sectionTitle: 'The Escape' }],
        entities: [],
        tags: ['combat', 'story', 'exploration'],
        dmNotes: 'Run the gauntlet fast and frantic if they chose not to sacrifice. If they did sacrifice, let them walk out in eerie, quiet safety.',
        estimatedMinutes: 15,
    },

    // ══════════════════════════════════════════════════════════════════════
    // THE BRIDGE — RETURN TO NEVERWINTER
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-33', chapterId: 'chap-deathhouse-escape',
        title: 'Return to Neverwinter', subtitle: 'The Bridge Through the Mists', order: 32,
        narrationBlocks: [
            B('read-aloud', "The fog at the edges of Barovia begins to move — not retreating, opening. Like a door. Like hands parting. You walk toward it. There is no other direction. Gravel becomes cobblestone. The cold thins. The weight of the village lifts from your shoulders in stages."),
            B('atmosphere', "You walk through the fog. Same as before — directionless, timeless. But shorter this time, as if whatever brought you there has decided you're finished and wants you gone."),
            B('read-aloud', "The fog shreds apart violently, as if something on the other side lost patience. Light hits you like a wall. City sounds: a blacksmith's hammer, a distant bell, the murmur of a crowd. The smell of horse dung, smoke, baking bread, and the mineral tang of the sea."),
            B('read-aloud', "You are standing at the western gate of Neverwinter. The sun is high."),
            B('dialog', "Oi! Where'd you lot come from? That gate's been closed all week.", { speaker: 'Gate Guard', emotion: 'Surprised, suspicious' }),
            B('dm-note', "When players speak to the guard, establish that TIME HAS PASSED. Several weeks have passed since they left, not just a few days.\n\nGuard info:\n- Fog rolled in thick about two weeks back.\n- The Commander ordered the gate sealed until it cleared yesterday.\n- There's been trouble in the western district — city watch found bodies. 'Cult business, they reckon.'"),
            B('atmosphere', "The city looks the same, but the light is different. The trees along the Dolphin Bridge have fewer leaves. Market stalls that sold summer fruit now sell root vegetables. Time has passed — not days. Weeks."),
        ],
        choices: [
            { id: 'c-dh34', text: 'Enter the City', targetSceneId: 'dh-34', icon: 'path', consequence: 'You step through the gate into Neverwinter.' },
        ],
        sources: [{ documentTitle: 'DM Script', sectionTitle: 'The Bridge — Return to Neverwinter' }],
        entities: [],
        tags: ['story', 'exploration'],
        dmNotes: 'Don\'t belabor the time skip. The guard\'s dialogue establishes it. Let the players ask one or two questions, then move to the scream.',
        estimatedMinutes: 10,
    },

    // ══════════════════════════════════════════════════════════════════════
    // NEST OF THE ELDRITCH EYE — OPENING HOOK
    // ══════════════════════════════════════════════════════════════════════
    {
        id: 'dh-34', chapterId: 'chap-deathhouse-escape',
        title: "Kevori's Scream", subtitle: 'Neverwinter Alleyway', order: 33,
        narrationBlocks: [
            B('read-aloud', "You've taken twenty steps into the city when an anguished scream erupts from a nearby alley. Raw, broken — the sound of someone discovering something they already feared. The sound of someone who held onto hope for weeks and has just let it drop. You round the corner."),
            B('read-aloud', "Kevori Fearnehart kneels in the dirt. She is thinner than when you last saw her — hair loose, unwashed, leather armor scuffed in ways it wasn't before. She has been working hard, for days, without rest, without backup."),
            B('read-aloud', "She is clutching the lifeless body of her brother. Delvin wears a tattered grey robe — cult robes — over the clothes he wore the day you all left the keep. His face is still. Not calm. Just finished. Whatever he saw at the end, he isn't seeing it anymore."),
            B('atmosphere', "And from his open palm, loosening from fingers that have stopped gripping, with a dull, hollow thump against the cobblestones: a desiccated eyeball. It rolls to a stop against your boot. Even motionless, even disconnected from whatever powers it, it seems to be looking at something."),
            B('dialog', "He went in. Three weeks ago. Said he'd found an entrance. Said he'd learned the phrase.", { speaker: 'Kevori Fearnehart', emotion: 'Raw, looking up, eyes red, voice a blade' }),
            B('dialog', "I searched for him every night. I found him here, twenty minutes ago. He was already cold.", { speaker: 'Kevori Fearnehart', emotion: 'Grieving' }),
            B('dialog', "No. But that doesn't matter right now. What matters is what they did to him. And what you're going to do about it.", { speaker: 'Kevori Fearnehart', emotion: 'When asked if she is okay' }),
            B('dialog', "Find the cult. Find what they did to him. And burn it to the ground.", { speaker: 'Kevori Fearnehart', emotion: 'Exhausted, furious' }),
            B('read-aloud', "She looks at you. Exhausted. Grieving. Furious.\n\n'Will you finish it?'"),
            B('dm-note', "THIS IS THE OPENING OF 'NEST OF THE ELDRITCH EYE'.\nFrom this point, run the adventure as written in the source material. Give this scene emotional weight — Kevori is the players' connection to what happened while they were gone. She is grief and rage in equal parts. She will not be left behind.\n\nThe desiccated eyeball is the adventure hook. It matches the description in the Nest sourcebook exactly."),
        ],
        choices: [
            { id: 'c-end-prologue', text: 'End Prologue (Begin Nest of the Eldritch Eye)', targetSceneId: '', icon: 'door', consequence: 'The Death House prologue is complete.' },
        ],
        sources: [{ documentTitle: 'DM Script', sectionTitle: "Kevori's Scream (Nest of the Eldritch Eye — Opening Scene)" }],
        entities: [
            { id: 'ent-kevori', name: 'Kevori Fearnehart', type: 'npc', description: 'Alive, grieving, furious. She will accompany the party.' },
            { id: 'ent-delvin', name: 'Delvin Fearnehart', type: 'npc', description: 'Dead. Infiltrated the cult during the time skip. Found with the eyeball.' }
        ],
        tags: ['story', 'roleplay'],
        dmNotes: 'This is the emotional gut-punch of the transition. Let them feel the weight of Delvin\'s death which happened while they were trapped.',
        estimatedMinutes: 15,
    }
];
