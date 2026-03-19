import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCampaignStore } from '../store/campaignStore';
import { useCharacterStore } from '../store/characterStore';
import { Map, Users, Swords, BookOpen, Clock, ChevronLeft, Trash2, Edit2, X, Plus, Heart, Sparkles } from 'lucide-react';
import { Campaign, NPC } from '../types/campaign';
import { CharacterCard } from '../components/character/CharacterCard';
import { EncounterLibrary } from '../components/combat/EncounterLibrary';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../components/common/ToastProvider';
import { FiveEToolsModal } from '../components/common/FiveEToolsModal';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

type Tab = 'overview' | 'party' | 'notes' | 'encounters' | 'npcs' | 'locations';

export function CampaignDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const campaigns = useCampaignStore((state) => state.campaigns);
    const setActiveCampaign = useCampaignStore((state) => state.setActiveCampaign);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);

    // Time management
    const advanceTime = useCampaignStore((state) => state.advanceTime);

    // Notes management
    const addSessionNote = useCampaignStore((state) => state.addSessionNote);
    const deleteSessionNote = useCampaignStore((state) => state.deleteSessionNote);

    // All characters (for assigning)
    const allCharacters = useCharacterStore((state) => state.characters);
    const longRestParty = useCharacterStore((state) => state.longRestParty);
    // Methods to assign
    const addCharacterToCampaign = useCampaignStore((state) => state.addCharacterToCampaign);
    const removeCharacterFromCampaign = useCampaignStore((state) => state.removeCharacterFromCampaign);
    const addNpc = useCampaignStore((state) => state.addNpc);
    const deleteNpc = useCampaignStore((state) => state.deleteNpc);
    const addLocation = useCampaignStore((state) => state.addLocation);
    const deleteLocation = useCampaignStore((state) => state.deleteLocation);

    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Modal state
    const [confirmAction, setConfirmAction] = useState<{
        type: 'rest' | 'deleteNote';
        data?: any;
    } | null>(null);

    // Notes state
    const [isWritingNote, setIsWritingNote] = useState(false);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteSessionNum, setNoteSessionNum] = useState(1);

    // NPC State
    const [isAddingNpc, setIsAddingNpc] = useState(false);
    const [showNpcImporter, setShowNpcImporter] = useState(false);
    const [npcForm, setNpcForm] = useState({ name: '', role: '', faction: '', location: '', description: '', armorClass: '', hitPoints: '', challengeRating: '' });

    // Location State
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    const [locForm, setLocForm] = useState({ name: '', region: '', description: '' });

    const campaign = campaigns.find(c => c.id === id);

    if (!campaign) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
                <Map size={48} className="text-stone-600 mb-4" />
                <h2 className="text-2xl font-cinzel text-parchment mb-2">Campaign Not Found</h2>
                <p className="text-stone-400 mb-6">The campaign you are looking for does not exist or has been deleted.</p>
                <Link to="/campaigns" className="px-4 py-2 bg-stone-800 text-parchment rounded hover:bg-stone-700 transition-colors">
                    Back to Campaigns
                </Link>
            </div>
        );
    }

    const partyCharacters = allCharacters.filter(c => campaign.partyIds.includes(c.id));
    const availableCharacters = allCharacters.filter(c => !campaign.partyIds.includes(c.id));
    const totalPartyMaxHp = partyCharacters.reduce((sum, character) => sum + character.maxHp, 0);
    const totalPartyCurrentHp = partyCharacters.reduce((sum, character) => sum + character.currentHp, 0);
    const averageLevel = partyCharacters.length > 0
        ? (partyCharacters.reduce((sum, character) => sum + character.level, 0) / partyCharacters.length).toFixed(1)
        : '0.0';
    const editionBreakdown = partyCharacters.reduce((acc, character) => {
        const key = character.provenance?.edition || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const handleSaveNote = () => {
        if (!noteTitle.trim() || !noteContent.trim()) return;

        addSessionNote(campaign.id, {
            title: noteTitle,
            content: noteContent,
            sessionNumber: noteSessionNum,
        });

        setIsWritingNote(false);
        setNoteTitle('');
        setNoteContent('');
        setNoteSessionNum(campaign.sessionNotes.length + 2); // default to next
        addToast(`Session Note scribed in the archives.`, 'success');
    };

    const handleAddNpc = () => {
        if (!npcForm.name.trim()) return;
        addNpc(campaign.id, {
            ...npcForm,
            armorClass: npcForm.armorClass ? parseInt(npcForm.armorClass, 10) : undefined,
            hitPoints: npcForm.hitPoints ? parseInt(npcForm.hitPoints, 10) : undefined,
            challengeRating: npcForm.challengeRating || undefined
        });
        setNpcForm({ name: '', role: '', faction: '', location: '', description: '', armorClass: '', hitPoints: '', challengeRating: '' });
        setIsAddingNpc(false);
        addToast(`NPC '${npcForm.name}' added to campaign.`, 'success');
    };

    const handleImportNpc = (item: any) => {
        const importedNpc: Omit<NPC, 'id'> = {
            name: item.name,
            role: item.type || 'Creature',
            faction: item.type ? `${item.type}` : 'Imported Creature',
            description: item.description || `${item.name} imported from 5e.tools.`,
            armorClass: typeof item.ac === 'number' ? item.ac : undefined,
            hitPoints: typeof item.hp === 'number' ? item.hp : undefined,
            challengeRating: item.cr || undefined,
            tags: [item.type, item.source].filter(Boolean),
            provenance: {
                origin: item?.isHomebrew ? 'homebrew' : '5etools',
                edition: item?.is2024 ? '2024' : '2014',
                sourceSummary: item?.source || item?.homebrewSource || '5e.tools',
                importedAt: Date.now()
            }
        };

        addNpc(campaign.id, importedNpc);
        addToast(`Imported NPC record: ${item.name}`, 'success');
    };

    const handleAddLocation = () => {
        if (!locForm.name.trim()) return;
        addLocation(campaign.id, locForm);
        setLocForm({ name: '', region: '', description: '' });
        setIsAddingLocation(false);
        addToast(`Location '${locForm.name}' charted.`, 'success');
    };

    const renderTimeDisplay = (time: Campaign['timeTracking']) => {
        const d = String(time.currentDay).padStart(2, '0');
        const h = String(time.currentHour).padStart(2, '0');
        const m = String(time.currentMinute).padStart(2, '0');
        return `Day ${d} — ${h}:${m}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-2 text-stone-400 mb-2 text-sm">
                <Link to="/campaigns" className="hover:text-parchment flex items-center gap-1 transition-colors">
                    <ChevronLeft size={16} /> All Campaigns
                </Link>
                <span>/</span>
                <span className="text-parchment font-medium">{campaign.title}</span>
            </div>

            <header className="flex items-start justify-between border-b border-stone-700/50 pb-6 relative group">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-cinzel font-bold text-parchment">{campaign.title}</h1>
                        {activeCampaignId === campaign.id && (
                            <span className="px-2 py-1 bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                                Active
                            </span>
                        )}
                    </div>
                    <p className="text-parchment-muted max-w-3xl whitespace-pre-wrap">{campaign.description || 'No description provided.'}</p>
                </div>

                {activeCampaignId !== campaign.id && (
                    <button
                        onClick={() => setActiveCampaign(campaign.id)}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 hover:text-gold text-stone-300 font-medium rounded border border-stone-600 transition-colors shadow-sm"
                    >
                        Set as Active
                    </button>
                )}
            </header>

            {/* In-Game Clock */}
            <div className="bg-obsidian border border-stone-700/50 rounded-lg p-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                        <Clock size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-0.5">In-Game Time</div>
                        <div className="text-xl font-cinzel text-parchment tracking-wide">{renderTimeDisplay(campaign.timeTracking)}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => advanceTime(campaign.id, 10)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm transition-colors border border-stone-700">
                        +10m
                    </button>
                    <button onClick={() => advanceTime(campaign.id, 60)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm transition-colors border border-stone-700">
                        +1 Hour
                    </button>
                    <button
                        onClick={() => setConfirmAction({ type: 'rest' })}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-blue-300 rounded text-sm transition-colors border border-blue-900/50"
                    >
                        Long Rest (+8h)
                    </button>
                    <button onClick={() => advanceTime(campaign.id, 24 * 60)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm transition-colors border border-stone-700 ml-2">
                        +1 Day
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-700/50 gap-6 overflow-x-auto custom-scrollbar pb-1">
                {(['overview', 'party', 'notes', 'npcs', 'locations', 'encounters'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-gold' : 'text-stone-400 hover:text-stone-300'
                            }`}
                    >
                        <span className="capitalize flex items-center gap-2">
                            {tab === 'overview' && <Map size={16} />}
                            {tab === 'party' && <Users size={16} />}
                            {tab === 'notes' && <BookOpen size={16} />}
                            {tab === 'npcs' && <Users size={16} className="text-arcane" />}
                            {tab === 'locations' && <Map size={16} className="text-green-500" />}
                            {tab === 'encounters' && <Swords size={16} />}
                            {tab}
                        </span>
                        {activeTab === tab && (
                            <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-gold rounded-t-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-5 shadow-[0_18px_40px_-24px_rgba(59,130,246,0.6)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300/80">Party</div>
                                        <div className="mt-2 text-3xl font-cinzel text-parchment">{partyCharacters.length}</div>
                                    </div>
                                    <Users size={22} className="text-blue-300" />
                                </div>
                                <div className="mt-3 text-sm text-stone-400">Average level {averageLevel}</div>
                            </div>

                            <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-5 shadow-[0_18px_40px_-24px_rgba(244,63,94,0.55)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300/80">Vitality</div>
                                        <div className="mt-2 text-3xl font-cinzel text-parchment">{totalPartyCurrentHp}<span className="text-base text-stone-500">/{totalPartyMaxHp}</span></div>
                                    </div>
                                    <Heart size={22} className="text-rose-300" />
                                </div>
                                <div className="mt-3 text-sm text-stone-400">Combined party health pool</div>
                            </div>

                            <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-5 shadow-[0_18px_40px_-24px_rgba(168,85,247,0.55)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/80">NPC Network</div>
                                        <div className="mt-2 text-3xl font-cinzel text-parchment">{campaign.npcs.length}</div>
                                    </div>
                                    <Sparkles size={22} className="text-violet-300" />
                                </div>
                                <div className="mt-3 text-sm text-stone-400">Tracked characters, allies, and monsters</div>
                            </div>

                            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-5 shadow-[0_18px_40px_-24px_rgba(16,185,129,0.55)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/80">World Atlas</div>
                                        <div className="mt-2 text-3xl font-cinzel text-parchment">{campaign.locations.length}</div>
                                    </div>
                                    <Map size={22} className="text-emerald-300" />
                                </div>
                                <div className="mt-3 text-sm text-stone-400">Logged locations and points of interest</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-stone-800/40 border border-stone-700/50 rounded-lg p-6">
                            <h3 className="text-xl font-cinzel text-parchment mb-4 flex items-center gap-2">
                                <Users size={20} className="text-blue-400" />
                                Party Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-stone-700/50">
                                    <span className="text-stone-400 text-sm">Active Members</span>
                                    <span className="text-parchment font-bold text-lg">{partyCharacters.length}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-stone-700/50">
                                    <span className="text-stone-400 text-sm">Average Level</span>
                                    <span className="text-parchment font-bold text-lg">{averageLevel}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-stone-700/50">
                                    <span className="text-stone-400 text-sm">Party Max HP</span>
                                    <span className="text-blood font-bold text-lg">{totalPartyMaxHp}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-stone-700/50">
                                    <span className="text-stone-400 text-sm">2024 Compliant</span>
                                    <span className="text-emerald-300 font-bold text-lg">{editionBreakdown['2024'] || 0}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-stone-700/50">
                                    <span className="text-stone-400 text-sm">2014 / Mixed</span>
                                    <span className="text-amber-300 font-bold text-lg">{(editionBreakdown['2014'] || 0) + (editionBreakdown['mixed'] || 0) + (editionBreakdown['unknown'] || 0)}</span>
                                </div>
                            </div>
                            <div className="mt-6 text-center">
                                <button onClick={() => setActiveTab('party')} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                                    Manage Party Members →
                                </button>
                            </div>
                        </div>

                        <div className="bg-stone-800/40 border border-stone-700/50 rounded-lg p-6">
                            <h3 className="text-xl font-cinzel text-parchment mb-4 flex items-center gap-2">
                                <BookOpen size={20} className="text-gold" />
                                Recent Logs
                            </h3>
                            {campaign.sessionNotes.length > 0 ? (
                                <div className="space-y-3">
                                    {campaign.sessionNotes.slice().reverse().slice(0, 3).map(note => (
                                        <div key={note.id} className="p-3 bg-stone-900/50 border border-stone-700 rounded cursor-pointer hover:border-gold/50 transition-colors" onClick={() => setActiveTab('notes')}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-parchment text-sm flex items-center gap-2">
                                                    Session {note.sessionNumber}: {note.title}
                                                </div>
                                                <div className="text-xs text-stone-500">
                                                    {new Date(note.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="text-sm text-stone-400 line-clamp-2">
                                                {note.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-32 flex flex-col items-center justify-center text-stone-500 border border-dashed border-stone-700 rounded">
                                    <p className="text-sm mb-2">No notes recorded yet.</p>
                                    <button onClick={() => { setActiveTab('notes'); setIsWritingNote(true); setNoteSessionNum(1); }} className="text-gold hover:text-yellow-400 text-sm font-medium">
                                        Write first log
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                )}

                {/* PARTY TAB */}
                {activeTab === 'party' && (
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-cinzel text-parchment">Active Members</h3>
                                <div className="text-sm text-stone-400">{partyCharacters.length} assigned</div>
                            </div>

                            {partyCharacters.length === 0 ? (
                                <div className="p-8 border border-dashed border-stone-700 rounded-lg text-center bg-stone-800/20">
                                    <p className="text-stone-400">No characters have been assigned to this campaign yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {partyCharacters.map(char => (
                                        <div key={char.id} className="relative group">
                                            <CharacterCard character={char} onClick={() => navigate(`/characters`)} onUpdateClick={() => navigate('/characters')} />
                                            <button
                                                onClick={() => removeCharacterFromCampaign(campaign.id, char.id)}
                                                className="absolute -top-2 -right-2 bg-red-900 text-parchment p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 border border-red-700/50 z-10"
                                                title="Remove from campaign"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {availableCharacters.length > 0 && (
                            <div className="pt-6 border-t border-stone-700/50 mt-8">
                                <h3 className="text-lg font-cinzel text-stone-400 mb-4">Available Characters</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {availableCharacters.map(char => (
                                        <div key={char.id} className="flex items-center justify-between p-3 bg-stone-800 border border-stone-700 rounded hover:border-stone-600 transition-colors">
                                            <div>
                                                <div className="font-bold text-parchment">{char.name}</div>
                                                <div className="text-xs text-stone-400">Lv.{char.level} {char.className}</div>
                                            </div>
                                            <button
                                                onClick={() => addCharacterToCampaign(campaign.id, char.id)}
                                                className="p-1.5 bg-stone-700 hover:bg-gold hover:text-stone-900 text-stone-300 rounded transition-colors"
                                                title="Add to campaign"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Notes List */}
                        <div className="lg:col-span-1 border-r border-stone-700/50 pr-6 space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => {
                                    setIsWritingNote(true);
                                    setNoteTitle('');
                                    setNoteContent('');
                                    setNoteSessionNum(campaign.sessionNotes.length > 0 ? Math.max(...campaign.sessionNotes.map(n => n.sessionNumber)) + 1 : 1);
                                }}
                                className={`w-full flex items-center justify-center gap-2 p-3 font-medium border border-dashed rounded transition-colors ${isWritingNote
                                    ? 'bg-stone-800 text-stone-400 border-stone-700'
                                    : 'bg-stone-800/50 hover:bg-stone-800 text-gold border-stone-600 hover:border-gold/50'
                                    }`}
                                disabled={isWritingNote}
                            >
                                <Plus size={16} /> New Session Note
                            </button>

                            {campaign.sessionNotes.slice().sort((a, b) => b.sessionNumber - a.sessionNumber).map(note => (
                                <div key={note.id} className="bg-stone-800/60 border border-stone-700 rounded overflow-hidden">
                                    <div className="p-3 border-b border-stone-700/50 bg-stone-800/80 flex justify-between items-center group">
                                        <div>
                                            <div className="text-xs text-stone-400 font-bold tracking-wider mb-0.5">Session {note.sessionNumber}</div>
                                            <div className="font-medium text-parchment leading-tight">{note.title}</div>
                                        </div>
                                        <button
                                            onClick={() => setConfirmAction({ type: 'deleteNote', data: note.id })}
                                            className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="p-3 text-sm text-stone-300 font-sans whitespace-pre-wrap">
                                        {note.content}
                                    </div>
                                    <div className="px-3 py-1.5 bg-stone-900/50 text-[10px] text-stone-500 uppercase flex justify-between">
                                        <span>Logged: {new Date(note.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Note Editor */}
                        <div className="lg:col-span-2">
                            {isWritingNote ? (
                                <div className="bg-stone-800/80 border border-gold/30 rounded-lg p-6 shadow-xl relative animate-in fade-in slide-in-from-right-4">
                                    <h3 className="text-xl font-cinzel text-parchment mb-4 flex items-center gap-2">
                                        <Edit2 size={20} className="text-gold" />
                                        Scribe New Entry
                                    </h3>
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Session #</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={noteSessionNum}
                                                onChange={e => setNoteSessionNum(parseInt(e.target.value) || 1)}
                                                className="w-full bg-obsidian border border-stone-700 rounded p-2 text-parchment font-mono focus:border-gold outline-none"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Title</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={noteTitle}
                                                onChange={e => setNoteTitle(e.target.value)}
                                                placeholder="e.g. The Goblin Ambush"
                                                className="w-full bg-obsidian border border-stone-700 rounded p-2 text-parchment focus:border-gold outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Log Content</label>
                                        <textarea
                                            value={noteContent}
                                            onChange={e => setNoteContent(e.target.value)}
                                            placeholder="Write down what happened... (Markdown supported eventually)"
                                            className="w-full h-[400px] bg-obsidian border border-stone-700 rounded p-4 text-parchment leading-relaxed resize-none focus:border-gold outline-none custom-scrollbar"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2 border-t border-stone-700/50 mt-4">
                                        <button onClick={() => setIsWritingNote(false)} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded transition-colors font-medium">Cancel</button>
                                        <button
                                            onClick={handleSaveNote}
                                            disabled={!noteTitle.trim() || !noteContent.trim()}
                                            className="px-6 py-2 bg-gold hover:bg-yellow-500 text-stone-900 font-bold rounded shadow-[0_0_10px_rgba(234,179,8,0.2)] hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:shadow-none transition-all"
                                        >
                                            Seal in the Archives
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-60">
                                    <BookOpen size={48} className="text-stone-600 mb-4" />
                                    <h3 className="font-cinzel text-xl text-parchment mb-2">The Tome is Closed</h3>
                                    <p className="text-stone-400">Select a note from the left to read, or scribe a new entry to record your campaign's history.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* NPCS TAB */}
                {activeTab === 'npcs' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <p className="text-stone-400">Track important characters your party has met across the realm.</p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowNpcImporter(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 rounded-md font-medium transition-colors shadow-sm text-sm"
                                >
                                    <Sparkles size={16} /> Import 5e.tools
                                </button>
                                <button
                                    onClick={() => setIsAddingNpc(!isAddingNpc)}
                                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-arcane border border-stone-600 rounded-md font-medium transition-colors shadow-sm text-sm"
                                >
                                    {isAddingNpc ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New NPC</>}
                                </button>
                            </div>
                        </div>

                        {isAddingNpc && (
                            <div className="bg-stone-900 border border-arcane/30 rounded-lg p-6 animate-in slide-in-from-top-4">
                                <h3 className="text-lg font-cinzel text-arcane mb-4">Record New NPC</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={npcForm.name}
                                            onChange={e => setNpcForm({ ...npcForm, name: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Role</label>
                                        <input
                                            type="text"
                                            value={npcForm.role}
                                            onChange={e => setNpcForm({ ...npcForm, role: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                            placeholder="Guide, villain, merchant..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Faction / Organization</label>
                                        <input
                                            type="text"
                                            value={npcForm.faction}
                                            onChange={e => setNpcForm({ ...npcForm, faction: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Known Location</label>
                                        <input
                                            type="text"
                                            value={npcForm.location}
                                            onChange={e => setNpcForm({ ...npcForm, location: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">AC</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={npcForm.armorClass}
                                            onChange={e => setNpcForm({ ...npcForm, armorClass: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">HP</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={npcForm.hitPoints}
                                            onChange={e => setNpcForm({ ...npcForm, hitPoints: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">CR</label>
                                        <input
                                            type="text"
                                            value={npcForm.challengeRating}
                                            onChange={e => setNpcForm({ ...npcForm, challengeRating: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Description / Notes</label>
                                    <textarea
                                        value={npcForm.description}
                                        onChange={e => setNpcForm({ ...npcForm, description: e.target.value })}
                                        className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-arcane outline-none h-24 custom-scrollbar resize-none"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddNpc}
                                        disabled={!npcForm.name.trim()}
                                        className="px-6 py-2 bg-arcane text-stone-950 font-bold rounded hover:bg-purple-500 transition-colors disabled:opacity-50"
                                    >
                                        Save NPC
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(campaign.npcs || []).map(npc => (
                                <div key={npc.id} className="bg-stone-800/80 border border-stone-700/50 rounded-lg p-5 relative group">
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete ${npc.name}?`)) {
                                                deleteNpc(campaign.id, npc.id);
                                            }
                                        }}
                                        className="absolute top-3 right-3 p-1.5 bg-red-900/40 text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 hover:text-white"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="pr-8">
                                        <h4 className="font-cinzel font-bold text-lg text-parchment mb-2">{npc.name}</h4>
                                        {npc.provenance && (
                                            <div className="mb-3">
                                                <ProvenanceBadge compact={true} origin={npc.provenance.origin} edition={npc.provenance.edition} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 mb-3 text-xs">
                                        {npc.role && <div className="text-stone-400"><span className="text-stone-500 uppercase tracking-wider">Role:</span> {npc.role}</div>}
                                        {npc.faction && <div className="text-stone-400"><span className="text-stone-500 uppercase tracking-wider">Faction:</span> {npc.faction}</div>}
                                        {npc.location && <div className="text-stone-400"><span className="text-stone-500 uppercase tracking-wider">Location:</span> {npc.location}</div>}
                                        {(npc.armorClass !== undefined || npc.hitPoints !== undefined || npc.challengeRating) && (
                                            <div className="flex flex-wrap gap-3 text-stone-400 pt-1">
                                                {npc.armorClass !== undefined && <span><span className="text-stone-500 uppercase tracking-wider">AC:</span> {npc.armorClass}</span>}
                                                {npc.hitPoints !== undefined && <span><span className="text-stone-500 uppercase tracking-wider">HP:</span> {npc.hitPoints}</span>}
                                                {npc.challengeRating && <span><span className="text-stone-500 uppercase tracking-wider">CR:</span> {npc.challengeRating}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">{npc.description}</p>
                                    {npc.provenance?.sourceSummary && (
                                        <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-stone-500">
                                            {npc.provenance.sourceSummary}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {(!campaign.npcs || campaign.npcs.length === 0) && !isAddingNpc && (
                            <div className="text-center py-10 border border-dashed border-stone-700 rounded-lg text-stone-500">
                                No NPCs logged. Are your players truly alone in the world?
                            </div>
                        )}
                    </div>
                )}

                {/* LOCATIONS TAB */}
                {activeTab === 'locations' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <p className="text-stone-400">Log important settlements, dungeons, and points of interest.</p>
                            <button
                                onClick={() => setIsAddingLocation(!isAddingLocation)}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-green-500 border border-stone-600 rounded-md font-medium transition-colors shadow-sm text-sm"
                            >
                                {isAddingLocation ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Location</>}
                            </button>
                        </div>

                        {isAddingLocation && (
                            <div className="bg-stone-900 border border-green-500/30 rounded-lg p-6 animate-in slide-in-from-top-4">
                                <h3 className="text-lg font-cinzel text-green-500 mb-4">Chart New Location</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={locForm.name}
                                            onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Region / Kingdom</label>
                                        <input
                                            type="text"
                                            value={locForm.region}
                                            onChange={e => setLocForm({ ...locForm, region: e.target.value })}
                                            className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-green-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Description / Notes</label>
                                    <textarea
                                        value={locForm.description}
                                        onChange={e => setLocForm({ ...locForm, description: e.target.value })}
                                        className="w-full bg-stone-800 border-stone-700 rounded p-2 text-parchment focus:border-green-500 outline-none h-24 custom-scrollbar resize-none"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddLocation}
                                        disabled={!locForm.name.trim()}
                                        className="px-6 py-2 bg-green-600 text-stone-950 font-bold rounded hover:bg-green-500 transition-colors disabled:opacity-50"
                                    >
                                        Save Location
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(campaign.locations || []).map(loc => (
                                <div key={loc.id} className="bg-stone-800/80 border border-stone-700/50 rounded-lg p-5 relative group">
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete ${loc.name}?`)) {
                                                deleteLocation(campaign.id, loc.id);
                                            }
                                        }}
                                        className="absolute top-3 right-3 p-1.5 bg-red-900/40 text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 hover:text-white"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex items-center gap-2 mb-2 pr-8">
                                        <Map size={18} className="text-green-500" />
                                        <h4 className="font-cinzel font-bold text-lg text-parchment">{loc.name}</h4>
                                    </div>
                                    <div className="space-y-1 mb-3 text-xs">
                                        {loc.region && <div className="text-stone-400"><span className="text-stone-500 uppercase tracking-wider">Region:</span> {loc.region}</div>}
                                    </div>
                                    <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">{loc.description}</p>
                                </div>
                            ))}
                        </div>
                        {(!campaign.locations || campaign.locations.length === 0) && !isAddingLocation && (
                            <div className="text-center py-10 border border-dashed border-stone-700 rounded-lg text-stone-500">
                                No locations charted. The map is blank.
                            </div>
                        )}
                    </div>
                )}

                {/* ENCOUNTERS TAB */}
                {activeTab === 'encounters' && (
                    <div className="space-y-4">
                        <p className="text-stone-400 mb-4">Saved encounters and templates created while this campaign was active.</p>
                        <EncounterLibrary campaignId={campaign.id} />
                    </div>
                )}
            </div>

            {showNpcImporter && (
                <FiveEToolsModal
                    isOpen={showNpcImporter}
                    onClose={() => setShowNpcImporter(false)}
                    initialCategory="Monsters"
                    fixedCategory={true}
                    onImport={(item) => {
                        setShowNpcImporter(false);
                        handleImportNpc(item);
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmAction?.type === 'rest'}
                title="Trigger Long Rest?"
                message="Are you sure you want to trigger a Long Rest for the entire party? This will restore all HP, half their Hit Dice, and all Spell Slots, while advancing in-game time by 8 hours."
                confirmText="Rest Party"
                onConfirm={() => {
                    advanceTime(campaign.id, 8 * 60);
                    longRestParty(campaign.partyIds);
                    setConfirmAction(null);
                    addToast('The party has completed a Long Rest.', 'info');
                }}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmationModal
                isOpen={confirmAction?.type === 'deleteNote'}
                title="Burn these pages?"
                message="Are you sure you want to delete this session note? This action cannot be undone."
                confirmText="Delete Note"
                isDangerous={true}
                onConfirm={() => {
                    if (confirmAction?.data) {
                        deleteSessionNote(campaign.id, confirmAction.data);
                        addToast('Session Note burnt.', 'success');
                    }
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />

        </div>
    );
}
