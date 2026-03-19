import { useState } from 'react';
import { Map, Plus, Trash2, Calendar, Users, X } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../components/common/ToastProvider';

export function Campaigns() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const addCampaign = useCampaignStore((state) => state.addCampaign);
    const deleteCampaign = useCampaignStore((state) => state.deleteCampaign);
    const setActiveCampaign = useCampaignStore((state) => state.setActiveCampaign);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const { addToast } = useToast();

    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        addCampaign({
            title: newTitle.trim(),
            description: newDesc.trim(),
            partyIds: [],
            npcs: [],
            locations: [],
            timeTracking: {
                currentDay: 1,
                currentHour: 8,
                currentMinute: 0,
                calendarSystem: 'generic'
            }
        });

        setNewTitle('');
        setNewDesc('');
        setIsCreating(false);
        addToast(`Campaign '${newTitle.trim()}' created successfully!`, 'success');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
            <header className="flex items-center justify-between border-b border-stone-700/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-800 rounded-md shadow-inner border border-stone-700/50">
                        <Map size={24} className="text-gold" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-cinzel font-bold text-parchment">Campaigns</h1>
                        <p className="text-sm text-parchment-muted">Manage your distinct adventures</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-gold border border-stone-600 rounded-md font-medium transition-colors shadow-sm text-sm"
                >
                    <Plus size={16} /> New Campaign
                </button>
            </header>

            {isCreating && (
                <div className="bg-stone-900 border border-gold/30 rounded-lg p-6 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-cinzel text-parchment">Start a New Campaign</h2>
                        <button onClick={() => setIsCreating(false)} className="text-stone-500 hover:text-stone-300">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-1">Campaign Title</label>
                            <input
                                autoFocus
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="w-full bg-stone-800 border-stone-700 rounded-md shadow-sm focus:border-gold focus:ring-1 focus:ring-gold text-parchment px-3 py-2 border"
                                placeholder="e.g. Curse of Strahd"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-1">Description</label>
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="w-full h-24 bg-stone-800 border-stone-700 rounded-md shadow-sm focus:border-gold focus:ring-1 focus:ring-gold text-parchment px-3 py-2 border custom-scrollbar resize-none"
                                placeholder="A brief summary of the adventure..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-stone-400 hover:text-stone-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newTitle.trim()}
                                className="px-4 py-2 bg-gold text-stone-900 font-bold rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Campaign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {campaigns.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                    <Map size={48} className="text-stone-600 mb-4" />
                    <h3 className="font-cinzel text-xl text-parchment mb-2">No campaigns found</h3>
                    <p className="text-parchment-muted max-w-md">
                        Your world is empty. Create a new campaign to start organizing your characters and notes.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {campaigns.map((camp) => (
                        <div
                            key={camp.id}
                            className={`bg-stone-800/80 border rounded-lg p-5 flex flex-col hover:bg-stone-800 transition-colors cursor-pointer group shadow-md ${activeCampaignId === camp.id ? 'border-gold shadow-gold/10' : 'border-stone-700/50 hover:border-stone-500'
                                }`}
                            onClick={() => navigate(`/campaigns/${camp.id}`)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-cinzel font-bold text-xl text-parchment truncate" title={camp.title}>
                                    {camp.title}
                                </h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(camp.id);
                                    }}
                                    className="p-1 text-stone-600 hover:bg-red-900/30 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <p className="text-stone-400 text-sm line-clamp-2 mb-4 flex-1">
                                {camp.description || <span className="italic opacity-50">No description...</span>}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-stone-500 mb-4">
                                <span className="flex items-center gap-1.5" title="Party Size">
                                    <Users size={14} /> {camp.partyIds.length} PCs
                                </span>
                                <span className="flex items-center gap-1.5" title="Sessions Logged">
                                    <Calendar size={14} /> {camp.sessionNotes.length} Sessions
                                </span>
                            </div>

                            <div className="border-t border-stone-700/50 pt-3 flex items-center justify-between">
                                {activeCampaignId === camp.id ? (
                                    <span className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                        Active Campaign
                                    </span>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveCampaign(camp.id);
                                        }}
                                        className="text-stone-400 hover:text-gold text-xs font-bold uppercase tracking-wider transition-colors z-10"
                                    >
                                        Set as Active
                                    </button>
                                )}
                                <span className="text-gold text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteConfirmId !== null}
                title="Shatter this World?"
                message="Are you sure you want to delete this campaign? All session notes, NPCs, and locations will be lost. Characters will remain in your roster."
                confirmText="Shatter World"
                isDangerous={true}
                onConfirm={() => {
                    if (deleteConfirmId) {
                        const camp = campaigns.find(c => c.id === deleteConfirmId);
                        deleteCampaign(deleteConfirmId);
                        addToast(`Campaign '${camp?.title}' was shattered.`, 'success');
                    }
                    setDeleteConfirmId(null);
                }}
                onCancel={() => setDeleteConfirmId(null)}
            />
        </div>
    );
}
