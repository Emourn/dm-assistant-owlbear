import { NavLink } from 'react-router-dom';
import { Home, Users, Swords, Tent, BookOpen, Map, Keyboard, BookOpenText, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RulesSearchModal } from '../common/RulesSearchModal';
import { ShortcutsModal } from '../common/ShortcutsModal';

export function Sidebar() {
    const [isRulesOpen, setIsRulesOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

    // Global Ctrl+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsRulesOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const navItems = [
        { to: '/', icon: Home, label: 'Dashboard' },
        { to: '/campaigns', icon: Map, label: 'Campaigns' },
        { to: '/characters', icon: Users, label: 'Characters' },
        { to: '/combat', icon: Swords, label: 'Combat' },
        { to: '/camp', icon: Tent, label: 'Camp' },
        { to: '/navigator', icon: BookOpenText, label: 'Navigator' },
        { to: '/lobby', icon: Radio, label: 'Multiplayer' },
    ];

    return (
        <aside className="w-64 bg-sidebar border-r border-stone-800 flex flex-col relative">
            <div className="absolute inset-0 bg-stone-950/40 pointer-events-none" /> {/* Darken texture */}

            <div className="h-16 flex items-center px-6 border-b border-stone-800 relative z-10 bg-obsidian/60 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-gold">
                    <div className="p-1.5 bg-obsidian-light rounded shadow-inner border border-stone-700/50">
                        <Swords size={20} className="text-gold" />
                    </div>
                    <h1 className="font-cinzel font-bold text-xl tracking-wider drop-shadow-sm">DM Assistant</h1>
                </div>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-2 relative z-10">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${isActive
                                ? 'bg-stone-800 text-gold border border-gold/30 shadow-[0_0_15px_rgba(217,119,6,0.1)]'
                                : 'text-stone-400 hover:bg-stone-800/80 hover:text-parchment hover-glow-gold'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}

                {/* Rules Quick Search */}
                <button
                    type="button"
                    onClick={() => setIsRulesOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 text-stone-400 hover:bg-stone-800/80 hover:text-parchment mt-4 border border-dashed border-stone-700/50 hover:border-gold/30 hover-glow-gold"
                >
                    <BookOpen size={20} />
                    <span className="font-medium flex-1 text-left">Rules</span>
                    <kbd className="text-[10px] text-stone-600 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5">Ctrl+K</kbd>
                </button>
            </nav>

            <div className="p-4 border-t border-stone-700/50 flex items-center justify-between">
                <div className="text-xs text-stone-500 font-cinzel tracking-widest">
                    V1.0 • 5E
                </div>
                <button
                    onClick={() => setIsShortcutsOpen(true)}
                    className="p-1.5 text-stone-500 hover:text-gold hover:bg-stone-800 rounded transition-colors"
                    title="Keyboard Shortcuts"
                >
                    <Keyboard size={16} />
                </button>
            </div>

            <RulesSearchModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
            <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        </aside>
    );
}
