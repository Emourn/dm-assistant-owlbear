import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, BookOpen, Sparkles, Swords, Shield, Skull, ScrollText, Star } from 'lucide-react';
import { lookupByName, searchSpells, searchConditions, searchFeats, searchItems } from '../../engine/fiveEToolsParser';

interface RulesResult {
    name: string;
    category: string;
    description: string;
    source?: string;
    // Original data from parser
    originalData?: any;
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string }> = {
    'Rule': { icon: BookOpen, color: 'text-parchment' },
    'Spell': { icon: Sparkles, color: 'text-arcane-light' },
    'Condition': { icon: Skull, color: 'text-blood' },
    'Feat': { icon: Star, color: 'text-gold' },
    'Item': { icon: Shield, color: 'text-veil' },
    'Action': { icon: Swords, color: 'text-blood-light' },
    'Other': { icon: ScrollText, color: 'text-stone-400' },
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    category?: 'spells' | 'items' | 'feats' | 'conditions' | 'all';
    onSelect?: (item: any) => void;
}

export function RulesSearchModal({ isOpen, onClose, title, category = 'all', onSelect }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RulesResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<number | null>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setResults([]);
            setExpandedIdx(null);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        const allResults: RulesResult[] = [];

        try {
            // 1. Local rules lookup
            if (category === 'all') {
                const localResult = await lookupByName(searchQuery);
                if (localResult) {
                    allResults.push({
                        name: localResult.name,
                        category: 'Rule',
                        description: localResult.description,
                        source: localResult.source,
                        originalData: localResult
                    });
                }
            }

            // 2. Conditions
            if (category === 'all' || category === 'conditions') {
                const conditions = await searchConditions(searchQuery);
                for (const c of conditions.slice(0, 10)) {
                    if (!allResults.some(r => r.name.toLowerCase() === c.name.toLowerCase())) {
                        allResults.push({
                            name: c.name,
                            category: 'Condition',
                            description: c.description || 'No description available.',
                            source: c.source,
                            originalData: c
                        });
                    }
                }
            }

            // 3. Spells
            if (category === 'all' || category === 'spells') {
                const spells = await searchSpells(searchQuery);
                for (const s of spells.slice(0, 10)) {
                    if (!allResults.some(r => r.name.toLowerCase() === s.name.toLowerCase())) {
                        allResults.push({
                            name: s.name,
                            category: 'Spell',
                            description: `**Level ${s.level} ${s.school}** | ${s.castingTime} | ${s.range} | ${s.duration}${s.concentration ? ' (C)' : ''}\n\n${s.description}`,
                            source: 'PHB',
                            originalData: s
                        });
                    }
                }
            }

            // 4. Feats
            if (category === 'all' || category === 'feats') {
                const feats = await searchFeats(searchQuery);
                for (const f of feats.slice(0, 10)) {
                    if (!allResults.some(r => r.name.toLowerCase() === f.name.toLowerCase())) {
                        allResults.push({
                            name: f.name,
                            category: 'Feat',
                            description: f.description,
                            source: f.source5eTools,
                            originalData: f
                        });
                    }
                }
            }

            // 5. Items
            if (category === 'all' || category === 'items') {
                const items = await searchItems(searchQuery);
                for (const i of items.slice(0, 10)) {
                    if (!allResults.some(r => r.name.toLowerCase() === i.name.toLowerCase())) {
                        allResults.push({
                            name: i.name,
                            category: 'Item',
                            description: i.description || 'No description available.',
                            originalData: i
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Rules search error:', e);
        }

        setResults(allResults);
        setIsLoading(false);
    }, [category]);

    const handleQueryChange = (val: string) => {
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => performSearch(val), 400);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div
                className="relative w-full max-w-2xl bg-modal border border-stone-700/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-stone-950/60 pointer-events-none" />

                {/* Search Bar */}
                <div className="flex items-center gap-3 p-4 border-b border-stone-800 bg-obsidian/40 backdrop-blur-sm relative z-10">
                    <Search size={20} className="text-stone-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        placeholder={title || "Search rules, spells, feats..."}
                        className="flex-1 bg-transparent text-parchment text-lg placeholder-stone-600 outline-none"
                    />
                    <kbd className="hidden md:inline-flex items-center gap-1 text-xs text-stone-600 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5">ESC</kbd>
                    <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded text-stone-500 hover:text-parchment transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar relative z-10">
                    {isLoading && (
                        <div className="p-6 text-center text-stone-500 animate-pulse">
                            <BookOpen size={24} className="mx-auto mb-2 opacity-50" />
                            <span className="font-cinzel tracking-wider">Scouring the Tomes...</span>
                        </div>
                    )}

                    {!isLoading && query.length >= 2 && results.length === 0 && (
                        <div className="p-6 text-center text-stone-500">
                            No rules found for "<span className="text-parchment font-cinzel">{query}</span>"
                        </div>
                    )}

                    {!isLoading && results.map((result, idx) => {
                        const config = CATEGORY_CONFIG[result.category] || CATEGORY_CONFIG['Other'];
                        const Icon = config.icon;
                        const isExpanded = expandedIdx === idx;

                        return (
                            <div
                                key={idx}
                                className="border-b border-stone-800/50 last:border-0 cursor-pointer hover:bg-stone-800/40 transition-colors"
                            >
                                <div className="flex items-center gap-3 px-4 py-3" onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
                                    <Icon size={16} className={config.color} />
                                    <span className="font-cinzel text-parchment font-bold">{result.name}</span>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${config.color} bg-stone-800`}>
                                        {result.category}
                                    </span>
                                    {result.source && (
                                        <span className="ml-auto text-[10px] text-stone-600">{result.source}</span>
                                    )}
                                    {onSelect && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelect(result.originalData); }}
                                            className="ml-4 px-2 py-0.5 bg-stone-700 hover:bg-gold hover:text-stone-950 text-gold text-[10px] font-bold rounded transition-colors"
                                        >
                                            SELECT
                                        </button>
                                    )}
                                </div>
                                {isExpanded && (
                                    <div className="px-4 pb-4 text-sm text-stone-400 whitespace-pre-wrap leading-relaxed border-t border-stone-800/50 pt-3 mx-4 animate-in fade-in duration-150">
                                        {result.description}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!isLoading && query.length < 2 && (
                        <div className="p-8 text-center text-stone-600 space-y-3 opacity-60">
                            <BookOpen size={32} className="mx-auto text-stone-700" />
                            <p className="font-cinzel text-sm tracking-wider">Type at least 2 characters to search</p>
                            <p className="text-xs text-stone-700">Rules · Spells · Conditions · Feats · Items</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-stone-800 text-[10px] text-stone-500 flex justify-between bg-obsidian-dark/80 backdrop-blur-sm relative z-10">
                    <span>Powered by 5e.tools</span>
                    <span>Press <kbd className="bg-stone-800 px-1 rounded">↑↓</kbd> to navigate · <kbd className="bg-stone-800 px-1 rounded">Enter</kbd> to expand</span>
                </div>
            </div>
        </div>
    );
}
