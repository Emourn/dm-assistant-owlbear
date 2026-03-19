import { useState, useEffect } from 'react';
import { Feature } from '../../types/character';
import { getFeatureChoices, checkPrerequisites } from '../../engine/fiveEToolsParser';
import { X, Search, CheckCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    featureTitle: string;
    choiceType: string;
    classNameContext?: string;
    existingFeatures?: Feature[];
    characterLevel?: number;
    characterFeatures?: Feature[];
    characterSpells?: any[];
    characterLanguages?: string;
    characterSkills?: { name: string, proficient: boolean }[];
    maxChoices?: number;
    onSelect: (chosenFeatures: Feature[]) => void;
    onClose: () => void;
}

export function FeatureChoiceModal({
    isOpen,
    featureTitle,
    choiceType,
    classNameContext,
    existingFeatures = [],
    characterLevel = 1,
    characterFeatures = [],
    characterSpells = [],
    characterLanguages = '',
    characterSkills = [],
    maxChoices = 1,
    onSelect,
    onClose
}: Props) {
    const [choices, setChoices] = useState<Feature[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        getFeatureChoices(choiceType, classNameContext).then(data => {
            setChoices(data);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load choices:', err);
            setLoading(false);
        });
    }, [isOpen, choiceType, classNameContext]);

    if (!isOpen) return null;

    const filteredOptions = choices.filter(c => {
        // Exclude options the character already has, unless they explicitly allow duplicates (rare in 5e).
        // For example, "Elemental Adept" can be taken multiple times, but 99% of things cannot.
        const alreadyHas = existingFeatures.some(ef => ef.name.toLowerCase() === c.name.toLowerCase());
        const allowsMultiple = c.name.toLowerCase().includes('elemental adept');

        if (alreadyHas && !allowsMultiple) return false;

        // Language filtering
        if (choiceType === 'language') {
            const knownLangs = characterLanguages.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (knownLangs.includes(c.name.toLowerCase())) return false;
        }

        // Skill filtering
        if (choiceType === 'skill') {
            const isKnown = characterSkills.some(s => s.name.toLowerCase() === c.name.toLowerCase() && s.proficient);
            if (isKnown) return false;
        }

        // Apply 5e.tools prerequisites
        if (c.prerequisite) {
            const meetsPrereqs = checkPrerequisites(c.prerequisite, {
                level: characterLevel,
                className: classNameContext,
                features: characterFeatures,
                spells: characterSpells as any
            });
            if (!meetsPrereqs) return false;
        }

        return c.name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-gold/30 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/50">
                    <div>
                        <h2 className="text-xl font-cinzel font-bold text-gold">Choose: {featureTitle}</h2>
                        <p className="text-xs text-stone-400 font-sans tracking-wide">
                            Your class features grant you a choice. Select one option below to add it to your character sheet.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-stone-800 bg-stone-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                        <input
                            type="text"
                            placeholder="Filter options..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-stone-950/50 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-sm text-parchment focus:border-gold/50 focus:ring-1 focus:ring-gold/50 focus:outline-none transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-stone-500 space-y-4">
                            <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                            <span className="font-cinzel tracking-wider text-sm">Consulting the Tomes...</span>
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="text-center py-12 text-stone-500 font-cinzel">
                            No options found. Try refining your search.
                        </div>
                    ) : (
                        filteredOptions.map((opt) => {
                            const isSelected = selectedIds.has(opt.id);
                            return (
                                <div
                                    key={opt.id}
                                    className={`group border rounded-lg p-4 transition-all cursor-pointer ${isSelected
                                        ? 'bg-gold/10 border-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                                        : 'bg-stone-950/30 border-stone-800 hover:border-gold/30 hover:bg-stone-900/50'
                                        }`}
                                    onClick={() => {
                                        const newSelected = new Set(selectedIds);
                                        if (isSelected) {
                                            newSelected.delete(opt.id);
                                        } else {
                                            if (maxChoices === 1) {
                                                onSelect([opt]);
                                                onClose();
                                                return;
                                            }
                                            if (newSelected.size < maxChoices) {
                                                newSelected.add(opt.id);
                                            }
                                        }
                                        setSelectedIds(newSelected);
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`font-bold font-cinzel ${isSelected ? 'text-gold-light' : 'text-gold'}`}>{opt.name}</h3>
                                        <div className={`flex items-center gap-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {isSelected ? (
                                                <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 bg-gold text-stone-900 rounded flex items-center gap-1">
                                                    <CheckCircle size={12} /> Selected
                                                </span>
                                            ) : (
                                                <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 bg-stone-800 text-stone-300 rounded hover:bg-gold hover:text-stone-900 transition-colors flex items-center gap-1">
                                                    Select
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-sm text-stone-400 max-w-none">
                                        <p className="whitespace-pre-wrap leading-relaxed">{opt.description}</p>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600 bg-stone-950 px-2 py-0.5 rounded">
                                            Source: {opt.source5eTools}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer for multiple choices */}
                {maxChoices > 1 && (
                    <div className="p-4 border-t border-stone-800 bg-stone-950/50 flex items-center justify-between">
                        <div className="text-sm">
                            <span className="text-stone-500">Selected: </span>
                            <span className={selectedIds.size === maxChoices ? 'text-gold font-bold' : 'text-parchment'}>
                                {selectedIds.size} / {maxChoices}
                            </span>
                        </div>
                        <button
                            disabled={selectedIds.size !== maxChoices}
                            onClick={() => {
                                const finalOptions = choices.filter(c => selectedIds.has(c.id));
                                onSelect(finalOptions);
                                onClose();
                            }}
                            className="px-6 py-2 bg-gold disabled:bg-stone-800 disabled:text-stone-600 text-stone-900 font-bold font-cinzel rounded-lg shadow-lg hover:bg-gold-light transition-all disabled:shadow-none"
                        >
                            Confirm Selection
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
