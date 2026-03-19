import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAltKey } from '../../hooks/useAltKey';
import { Info, Shield, Sparkles, Swords, Gem, HeartPulse, Loader2, BookOpen } from 'lucide-react';
import { useNavigatorStore } from '../../store/navigatorStore';
import {
    searchMonsters,
    searchSpells,
    searchItems,
    lookupByName,
    flattenEntries,
    searchAdventureLore
} from '../../engine/fiveEToolsParser';
import { EntityStatBlock } from '../../types/campaignNavigator';

export type EntityCategory = 'monster' | 'spell' | 'item' | 'condition' | 'npc' | 'location' | 'lore';

export interface EntityLinkProps {
    text: string;           // The text to display
    lookupKey: string;      // The exact 5e.tools or internal key (e.g. "Longsword", "Fireball")
    category: EntityCategory;
}

const CATEGORY_COLORS: Record<EntityCategory, string> = {
    monster: 'text-red-400 border-red-500/30 hover:border-red-400/80 hover:bg-red-500/10',
    spell: 'text-purple-400 border-purple-500/30 hover:border-purple-400/80 hover:bg-purple-500/10',
    item: 'text-amber-400 border-amber-500/30 hover:border-amber-400/80 hover:bg-amber-500/10',
    condition: 'text-teal-400 border-teal-500/30 hover:border-teal-400/80 hover:bg-teal-500/10',
    npc: 'text-blue-400 border-blue-500/30 hover:border-blue-400/80 hover:bg-blue-500/10',
    location: 'text-emerald-400 border-emerald-500/30 hover:border-emerald-400/80 hover:bg-emerald-500/10',
    lore: 'text-cyan-400 border-cyan-500/30 hover:border-cyan-400/80 hover:bg-cyan-500/10'
};

const CATEGORY_ICONS: Record<EntityCategory, any> = {
    monster: Swords,
    spell: Sparkles,
    item: Gem,
    condition: HeartPulse,
    npc: BookOpen,
    location: Shield,
    lore: Info
};

