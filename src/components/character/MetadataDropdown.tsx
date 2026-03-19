import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export interface DropdownOption {
    name: string;
    source: string;
    is2024: boolean;
    shortName?: string;
}

interface MetadataDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder: string;
    label?: string;
    disabled?: boolean;
    onSearchClick?: () => void;
}

export const MetadataDropdown: React.FC<MetadataDropdownProps> = ({
    value, onChange, options, placeholder, label, disabled, onSearchClick
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter options based on query. Keep it snappy by limiting to 50 results.
    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync external value changes into the search query when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery(value || '');
        }
    }, [value, isOpen]);

    return (
        <div ref={wrapperRef} className="flex-1 min-w-[120px] relative">
            {label && (
                <label className="block text-[10px] font-bold text-arcane/70 tracking-widest uppercase mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    disabled={disabled}
                    className="w-full bg-transparent border-b border-arcane/30 pb-1 text-sm text-gold font-medium focus:outline-none focus:border-gold/60 transition-colors uppercase tracking-wider pr-6 disabled:opacity-50"
                    value={isOpen ? searchQuery : (value || '')}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                        // Allow free-form typing, but the magic happens when they click a specific option
                        onChange(e.target.value);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchQuery(value || '');
                    }}
                    placeholder={placeholder}
                    title={value || placeholder}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    disabled={disabled}
                    className="absolute right-0 bottom-1.5 text-arcane/50 hover:text-gold transition-colors outline-none disabled:opacity-50"
                    onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-64 flex flex-col bg-gray-900 border border-arcane/30 rounded shadow-xl overflow-hidden shadow-black/50">
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-arcane/50">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <button
                                    type="button"
                                    key={`${opt.name}-${idx}`}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-arcane/20 transition-colors flex items-center justify-between group border-b border-white/5 last:border-0"
                                    onClick={() => {
                                        onChange(opt.name); // Send selection up
                                        setSearchQuery(opt.name);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span
                                        className="text-gray-200 group-hover:text-gold transition-colors truncate"
                                        title={opt.name}
                                    >
                                        {opt.name}
                                    </span>
                                    {opt.is2024 ? (
                                        <span className="text-[9px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded border border-gold/30 shrink-0 ml-2 shadow-[0_0_5px_rgba(212,175,55,0.4)]">
                                            2024
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider shrink-0 ml-2">
                                            {opt.source}
                                        </span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-3 text-sm text-gray-500 italic text-center">No matches found</div>
                        )}
                    </div>

                    {onSearchClick && (
                        <div className="bg-gray-950 border-t border-arcane/30 p-1 shrink-0">
                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-arcane-light hover:text-gold hover:bg-arcane/20 rounded transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsOpen(false);
                                    onSearchClick();
                                }}
                            >
                                <Search className="w-3.5 h-3.5" />
                                <span>Search 5e.tools & Homebrew...</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
