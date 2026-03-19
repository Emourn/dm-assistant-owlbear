import { useState, useEffect } from 'react';
import { Search, Loader2, Plus, ExternalLink, X, BookOpen, Sparkles, Sword, Skull, Users, ChevronDown, GraduationCap, Bug, Package, Link } from 'lucide-react';
import { searchSpells, searchFeats, searchItems, searchConditions, searchRaces, searchClasses, searchMonsters, searchBackgrounds, searchSubclasses, fetchCustomUrl, parseHomebrew } from '../../engine/fiveEToolsParser';
import { fetchHomebrewCatalog, HomebrewPack } from '../../engine/homebrewCatalog';

export type Category = 'Spells' | 'Feats' | 'Items' | 'Conditions' | 'Races' | 'Classes' | 'Monsters' | 'Backgrounds' | 'Subclasses';

interface FiveEToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (item: any, category: Category) => void;
    initialCategory?: Category;
    fixedCategory?: boolean;
    classNameForSubclass?: string; // Needed for subclass lookup
    classNameFilter?: string;      // Filter spells by class
    levelFilter?: number;          // Initial level filter
}

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
    { id: 'Spells', label: 'Spells', icon: BookOpen },
    { id: 'Feats', label: 'Feats', icon: Sparkles },
    { id: 'Items', label: 'Items', icon: Sword },
    { id: 'Conditions', label: 'Conditions', icon: Skull },
    { id: 'Races', label: 'Races', icon: Users },
    { id: 'Classes', label: 'Classes', icon: GraduationCap },
    { id: 'Backgrounds', label: 'Backgrounds', icon: Users },
    { id: 'Subclasses', label: 'Subclasses', icon: GraduationCap },
    { id: 'Monsters', label: 'Monsters', icon: Bug },
];