export function EntityLink({ text, lookupKey, category }: EntityLinkProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isTooltipHovered, setIsTooltipHovered] = useState(false);
    const elementRef = useRef<HTMLSpanElement | null>(null);
    const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
    const altPressed = useAltKey();
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { enrichmentCache, cacheEntity } = useNavigatorStore();
    const cachedEntity = enrichmentCache[lookupKey];
    const [isLoading, setIsLoading] = useState(false);
    const fetchAttemptedRef = useRef(false);

    // Determine if the tooltip should be visible:
    // - Normal hover: show while mouse is over the span only
    // - Alt mode: show while mouse is over span OR tooltip (persists for interaction)
    const shouldShowTooltip = isHovered || (altPressed && isTooltipHovered);

    // Reset isTooltipHovered when Alt is released or tooltip is hidden
    // This prevents stale state from leaking (tooltip unmounts → onMouseLeave never fires)
    useEffect(() => {
        if (!altPressed) {
            setIsTooltipHovered(false);
        }
    }, [altPressed]);

    useEffect(() => {
        if (!shouldShowTooltip) {
            setIsTooltipHovered(false);
        }
    }, [shouldShowTooltip]);

    // Debounced hide — gives the user time to move from span to tooltip
    const scheduleHide = useCallback(() => {
        hideTimerRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 150); // 150ms grace period
    }, []);

    const cancelHide = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    // Update tooltip position on scroll/resize
    useEffect(() => {
        if (!shouldShowTooltip || !elementRef.current) return;
        const updateRect = () => {
            if (elementRef.current) {
                setHoverRect(elementRef.current.getBoundingClientRect());
            }
        };
        updateRect();
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [shouldShowTooltip]);

    // Fetch data if needed — triggers on hover or alt press
    useEffect(() => {
        if (!shouldShowTooltip) return;
        if (cachedEntity) return;
        if (fetchAttemptedRef.current) return;

        // Synchronous check for local adventure lore — PRIORITY 1
        const localLore = searchAdventureLore(lookupKey);
        if (localLore) {
            cacheEntity(lookupKey, {
                id: lookupKey,
                name: localLore.name,
                type: category as any,
                lookupKey,
                description: localLore.description,
                statBlock: undefined
            });
            return;
        }

        fetchAttemptedRef.current = true;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                let description = '';
                let statBlock: EntityStatBlock | undefined;

                if (category === 'monster') {
                    // Search bestiary for monsters
                    const monsters = await searchMonsters(lookupKey);
                    if (monsters.length > 0) {
                        const m = monsters.find(x => x.name.toLowerCase() === lookupKey.toLowerCase()) || monsters[0];

                        if (m.entries) description = flattenEntries(m.entries);
                        else if (m.fluff && m.fluff.entries) description = flattenEntries(m.fluff.entries);
                        else description = `A creature of type ${m.type?.type || m.type || 'unknown'}.`;

                        statBlock = {
                            ac: typeof m.ac[0] === 'number' ? m.ac[0] : (m.ac[0]?.ac || m.ac),
                            hp: typeof m.hp?.average === 'number' ? `${m.hp.average} (${m.hp.formula})` : m.hp?.special,
                            cr: typeof m.cr === 'string' ? m.cr : (m.cr?.cr || '?'),
                            type: typeof m.type === 'string' ? m.type : m.type?.type,
                            abilities: `STR ${m.str} DEX ${m.dex} CON ${m.con} INT ${m.int} WIS ${m.wis} CHA ${m.cha}`
                        };
                    }
                } else if (category === 'spell') {
                    // Search spells database
                    const spells = await searchSpells(lookupKey);
                    if (spells.length > 0) {
                        const s = spells.find(x => x.name.toLowerCase() === lookupKey.toLowerCase()) || spells[0];
                        description = s.description;
                    }
                } else if (category === 'item') {
                    // Search items database DIRECTLY — don't go through lookupByName
                    const items = await searchItems(lookupKey);
                    if (items.length > 0) {
                        const match = items.find(i => i.name.toLowerCase() === lookupKey.toLowerCase()) || items[0];
                        description = match.description || '';
                        // Build a pseudo stat block for weapons/armor
                        if (match.damage || match.acBonus) {
                            const parts: string[] = [];
                            if (match.damage) parts.push(`Damage: ${match.damage}`);
                            if (match.acBonus) parts.push(`AC: ${match.acBonus}`);
                            if (match.weight) parts.push(`Weight: ${match.weight} lb.`);
                            if (description) description += '\n\n';
                            description += parts.join(' | ');
                        }
                        if (!description && match.type) {
                            description = `A ${match.type} item. Weight: ${match.weight || 0} lb.`;
                        }
                    }
                } else if (category === 'npc') {
                    // NPCs: first try lookupByName (lore, rules), then fall back to bestiary
                    const res = await lookupByName(lookupKey);
                    if (res) {
                        description = res.description;
                    } else {
                        // Many named NPCs (Strahd, etc.) are in the bestiary
                        const monsters = await searchMonsters(lookupKey);
                        if (monsters.length > 0) {
                            const m = monsters.find(x => x.name.toLowerCase() === lookupKey.toLowerCase()) || monsters[0];
                            if (m.entries) description = flattenEntries(m.entries);
                            else if (m.fluff && m.fluff.entries) description = flattenEntries(m.fluff.entries);
                            else description = `A creature of type ${m.type?.type || m.type || 'unknown'}.`;
                            statBlock = {
                                ac: typeof m.ac?.[0] === 'number' ? m.ac[0] : (m.ac?.[0]?.ac || '?'),
                                hp: typeof m.hp?.average === 'number' ? `${m.hp.average} (${m.hp.formula})` : m.hp?.special || '?',
                                cr: typeof m.cr === 'string' ? m.cr : (m.cr?.cr || '?'),
                                type: typeof m.type === 'string' ? m.type : m.type?.type,
                                abilities: `STR ${m.str} DEX ${m.dex} CON ${m.con} INT ${m.int} WIS ${m.wis} CHA ${m.cha}`
                            };
                        }
                    }
                } else {
                    // Conditions, locations, lore — generic lookup
                    const res = await lookupByName(lookupKey);
                    if (res) description = res.description;
                }

                // Cache the result — even if empty, to prevent re-fetching
                cacheEntity(lookupKey, {
                    id: lookupKey,
                    name: lookupKey,
                    type: category as any,
                    lookupKey,
                    description: description || `No specific data found for ${lookupKey} in the archives.`,
                    statBlock
                });
            } catch (err) {
                console.error(`[EntityLink] Failed to fetch data for "${lookupKey}":`, err);
                // Cache the error so we don't keep retrying
                cacheEntity(lookupKey, {
                    id: lookupKey,
                    name: lookupKey,
                    type: category as any,
                    lookupKey,
                    description: `Failed to retrieve data for ${lookupKey}. Check your connection.`,
                    statBlock: undefined
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [shouldShowTooltip, lookupKey, category, cachedEntity, cacheEntity]);

    const Icon = CATEGORY_ICONS[category];

    const description = cachedEntity?.description || (isLoading ? 'Fetching lore...' : `No specific data found for ${lookupKey} in the archives.`);

    return (
        <>
            <span
                ref={elementRef}
                onMouseEnter={() => {
                    cancelHide();
                    setIsHovered(true);
                }}
                onMouseLeave={() => {
                    // When Alt is held, give a small grace period to move to the tooltip
                    // When Alt is NOT held, hide immediately
                    if (altPressed) {
                        scheduleHide();
                    } else {
                        setIsHovered(false);
                        setIsTooltipHovered(false);
                    }
                }}
                className={`
                    relative inline-block cursor-help transition-colors
                    border-b border-dashed font-semibold px-0.5 rounded-sm
                    ${CATEGORY_COLORS[category]}
                `}
            >
                {text}
            </span>

            {/* Tooltip Portal */}
            {shouldShowTooltip && hoverRect && createPortal(
                <div
                    onMouseEnter={() => {
                        cancelHide();
                        setIsTooltipHovered(true);
                        setIsHovered(false); // The mouse is on the tooltip, not the text span anymore
                    }}
                    onMouseLeave={() => {
                        setIsTooltipHovered(false);
                    }}
                    className={`
                        fixed z-[99999] p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]
                        bg-stone-950/95 backdrop-blur-xl border border-stone-700/50
                        w-80 max-h-[400px] overflow-y-auto custom-scrollbar
                        animate-in fade-in zoom-in-95 duration-200
                        ${altPressed ? 'pointer-events-auto' : 'pointer-events-none'}
                    `}
                    style={{
                        left: `${Math.max(10, Math.min(window.innerWidth - 330, hoverRect.left + hoverRect.width / 2 - 160))}px`,
                        top: hoverRect.top < 420 ? `${hoverRect.bottom + 10}px` : `${hoverRect.top - 10}px`,
                        transform: hoverRect.top < 420 ? 'none' : 'translateY(-100%)'
                    }}
                >
                    <div className="flex items-start gap-3 mb-3 border-b border-stone-800 pb-3">
                        <div className={`p-2 rounded-lg bg-stone-900 border border-stone-800 ${CATEGORY_COLORS[category].split(' ')[0]}`}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <h4 className="font-cinzel font-bold text-stone-200 text-base tracking-wide leading-tight">
                                {cachedEntity?.name || lookupKey}
                            </h4>
                            <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                                {category} Reference
                            </span>
                        </div>
                    </div>

                    <div className="text-sm text-stone-300 leading-relaxed font-serif">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-stone-500 italic pb-2">
                                <Loader2 size={14} className="animate-spin" />
                                Indexing ancient tomes...
                            </div>
                        ) : (
                            <div className={altPressed ? "" : "line-clamp-6"}>
                                {description}
                            </div>
                        )}
                    </div>

                    {altPressed ? (
                        <div className="mt-4 pt-3 border-t border-stone-800 flex justify-between items-center">
                            <span className="text-[10px] text-stone-500 italic">Scrolling enabled</span>
                            {cachedEntity?.statBlock ? (
                                <div className="text-[11px] text-amber-500 font-bold bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                                    AC {cachedEntity.statBlock.ac} | HP {cachedEntity.statBlock.hp} | CR {cachedEntity.statBlock.cr}
                                </div>
                            ) : (
                                <span className="text-xs text-stone-600 italic">No combat statistics</span>
                            )}
                        </div>
                    ) : (
                        <div className="mt-4 pt-3 border-t border-stone-800 text-[10px] text-stone-500 italic flex items-center justify-center gap-2">
                            <Info size={12} className="text-stone-600" />
                            Hold [ALT] to interact & scroll
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
