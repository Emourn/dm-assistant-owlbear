import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NarrationBlock as NarrationBlockType, SceneEncounter } from '../../types/campaignNavigator';
import { Scroll, MessageCircle, Wind, Lightbulb, Swords, Gem, ShieldQuestion, ArrowRight, Loader2, FileUp, Edit2, Save, X, Trash2 } from 'lucide-react';
import { parseNarrationText } from '../../engine/entityEnrichment';
import { useCombatStore } from '../../store/combatStore';
import { searchMonsters } from '../../engine/fiveEToolsParser';
import { convertMonsterToCombatant } from '../../engine/combatEngine';
import { useCampaignStore } from '../../store/campaignStore';
import { useCharacterStore } from '../../store/characterStore';
import { useNavigatorStore } from '../../store/navigatorStore';

interface Props {
    block: NarrationBlockType;
    isAnimating?: boolean;
    sceneEncounter?: SceneEncounter;
    isEditMode?: boolean;
    sceneId?: string;
}

export function NarrationBlock({ block, isAnimating, sceneEncounter, isEditMode, sceneId }: Props) {
    const navigate = useNavigate();
    const startEncounter = useCombatStore(state => state.startEncounter);
    const initializeEncounterFromNavigator = useCombatStore(state => state.initializeEncounterFromNavigator);
    const addCombatant = useCombatStore(state => state.addCombatant);
    const [isLoadingEncounter, setIsLoadingEncounter] = useState(false);
    const campaigns = useCampaignStore(state => state.campaigns);
    const activeCampaignId = useCampaignStore(state => state.activeCampaignId);
    const characters = useCharacterStore(state => state.characters);
    const addItem = useCharacterStore(state => state.addItem);
    const updateNarrationBlock = useNavigatorStore(state => state.updateNarrationBlock);
    const removeNarrationBlock = useNavigatorStore(state => state.removeNarrationBlock);
    const currentSceneId = useNavigatorStore(state => state.currentSceneId);
    const dungeonMaps = useNavigatorStore(state => state.dungeonMaps);
    const activeFloorId = useNavigatorStore(state => state.activeFloorId);

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(block.text);
    const [editSpeaker, setEditSpeaker] = useState(block.speaker || '');
    const [editEmotion, setEditEmotion] = useState(block.emotion || '');
    const [editEncounter, setEditEncounter] = useState(block.encounterDetails || '');
    const [editLoot, setEditLoot] = useState(block.lootDetails || '');

    useEffect(() => {
        setEditText(block.text);
        setEditSpeaker(block.speaker || '');
        setEditEmotion(block.emotion || '');
        setEditEncounter(block.encounterDetails || '');
        setEditLoot(block.lootDetails || '');
    }, [block]);

    const handleSaveEdit = () => {
        const targetScene = sceneId || currentSceneId;
        if (targetScene) {
            updateNarrationBlock(targetScene, block.id, {
                text: editText,
                speaker: editSpeaker || undefined,
                emotion: editEmotion || undefined,
                encounterDetails: editEncounter || undefined,
                lootDetails: editLoot || undefined,
            });
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditText(block.text);
        setEditSpeaker(block.speaker || '');
        setEditEmotion(block.emotion || '');
        setEditEncounter(block.encounterDetails || '');
        setEditLoot(block.lootDetails || '');
        setIsEditing(false);
    };

    // Universal Edit Form
    if (isEditing) {
        return (
            <div className="my-4 rounded-lg border border-stone-700/60 bg-stone-900/90 p-3 animate-in fade-in duration-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/70 font-bold">Edit Block</span>
                    <button onClick={handleCancelEdit} className="text-stone-500 hover:text-stone-300">
                        <X size={14} />
                    </button>
                </div>
                
                <div className="space-y-2">
                    {block.type === 'dialog' && (
                        <div className="flex gap-2">
                            <input type="text" value={editSpeaker} onChange={e => setEditSpeaker(e.target.value)} placeholder="Speaker name..." className="flex-1 bg-stone-950/50 border border-stone-700/50 rounded px-2 py-1.5 text-sm text-teal-300 outline-none focus:border-teal-600/50 transition-colors" />
                            <input type="text" value={editEmotion} onChange={e => setEditEmotion(e.target.value)} placeholder="Emotion..." className="flex-1 bg-stone-950/50 border border-stone-700/50 rounded px-2 py-1.5 text-sm text-stone-400 outline-none focus:border-teal-600/30 transition-colors" />
                        </div>
                    )}
                    {block.type === 'encounter-ref' && (
                        <input type="text" value={editEncounter} onChange={e => setEditEncounter(e.target.value)} placeholder="Encounter override details..." className="w-full bg-stone-950/50 border border-stone-700/50 rounded px-2 py-1.5 text-xs text-red-300 outline-none focus:border-red-600/50 transition-colors" />
                    )}
                    {block.type === 'loot-ref' && (
                        <input type="text" value={editLoot} onChange={e => setEditLoot(e.target.value)} placeholder="Loot item name..." className="w-full bg-stone-950/50 border border-stone-700/50 rounded px-2 py-1.5 text-xs text-amber-300 outline-none focus:border-amber-600/50 transition-colors" />
                    )}
                    
                    <textarea 
                        value={editText} 
                        onChange={e => setEditText(e.target.value)} 
                        className="w-full bg-stone-950/80 border border-stone-700/80 rounded px-3 py-2 text-sm text-stone-200 focus:border-stone-500 outline-none min-h-[80px] font-sans resize-none"
                        autoFocus
                    />
                    
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={handleCancelEdit} className="px-3 py-1 text-xs text-stone-500 hover:text-stone-300 font-bold uppercase">Cancel</button>
                        <button onClick={handleSaveEdit} className="px-3 py-1 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-700/40 text-amber-400 text-xs font-bold uppercase rounded flex items-center gap-1">
                            <Save size={12} /> Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        const targetScene = sceneId || currentSceneId;
        if (targetScene) removeNarrationBlock(targetScene, block.id);
    };

    // ── Read-Aloud Box ──────────────────────────────────────
    if (block.type === 'read-aloud') {
        return (
            <div className={`
                relative my-6 p-6 rounded-lg group
                bg-gradient-to-br from-amber-950/40 to-stone-900/60
                border border-amber-700/40
                shadow-[0_0_20px_rgba(217,119,6,0.08)]
                transition-all duration-700
                ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
            `}>
                {/* Gold accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 rounded-l-lg" />

                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Scroll size={14} className="text-amber-500" />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/70 font-cinzel font-bold">Read Aloud</span>
                    </div>
                    {isEditMode && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                            <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                        </div>
                    )}
                </div>

                <p className="text-amber-100/90 leading-[1.9] text-[15px] italic font-serif pl-4">
                    {parseNarrationText(block.text)}
                </p>
            </div>
        );
    }

    // ── Dialog Box ───────────────────────────────────────────
    if (block.type === 'dialog') {
        return (
            <div className={`
                my-5 pl-5 border-l-2 border-teal-600/40 group relative
                transition-all duration-700
                ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
            `}>
                {isEditMode && (
                    <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                        <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                    </div>
                )}
                {block.speaker && (
                    <div className="flex items-center gap-2 mb-1.5">
                        <MessageCircle size={13} className="text-teal-400" />
                        <span className="text-teal-300 font-cinzel text-sm font-bold tracking-wide">
                            {block.speaker}
                        </span>
                        {block.emotion && (
                            <span className="text-stone-500 text-xs italic">— {block.emotion}</span>
                        )}
                    </div>
                )}
                <p className="text-stone-200 leading-[1.8] text-[15px] italic">
                    "{parseNarrationText(block.text)}"
                </p>
            </div>
        );
    }

    // ── Atmosphere ───────────────────────────────────────────
    if (block.type === 'atmosphere') {
        return (
            <div className={`
                my-5 px-6 py-4 group relative
                bg-gradient-to-r from-teal-950/20 via-transparent to-purple-950/20
                border-y border-stone-700/20
                transition-all duration-700
                ${isAnimating ? 'opacity-0' : 'opacity-100'}
            `}>
                {isEditMode && (
                    <button onClick={handleDelete}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/40 text-stone-600 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                    </button>
                )}
                <div className="flex items-start gap-3">
                    <Wind size={16} className="text-teal-500/60 mt-1 shrink-0" />
                    <p className="text-stone-400 leading-[1.9] text-sm italic tracking-wide">
                        {parseNarrationText(block.text)}
                    </p>
                </div>
            </div>
        );
    }

    // ── DM Note (Hidden Tip) ──────────────────────────────
    if (block.type === 'dm-note') {
        return (
            <div className={`
                my-4 p-4 rounded-md
                bg-purple-950/20 border border-purple-800/30
                group relative transition-all duration-700
                ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
            `}>
                <div className="flex items-start gap-3">
                    <Lightbulb size={15} className="text-purple-400 mt-0.5 shrink-0" />
                    <div className="flex-1 w-full relative">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-[0.15em] text-purple-400/70 font-bold">DM Confidential</span>
                            {isEditMode && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                                    <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                                </div>
                            )}
                        </div>
                        <p className="text-purple-200/70 leading-[1.7] text-sm">{parseNarrationText(block.text)}</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Encounter Reference ─────────────────────────────────
    if (block.type === 'encounter-ref') {
        const handleRunEncounter = async () => {
            if (!sceneEncounter || sceneEncounter.monsters.length === 0) return;
            setIsLoadingEncounter(true);

            try {
                const sortedMaps = [...dungeonMaps].sort((a, b) => a.floorOrder - b.floorOrder);
                const activeMap = sortedMaps.find(m => m.floorId === activeFloorId) || sortedMaps[0];

                if (activeMap) {
                    initializeEncounterFromNavigator(activeMap);
                } else {
                    startEncounter(`Encounter: ${sceneEncounter.monsters.map(m => m.name).join(', ')}`, [], activeCampaignId || undefined);
                }

                const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
                const hasPlayersAlready = useCombatStore.getState().activeEncounter?.combatants.some(c => c.type === 'player');
                if (activeCampaign && !hasPlayersAlready) {
                    for (const charId of (activeCampaign.partyIds || [])) {
                        const char = characters.find(c => c.id === charId);
                        if (char) {
                            const getVal = (field: string, fallback: any) => {
                                const ov = char.customOverrides?.overrides?.find((o: any) => o.field === field && o.isActive);
                                return ov ? ov.value : (char as any)[field] ?? fallback;
                            };

                            addCombatant({
                                id: crypto.randomUUID(),
                                sourceId: char.id,
                                type: 'player',
                                name: char.name,
                                ac: Number(getVal('ac', 10)),
                                maxHp: Number(char.maxHp) || 10,
                                currentHp: Number(char.currentHp) || 10,
                                tempHp: Number(char.tempHp) || 0,
                                speed: getVal('speed', '30 ft'),
                                initiativeMod: Number(getVal('initiativeMod', 0)),
                                initiativeScore: null,
                                dexterityScore: Number(char.abilityScores?.dex) || 10,
                                conditions: char.conditions ? [...char.conditions] : [],
                                abilityScores: char.abilityScores ? { ...char.abilityScores } : undefined,
                                savingThrowProficiencies: char.savingThrows || [],
                                proficiencyBonus: Number(char.proficiencyBonus) || 2,
                                spellcastingAbility: char.spellcastingAbility,
                                spellSaveDc: Number(char.spellSaveDc) || 0,
                                spellAttackMod: Number(char.spellAttackMod) || 0,
                                portraitUrl: char.portraitUrl,
                            });
                        }
                    }
                }

                for (const monsterReq of sceneEncounter.monsters) {
                    const results = await searchMonsters(monsterReq.name);
                    const bestMatch = results.find(r => r.name.toLowerCase() === monsterReq.name.toLowerCase()) || results[0];

                    if (bestMatch) {
                        for (let i = 0; i < monsterReq.count; i++) {
                            const customName = monsterReq.count > 1 ? `${bestMatch.name} ${String.fromCharCode(65 + i)}` : bestMatch.name;
                            const combatant = convertMonsterToCombatant(bestMatch, customName);
                            addCombatant(combatant);
                        }
                    } else {
                        console.warn(`Could not find monster: ${monsterReq.name}`);
                    }
                }

                navigate('/combat');
            } catch (error) {
                console.error("Failed to run encounter:", error);
            } finally {
                setIsLoadingEncounter(false);
            }
        };

        return (
            <div className={`
                my-5 p-4 rounded-lg group relative
                bg-gradient-to-r from-red-950/30 to-stone-900/40
                border border-red-800/30
                transition-all duration-700
                ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            `}>
                {isEditMode && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                        <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/40 rounded-md border border-red-700/30">
                            <Swords size={16} className="text-red-400" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-[0.15em] text-red-400/70 font-bold">Combat Encounter</span>
                            <p className="text-stone-300 text-sm mt-0.5">{parseNarrationText(block.text)}</p>
                            {block.encounterDetails && (
                                <p className="text-stone-500 text-xs mt-1">{parseNarrationText(block.encounterDetails)}</p>
                            )}
                        </div>
                    </div>
                    {sceneEncounter && (
                        <button
                            type="button"
                            onClick={handleRunEncounter}
                            disabled={isLoadingEncounter}
                            className={`px-4 py-2 flex items-center gap-2 bg-red-900/50 hover:bg-red-800/60 text-red-300 text-xs font-bold uppercase tracking-wider rounded-md border border-red-700/40 hover:border-red-600/50 transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.15)] ${isLoadingEncounter ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoadingEncounter ? <Loader2 size={14} className="animate-spin" /> : '⚔️'}
                            {isLoadingEncounter ? 'Summoning...' : 'Run Encounter'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── Loot Reference ──────────────────────────────────────
    if (block.type === 'loot-ref') {
        const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
        const partyMembers = activeCampaign ? characters.filter(c => (activeCampaign.partyIds || []).includes(c.id)) : [];

        return (
            <div className={`
                my-4 p-4 rounded-md group relative
                bg-amber-950/15 border border-amber-800/25
                transition-all duration-700
                ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
            `}>
                {isEditMode && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                        <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                    </div>
                )}
                <div className="flex items-start gap-3">
                    <Gem size={15} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 w-full">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-amber-500/70 font-bold">Treasure Found</span>
                        <p className="text-amber-200/80 leading-[1.7] text-sm mt-1">{parseNarrationText(block.text)}</p>

                        <LootDispatcher block={block} partyMembers={partyMembers} addItem={addItem} />
                    </div>
                </div>
            </div>
        );
    }

    // ── Skill Check ─────────────────────────────────────────
    if (block.type === 'skill-check') {
        const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
        const partyMembers = activeCampaign ? characters.filter(c => (activeCampaign.partyIds || []).includes(c.id)) : [];

        return (
            <div className={`
                my-4 p-4 rounded-md group relative
                bg-blue-950/20 border border-blue-800/30
                transition-all duration-700
                ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
            `}>
                {isEditMode && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                        <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                    </div>
                )}
                <div className="flex items-start gap-3">
                    <ShieldQuestion size={15} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-blue-400/70 font-bold">Skill Check</span>
                        <p className="text-blue-200/80 leading-[1.7] text-sm mt-1">{parseNarrationText(block.text)}</p>

                        <SkillCheckRoller block={block} partyMembers={partyMembers} />
                    </div>
                </div>
            </div>
        );
    }

    // ── Transition ──────────────────────────────────────────
    if (block.type === 'transition') {
        return (
            <div className={`
                my-8 flex items-center gap-4 group relative
                transition-all duration-700
                ${isAnimating ? 'opacity-0' : 'opacity-100'}
            `}>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-600/40 to-transparent" />
                <p className="text-stone-500 text-xs italic tracking-wide flex items-center gap-2">
                    <ArrowRight size={12} />
                    {parseNarrationText(block.text)}
                </p>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-600/40 to-transparent" />
                {isEditMode && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                        <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                    </div>
                )}
            </div>
        );
    }

    // ── Default Description ─────────────────────────────────
    return (
        <div className={`
            my-4 group relative
            transition-all duration-700
            ${isAnimating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}
        `}>
            {isEditMode && (
                <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)} className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-all"><Edit2 size={12} /></button>
                    <button onClick={handleDelete} className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/40 transition-all"><Trash2 size={12} /></button>
                </div>
            )}
            <p className="text-stone-300 leading-[1.9] text-[15px]">
                {parseNarrationText(block.text)}
            </p>
        </div>
    );
}

function SkillCheckRoller({ block, partyMembers }: any) {
    const [selectedChar, setSelectedChar] = useState<any>(null);
    const [charModifier, setCharModifier] = useState<number>(0);
    const [inputValue, setInputValue] = useState<string>('');
    const [result, setResult] = useState<any>(null);

    const dcMatch = block.text.match(/DC\s*(\d+)/i);
    const dc = dcMatch ? parseInt(dcMatch[1]) : 10;

    const skills = ['Athletics', 'Acrobatics', 'Sleight of Hand', 'Stealth', 'Arcana', 'History', 'Investigation', 'Nature', 'Religion', 'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival', 'Deception', 'Intimidation', 'Performance', 'Persuasion'];
    const skillMatch = skills.find((s: string) => block.text.toLowerCase().includes(s.toLowerCase()));

    const handleSelectChar = (char: any) => {
        let modifier = 0;
        if (skillMatch) {
            const charSkill = char.skills?.find((s: any) => s.name.toLowerCase() === skillMatch.toLowerCase());
            if (charSkill) {
                const stat = charSkill.stat?.toLowerCase() || 'str';
                const abilityMod = Math.floor(((char.abilityScores?.[stat] || 10) - 10) / 2);
                const prof = charSkill.proficient ? (char.proficiencyBonus || 2) : 0;
                const expert = charSkill.expertise ? (char.proficiencyBonus || 2) : 0;
                modifier = abilityMod + prof + expert + (charSkill.bonus || 0);
            } else {
                const statMap: Record<string, string> = {
                    'Athletics': 'str', 'Acrobatics': 'dex', 'Sleight of Hand': 'dex', 'Stealth': 'dex',
                    'Arcana': 'int', 'History': 'int', 'Investigation': 'int', 'Nature': 'int', 'Religion': 'int',
                    'Animal Handling': 'wis', 'Insight': 'wis', 'Medicine': 'wis', 'Perception': 'wis', 'Survival': 'wis',
                    'Deception': 'cha', 'Intimidation': 'cha', 'Performance': 'cha', 'Persuasion': 'cha'
                };
                const stat = statMap[skillMatch] || 'str';
                modifier = Math.floor(((char.abilityScores?.[stat] || 10) - 10) / 2);
            }
        }

        setSelectedChar(char);
        setCharModifier(modifier);
        setInputValue('');
        setResult(null);
    };

    const handleResolve = () => {
        const d20 = parseInt(inputValue);
        if (isNaN(d20)) return;
        const total = d20 + charModifier;
        setResult({ d20, modifier: charModifier, total, success: total >= dc, charName: selectedChar.name });
    };

    if (partyMembers.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-blue-800/20">
            {result ? (
                <div className={`p-2 rounded flex items-center justify-between ${result.success ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
                    <div className="text-xs">
                        <span className="font-bold text-parchment">{result.charName}</span> rolled:
                        <span className={`ml-2 font-bold text-lg ${result.success ? 'text-green-400' : 'text-red-400'}`}>{result.total}</span>
                        <span className="text-[10px] text-stone-500 ml-1">({result.d20} + {result.modifier >= 0 ? '+' : ''}{result.modifier})</span>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                        {result.success ? 'Success' : 'Failure'} (DC {dc})
                    </div>
                    <button onClick={() => { setResult(null); setSelectedChar(null); }} className="text-[10px] text-stone-500 hover:text-stone-300 ml-2">Reset</button>
                </div>
            ) : selectedChar ? (
                <div className="p-3 rounded bg-stone-900/50 border border-stone-800 flex flex-col gap-2">
                    <div className="text-xs text-stone-300">
                        Ask <span className="font-bold text-blue-400">{selectedChar.name}</span> to roll <span className="font-bold text-amber-400">{skillMatch || 'a check'}</span> (DC {dc}).
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 flex-shrink-0">Natural D20 roll:</span>
                        <input
                            type="number"
                            min="1" max="20"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                            className="bg-stone-950 border border-stone-700 rounded px-2 py-1 w-16 text-sm text-center font-bold text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <span className="text-xs text-stone-500 flex-shrink-0">
                            {charModifier >= 0 ? `+ ${charModifier}` : `- ${Math.abs(charModifier)}`} mod
                        </span>
                        <button
                            onClick={handleResolve}
                            disabled={!inputValue}
                            className="ml-auto px-3 py-1 bg-blue-900/50 hover:bg-blue-800 border border-blue-700 rounded text-xs font-bold text-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Resolve
                        </button>
                        <button onClick={() => setSelectedChar(null)} className="p-1 text-stone-500 hover:text-stone-300 ml-1">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-blue-500/60 uppercase tracking-widest font-bold">Roll for:</span>
                    {partyMembers.map((char: any) => (
                        <button
                            key={char.id}
                            onClick={() => handleSelectChar(char)}
                            className="px-3 py-1 bg-stone-900 border border-stone-700 hover:border-blue-600 hover:text-blue-400 rounded text-xs font-bold text-stone-300 transition-colors shadow-sm"
                        >
                            {char.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function LootDispatcher({ block, partyMembers, addItem }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [justGivenTo, setJustGivenTo] = useState<string | null>(null);

    const handleGive = (char: any) => {
        const itemData = {
            name: block.lootDetails || 'Discovered Loot',
            quantity: 1,
            weight: 0,
            isEquipped: false,
            isAttuned: false,
            description: block.text,
            type: 'other' as const,
        };
        addItem(char.id, itemData);
        setJustGivenTo(char.name);
        setIsOpen(false);
        setTimeout(() => setJustGivenTo(null), 3500);
    };

    if (partyMembers.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-amber-800/20">
            {justGivenTo ? (
                <div className="text-xs text-amber-500/80 italic animate-pulse">
                    Successfully added to {justGivenTo}'s inventory.
                </div>
            ) : isOpen ? (
                <div className="flex flex-wrap gap-2 items-center animate-in fade-in duration-300">
                    <span className="text-xs text-amber-500/60 uppercase tracking-widest font-bold">Give to:</span>
                    {partyMembers.map((char: any) => (
                        <button
                            key={char.id}
                            onClick={() => handleGive(char)}
                            className="px-3 py-1 bg-stone-900 border border-stone-700 hover:border-amber-600 hover:text-amber-400 rounded text-xs font-bold text-stone-300 transition-colors shadow-sm"
                        >
                            {char.name}
                        </button>
                    ))}
                    <button onClick={() => setIsOpen(false)} className="px-2 py-1 text-xs text-stone-500 hover:text-stone-300 ml-2 transition-colors">Cancel</button>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-800/40 hover:border-amber-500/60 rounded text-xs font-bold text-amber-500 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                >
                    <FileUp size={14} /> Add to Party Inventory
                </button>
            )}
        </div>
    );
}