export function FiveEToolsModal({
    isOpen,
    onClose,
    onImport,
    initialCategory = 'Spells',
    fixedCategory = false,
    classNameForSubclass,
    classNameFilter,
    levelFilter: initialLevelFilter
}: FiveEToolsModalProps) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<Category>(initialCategory);
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [searchMode, setSearchMode] = useState<'official' | 'homebrew'>('official');
    const [homebrewUrl, setHomebrewUrl] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<number | 'all'>(initialLevelFilter !== undefined ? initialLevelFilter : 'all');

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Homebrew catalog states
    const [catalogPacks, setCatalogPacks] = useState<HomebrewPack[]>([]);
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);
    const [selectedPack, setSelectedPack] = useState<HomebrewPack | null>(null);
    const [catalogFilter, setCatalogFilter] = useState('');

    // reset selected index on results change
    useEffect(() => {
        setSelectedIndex(0);
        setExpandedId(null);
    }, [results]);

    // keyboard nav
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || results.length === 0) return;

            const isInputFocused = document.activeElement?.tagName === 'INPUT';

            if (e.key === 'ArrowDown') {
                if (isInputFocused) e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                if (isInputFocused) e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
                if (isInputFocused) return; // Let form submit handle it
                e.preventDefault();
                const item = results[selectedIndex];
                if (item) {
                    onImport(item, category);
                    onClose();
                }
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (isInputFocused) return; // Let user move text cursor
                e.preventDefault();
                const item = results[selectedIndex];
                if (item) {
                    const itemId = item.id || item.name;
                    if (expandedId === itemId) setExpandedId(null);
                    else setExpandedId(itemId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, category, onImport, onClose, expandedId]);

    useEffect(() => {
        if (isOpen) {
            if (initialCategory) setCategory(initialCategory);
        } else {
            setQuery('');
            setResults([]);
            setError('');
            setSelectedPack(null);
            setCatalogPacks([]);
            setCatalogFilter('');
        }
    }, [isOpen, initialCategory]);

    // Auto-load catalog when switching to homebrew mode or changing category
    useEffect(() => {
        if (searchMode === 'homebrew' && isOpen) {
            setIsCatalogLoading(true);
            setSelectedPack(null);
            setResults([]);
            setCatalogFilter('');
            fetchHomebrewCatalog(category).then(packs => {
                setCatalogPacks(packs);
                setIsCatalogLoading(false);
            });
        }
    }, [searchMode, category, isOpen]);

    const handleSearch = async (e?: React.FormEvent, forceShowAll: boolean = false) => {
        if (e) e.preventDefault();

        const activeQuery = forceShowAll ? '' : query;

        if (searchMode === 'official' && !activeQuery.trim() && !forceShowAll) return;
        if (searchMode === 'homebrew' && !selectedPack && !homebrewUrl.trim()) {
            setError('Select a community pack or paste a custom URL.');
            return;
        }

        setIsSearching(true);
        setError('');
        try {
            let data: any[] = [];

            if (searchMode === 'homebrew') {
                const url = selectedPack ? selectedPack.url : homebrewUrl.trim();
                const rawData = await fetchCustomUrl(url);
                data = parseHomebrew(rawData, activeQuery, category);
            } else {
                switch (category) {
                    case 'Spells':
                        data = await searchSpells(activeQuery, {
                            className: classNameFilter,
                            level: selectedLevel === 'all' ? undefined : selectedLevel
                        });
                        break;
                    case 'Feats': data = await searchFeats(activeQuery); break;
                    case 'Items': data = await searchItems(activeQuery); break;
                    case 'Conditions': data = await searchConditions(activeQuery); break;
                    case 'Races': data = await searchRaces(activeQuery); break;
                    case 'Classes': data = await searchClasses(activeQuery); break;
                    case 'Backgrounds': data = await searchBackgrounds(activeQuery); break;
                    case 'Subclasses':
                        if (classNameForSubclass) {
                            data = await searchSubclasses(classNameForSubclass);
                            // Filter by activeQuery since searchSubclasses gets all for a class
                            if (activeQuery) {
                                data = data.filter((sc: any) => sc.name.toLowerCase().includes(activeQuery.toLowerCase()));
                            }
                        } else {
                            setError('A Class must be selected first to search for Subclasses.');
                            setIsSearching(false);
                            return;
                        }
                        break;
                    case 'Monsters': data = await searchMonsters(activeQuery); break;
                }
            }
            setResults(data);

            if (data.length === 0) {
                if (searchMode === 'homebrew') {
                    setError(`No ${category.toLowerCase()} found in that homebrew pack matching your filter.`);
                } else {
                    setError(`No ${category.toLowerCase()} found in 5e.tools database for that name.`);
                }
            }
        } catch (err) {
            console.error('5e.tools search error:', err);
            setError('Failed to reach 5e.tools database. Are you connected to the internet?');
        } finally {
            setIsSearching(false);
        }
    };

    const renderResultMeta = (item: any) => {
        if (category === 'Spells') {
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    <span><strong className="text-stone-400 font-medium">Time:</strong> {item.castingTime}</span>
                    <span><strong className="text-stone-400 font-medium">Range:</strong> {item.range}</span>
                    <span><strong className="text-stone-400 font-medium">Duration:</strong> {item.duration} {item.concentration && '(C)'}</span>
                </div>
            );
        }
        if (category === 'Feats') {
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    {item.abilityScoreBonuses && (
                        <span><strong className="text-gold font-medium">Stat Bonuses:</strong> {Object.keys(item.abilityScoreBonuses).join(', ').toUpperCase()}</span>
                    )}
                </div>
            );
        }
        if (category === 'Items') {
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    <span className="capitalize"><strong className="text-stone-400 font-medium">Type:</strong> {item.type}</span>
                    <span><strong className="text-stone-400 font-medium">Weight:</strong> {item.weight} lb</span>
                </div>
            );
        }
        if (category === 'Races') {
            const speedStr = typeof item.speed === 'object' ? (item.speed?.walk || 30) : (item.speed || 30);
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    <span><strong className="text-stone-400 font-medium">Speed:</strong> {speedStr} ft.</span>
                </div>
            );
        }
        if (category === 'Classes') {
            const hdStr = item.hitDice || (item.hd ? `1d${item.hd.faces}` : 'Unknown');
            const savesStr = Array.isArray(item.saves) ? item.saves.join(', ') : item.saves;
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    <span><strong className="text-stone-400 font-medium">Hit Dice:</strong> {hdStr}</span>
                    {savesStr && <span><strong className="text-stone-400 font-medium">Saves:</strong> {savesStr}</span>}
                    {item.armorProficiencies && <span><strong className="text-stone-400 font-medium">Armor:</strong> {item.armorProficiencies}</span>}
                    {item.weaponProficiencies && <span><strong className="text-stone-400 font-medium">Weapons:</strong> {item.weaponProficiencies}</span>}
                </div>
            );
        }
        if (category === 'Backgrounds') {
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    {item.skillProficiencies && <span><strong className="text-stone-400 font-medium">Skills:</strong> Includes choices</span>}
                    {item.startingEquipment && <span><strong className="text-stone-400 font-medium">Equipment:</strong> Included</span>}
                </div>
            );
        }
        if (category === 'Subclasses') {
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    <span><strong className="text-stone-400 font-medium">Class:</strong> {item.className}</span>
                    <span><strong className="text-stone-400 font-medium">Short Name:</strong> {item.shortName}</span>
                </div>
            );
        }
        if (category === 'Monsters') {
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                    <span className="capitalize"><strong className="text-stone-400 font-medium">Type:</strong> {item.type}</span>
                    <span><strong className="text-stone-400 font-medium">CR:</strong> {item.cr}</span>
                    <span><strong className="text-stone-400 font-medium">AC:</strong> {item.ac}</span>
                    <span><strong className="text-stone-400 font-medium">HP:</strong> {item.hp}</span>
                </div>
            );
        }
        return null;
    };

    const getPrimaryLabel = (item: any) => {
        if (category === 'Spells') return `Level ${item.level === 0 ? 'Cantrip' : item.level} ${item.school}`;
        return item.source || '5e.tools';
    };

    if (!isOpen) return null;

    const CurrentIcon = CATEGORIES.find(c => c.id === category)?.icon || Search;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-stone-700 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-arcane/20 text-arcane rounded">
                            <CurrentIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-cinzel font-bold text-parchment leading-none">5e Database Search</h2>
                            <p className="text-xs text-parchment-muted mt-1">Import directly from 5e.tools</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-stone-500 hover:text-parchment transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Mode Toggle */}
                <div className="flex border-b border-stone-800 bg-stone-950">
                    <button
                        onClick={() => { setSearchMode('official'); setResults([]); setError(''); }}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${searchMode === 'official' ? 'text-parchment border-b-2 border-arcane bg-stone-900' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        Official 5e.tools
                    </button>
                    <button
                        onClick={() => { setSearchMode('homebrew'); setResults([]); setError(''); }}
                        className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${searchMode === 'homebrew' ? 'text-teal-400 border-b-2 border-teal-500 bg-stone-900' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        <Package size={14} /> Community Homebrew
                    </button>
                </div>

                {/* Search Bar & Category Select */}
                <div className="p-4 border-b border-stone-800 bg-stone-950/20 space-y-3">
                    {searchMode === 'homebrew' && (
                        <div className="space-y-2">
                            {/* Pack Browser */}
                            {isCatalogLoading ? (
                                <div className="flex items-center gap-2 text-teal-400 text-xs py-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    Loading {category.toLowerCase()} packs...
                                </div>
                            ) : catalogPacks.length > 0 ? (
                                <div>
                                    <label className="block text-[10px] text-teal-500 font-bold mb-1 uppercase tracking-wider">Select a Homebrew Pack ({catalogPacks.length} available)</label>
                                    <input
                                        type="text"
                                        placeholder="Filter packs..."
                                        value={catalogFilter}
                                        onChange={e => setCatalogFilter(e.target.value)}
                                        className="w-full bg-stone-950 border border-stone-700 text-parchment rounded-md py-1.5 px-3 focus:ring-1 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-xs mb-2"
                                    />
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar border border-stone-800 rounded-md bg-stone-950">
                                        {catalogPacks
                                            .filter(p => !catalogFilter || p.title.toLowerCase().includes(catalogFilter.toLowerCase()) || p.author.toLowerCase().includes(catalogFilter.toLowerCase()))
                                            .map(pack => (
                                                <button
                                                    key={pack.filename}
                                                    onClick={() => { setSelectedPack(pack); setResults([]); setError(''); }}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors border-b border-stone-800/50
                                                    ${selectedPack?.filename === pack.filename ? 'bg-teal-900/30 text-teal-300' : 'text-stone-400 hover:bg-stone-800/50 hover:text-parchment'}
                                                `}
                                                >
                                                    <span className="truncate flex-1 font-medium">{pack.title}</span>
                                                    <span className="text-[10px] text-stone-600 ml-2 flex-shrink-0">by {pack.author}</span>
                                                </button>
                                            ))}
                                    </div>
                                    {selectedPack && (
                                        <div className="mt-1 text-[10px] text-teal-400 flex items-center gap-1">
                                            <Package size={10} /> Selected: <strong>{selectedPack.title}</strong> by {selectedPack.author}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-stone-500 text-xs italic py-2">No community packs found for {category}.</div>
                            )}

                            {/* Custom URL fallback */}
                            <details className="text-stone-500">
                                <summary className="text-[10px] cursor-pointer hover:text-teal-400 transition-colors flex items-center gap-1 pt-1">
                                    <Link size={10} /> Or paste a direct JSON URL
                                </summary>
                                <input
                                    type="url"
                                    value={homebrewUrl}
                                    onChange={(e) => { setHomebrewUrl(e.target.value); setSelectedPack(null); }}
                                    placeholder="https://raw.githubusercontent.com/.../homebrew.json"
                                    className="w-full bg-stone-950 border border-stone-700 text-parchment rounded-md py-1.5 px-3 focus:ring-1 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-xs mt-1"
                                />
                            </details>
                        </div>
                    )}
                    <form onSubmit={handleSearch} className="flex gap-3">
                        {!fixedCategory && (
                            <div className="relative flex-shrink-0">
                                <select
                                    value={category}
                                    onChange={(e) => {
                                        setCategory(e.target.value as Category);
                                        setResults([]);
                                        setError('');
                                    }}
                                    className={`appearance-none bg-stone-900 border border-stone-700 text-stone-300 rounded-md py-2.5 pl-4 pr-10 focus:ring-1 focus:outline-none transition-colors text-sm h-full cursor-pointer
                                        ${searchMode === 'homebrew' ? 'focus:ring-teal-500 focus:border-teal-500' : 'focus:ring-arcane focus:border-arcane'}
                                    `}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                            </div>
                        )}
                        <div className="relative flex-1 flex gap-2">
                            {category === 'Spells' && (
                                <div className="relative flex-shrink-0">
                                    <select
                                        value={selectedLevel}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedLevel(val === 'all' ? 'all' : parseInt(val));
                                        }}
                                        className="appearance-none bg-stone-900 border border-stone-700 text-stone-300 rounded-md py-2.5 pl-3 pr-8 focus:ring-1 focus:ring-arcane focus:border-arcane focus:outline-none transition-colors text-sm h-full cursor-pointer"
                                    >
                                        <option value="all">All Levels</option>
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                                            <option key={lvl} value={lvl}>{lvl === 0 ? 'Cantrip' : `Level ${lvl}`}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                                </div>
                            )}
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-stone-500">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={searchMode === 'homebrew' ? `Filter ${category.toLowerCase()} in pack... (optional)` : `Search ${category.toLowerCase()}...`}
                                    className={`w-full bg-stone-950 border border-stone-700 text-parchment rounded-md py-2.5 pl-9 pr-24 focus:ring-1 focus:outline-none transition-colors text-sm
                                        ${searchMode === 'homebrew' ? 'focus:ring-teal-500 focus:border-teal-500' : 'focus:ring-arcane focus:border-arcane'}
                                    `}
                                    autoFocus={searchMode === 'official'}
                                />
                                <div className="absolute right-1 top-1 bottom-1 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSearch(undefined, true)}
                                        disabled={isSearching || (searchMode === 'homebrew' && !selectedPack && !homebrewUrl.trim())}
                                        className={`disabled:opacity-50 px-3 rounded text-xs font-medium transition-colors
                                            ${searchMode === 'homebrew' ? 'bg-teal-900/50 text-teal-300 hover:bg-teal-800' : 'bg-stone-800/50 text-stone-300 hover:bg-stone-700'}
                                        `}
                                        title={`Show all ${category.toLowerCase()}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSearching || (searchMode === 'official' && !query.trim()) || (searchMode === 'homebrew' && !selectedPack && !homebrewUrl.trim())}
                                        className={`disabled:opacity-50 text-parchment px-4 rounded font-medium text-xs transition-colors
                                            ${searchMode === 'homebrew' ? 'bg-teal-900 hover:bg-teal-800' : 'bg-stone-800 hover:bg-stone-700'}
                                        `}
                                    >
                                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Results Area */}
                <div className="p-0 overflow-y-auto flex-1 custom-scrollbar relative">
                    {error && (
                        <div className="p-8 text-center text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {isSearching ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="animate-pulse flex flex-col gap-2 p-4 border-l-2 border-transparent">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 bg-stone-800 rounded w-1/3"></div>
                                        <div className="h-4 bg-stone-800 rounded w-16"></div>
                                    </div>
                                    <div className="h-3 bg-stone-800/50 rounded w-1/2 mt-2"></div>
                                    <div className="h-3 bg-stone-800/50 rounded w-3/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 && (
                        <div>
                            <div className="sticky top-0 z-10 px-4 py-2 bg-stone-900 border-b border-stone-800 text-xs text-stone-400 flex items-center justify-between shadow-sm">
                                <span>Found <strong className="text-parchment">{results.length}</strong> results</span>
                                <span className="flex items-center gap-1"><CurrentIcon size={12} /> {category} <span className="ml-2 text-[10px] opacity-70 border border-stone-700 px-1 rounded bg-stone-800">Use ↑↓ to navigate</span></span>
                            </div>
                            <div className="divide-y divide-stone-800/50">
                                {results.map((item, idx) => {
                                    const itemId = item.id || item.name;
                                    const isSelected = idx === selectedIndex;
                                    const isExpanded = expandedId === itemId;

                                    return (
                                        <div
                                            key={itemId}
                                            className={`p-4 transition-colors flex flex-col gap-2 cursor-pointer border-l-2
                                                ${isSelected ? 'bg-stone-800/50 border-arcane' : 'hover:bg-stone-800/30 border-transparent'}
                                            `}
                                            onClick={() => setExpandedId(isExpanded ? null : itemId)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-cinzel font-bold text-gold truncate">{item.name}</h4>
                                                        {item.is2024 && (
                                                            <span className="text-[10px] bg-gold/20 text-gold-light px-1.5 py-0.5 rounded border border-gold/40 flex items-center gap-1 shadow-[0_0_8px_rgba(212,175,55,0.2)] whitespace-nowrap">
                                                                <Sparkles size={10} /> 2024
                                                            </span>
                                                        )}
                                                        {!item.isHomebrew && item.is2024 === false && (
                                                            <span className="text-[10px] bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded border border-sky-400/30 whitespace-nowrap">
                                                                2014
                                                            </span>
                                                        )}
                                                        {item.isHomebrew ? (
                                                            <span className="text-[10px] bg-teal-900/30 text-teal-400 px-1.5 py-0.5 rounded border border-teal-800 truncate max-w-[150px]" title={`Source: ${item.homebrewSource}`}>
                                                                HB: {item.homebrewSource}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded border border-stone-700">
                                                                {getPrimaryLabel(item)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {renderResultMeta(item)}

                                                    {!isExpanded && item.description && (
                                                        <p className="text-xs text-stone-400 line-clamp-2 mt-1">
                                                            {item.description.substring(0, 150)}{item.description.length > 150 ? '...' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onImport(item, category);
                                                        onClose();
                                                    }}
                                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-arcane/20 hover:bg-arcane/30 text-arcane-light border border-arcane/30 rounded text-xs font-medium transition-colors"
                                                >
                                                    <Plus size={14} /> Import
                                                </button>
                                            </div>

                                            {isExpanded && item.description && (
                                                <div className="mt-2 text-sm text-stone-300 border-t border-stone-800/50 pt-3 whitespace-pre-wrap animate-in slide-in-from-top-2">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {results.length === 0 && !isSearching && !error && (
                        <div className="p-12 text-center opacity-50 flex flex-col items-center">
                            <ExternalLink size={32} className="text-stone-600 mb-3" />
                            <p className="text-sm text-parchment">Search for {category.toLowerCase()} directly from 5e.tools.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
