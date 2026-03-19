/**
 * DM Session Panel — Multiplayer management UI
 *
 * Floating panel visible only to the DM during a multiplayer session.
 * Shows: room code, LAN join URL, connected players, character assignment,
 *        sheet-edit toggle, kick, active map push, and end session.
 *
 * NEW: Chat tab — DM can see and send all player dice rolls and messages.
 */

import { useState, useEffect, useRef } from 'react';
import {
    Users, Copy, Check, UserX, Lock, Unlock,
    Wifi, WifiOff, Loader, X, UserPlus, Radio,
    Eye, EyeOff, Link, MessageCircle, Send, Dice1,
} from 'lucide-react';
import { useSessionStore } from '../../multiplayer/sessionStore';
import { useCharacterStore } from '../../store/characterStore';
import type { PlayerInfo, ChatMessage } from '../../multiplayer/types';
import { stopSync } from '../../multiplayer/syncMiddleware';
import { setBroadcastBlackout } from '../../multiplayer/mapBroadcast';
import { fetchMultiplayerJson } from '../../multiplayer/serverConfig';

// ── LAN URL hook ──────────────────────────────────────────────
function useLanIps() {
    const [lanIps, setLanIps] = useState<string[]>([]);

    useEffect(() => {
        fetchMultiplayerJson<{ lanIps: string[]; port: number }>('/api/network-info')
            .then((data: { lanIps: string[]; port: number }) => {
                const port = import.meta.env.DEV ? 5173 : data.port;
                setLanIps(data.lanIps.map((ip) => `http://${ip}:${port}/lobby`));
            })
            .catch(() => {/* server may not be ready yet — silent fail */});
    }, []);

    return lanIps;
}

// ── Dice helpers (shared with PlayerDiceChat) ─────────────────
function rollDice(sides: number, count: number = 1): { total: number; rolls: number[] } {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return { total: rolls.reduce((a, b) => a + b, 0), rolls };
}

function parseCustomRoll(input: string): { total: number; description: string } | null {
    const match = input.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) return null;
    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || '0', 10);
    if (count < 1 || count > 100 || sides < 1 || sides > 1000) return null;
    const { total, rolls } = rollDice(sides, count);
    const modifiedTotal = total + modifier;
    const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
    const rollsStr = rolls.length <= 10 ? ` [${rolls.join(', ')}]` : '';
    return {
        total: modifiedTotal,
        description: `${count}d${sides}${modStr}${rollsStr} = **${modifiedTotal}**`,
    };
}

function formatTimestamp(ts: number): string {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;

// ── Chat Panel ────────────────────────────────────────────────
function DMChatPanel() {
    const [message, setMessage] = useState('');
    const [chatTab, setChatTab] = useState<'dice' | 'chat'>('dice');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { chatMessages, sendChatMessage, sendDiceRoll } = useSessionStore();

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleQuickRoll = (sides: number) => {
        const { total, rolls } = rollDice(sides);
        const rollStr = rolls.length <= 10 ? ` [${rolls.join(', ')}]` : '';
        sendDiceRoll(`🎲 DM rolled 1d${sides}`, `1d${sides}${rollStr} = **${total}**`);
    };

    const handleSend = () => {
        const text = message.trim();
        if (!text) return;
        const rollResult = parseCustomRoll(text);
        if (rollResult) {
            sendDiceRoll(`🎲 DM rolled ${text}`, rollResult.description);
        } else {
            sendChatMessage(text);
        }
        setMessage('');
    };

    const renderMessage = (msg: ChatMessage) => {
        const isDM = msg.senderRole === 'dm';
        const isRoll = msg.isRoll;
        const isWhisper = msg.isWhisper;

        return (
            <div
                key={msg.id}
                className={`px-3 py-2 rounded-lg text-sm ${
                    isWhisper
                        ? 'bg-purple-900/30 border border-purple-700/30'
                        : isRoll
                        ? 'bg-amber-900/20 border border-amber-700/20'
                        : isDM
                        ? 'bg-stone-800/80'
                        : 'bg-stone-800/40'
                }`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-xs ${isDM ? 'text-amber-400' : 'text-blue-400'}`}>
                        {msg.senderName}
                    </span>
                    {isWhisper && (
                        <span className="text-purple-400 text-[10px] uppercase tracking-wider">whisper</span>
                    )}
                    <span className="text-stone-600 text-[10px] ml-auto">
                        {formatTimestamp(msg.timestamp)}
                    </span>
                </div>
                <div className="text-stone-300">
                    {isRoll && msg.rollResult ? (
                        <div>
                            <span className="text-stone-400">{msg.text}</span>
                            <div
                                className="text-amber-300 font-mono mt-1"
                                dangerouslySetInnerHTML={{
                                    __html: msg.rollResult.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-200 text-lg">$1</strong>'),
                                }}
                            />
                        </div>
                    ) : (
                        msg.text
                    )}
                </div>
            </div>
        );
    };

    const filtered = chatMessages.filter((msg) => chatTab === 'chat' || msg.isRoll);

    return (
        <div className="flex flex-col">
            {/* Sub-tabs: Dice / Chat */}
            <div className="flex border-b border-stone-800 mx-4">
                <button
                    onClick={() => setChatTab('dice')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                        chatTab === 'dice'
                            ? 'text-amber-300 border-b-2 border-amber-400'
                            : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                    <Dice1 className="w-3.5 h-3.5" /> Dice
                </button>
                <button
                    onClick={() => setChatTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                        chatTab === 'chat'
                            ? 'text-blue-300 border-b-2 border-blue-400'
                            : 'text-stone-500 hover:text-stone-300'
                    }`}
                >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                    {chatMessages.filter((m) => !m.isRoll).length > 0 && (
                        <span className="bg-blue-600/40 text-blue-300 text-[10px] px-1.5 rounded-full ml-0.5">
                            {chatMessages.filter((m) => !m.isRoll).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Quick dice buttons (dice sub-tab only) */}
            {chatTab === 'dice' && (
                <div className="px-4 py-3 border-b border-stone-800">
                    <div className="grid grid-cols-4 gap-1.5">
                        {DICE_TYPES.map((sides) => (
                            <button
                                key={sides}
                                onClick={() => handleQuickRoll(sides)}
                                className="bg-stone-800 hover:bg-stone-700 border border-stone-600/50
                                           text-stone-200 rounded-lg py-2 text-xs font-mono
                                           transition-all hover:scale-105 hover:border-amber-500/50 active:scale-95"
                            >
                                d{sides}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                const { rolls } = rollDice(20, 2);
                                const max = Math.max(...rolls);
                                sendDiceRoll('🎲 DM rolled 2d20 (Adv)', `[${rolls.join(', ')}] → **${max}**`);
                            }}
                            className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-600/30
                                       text-emerald-300 rounded-lg py-2 text-[10px] font-medium
                                       transition-all hover:scale-105 active:scale-95"
                        >
                            ADV
                        </button>
                    </div>
                </div>
            )}

            {/* Message log */}
            <div className="overflow-y-auto max-h-48 p-3 space-y-1.5">
                {filtered.length === 0 ? (
                    <div className="py-4 text-center text-stone-600 text-xs">
                        {chatTab === 'dice' ? 'No rolls yet 🎲' : 'No messages yet'}
                    </div>
                ) : (
                    <>
                        {filtered.map(renderMessage)}
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="px-4 pb-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={chatTab === 'dice' ? '2d6+3, d20…' : 'Message players…'}
                        className="flex-1 bg-stone-800 border border-stone-600/50 rounded-lg px-3 py-1.5
                                   text-stone-200 text-xs placeholder-stone-500
                                   focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!message.trim()}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30
                                   text-white rounded-lg px-3 transition-colors"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Session Panel ────────────────────────────────────────

type PanelTab = 'session' | 'chat';

export function SessionPanel() {
    const {
        isMultiplayer, connectionStatus, room, role, chatMessages, presentation,
        leaveSession, assignCharacter, togglePlayerEdit, kickPlayer,
    } = useSessionStore();

    const characters = useCharacterStore((s) => s.characters);

    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [showPanel, setShowPanel] = useState(false);
    const [activeTab, setActiveTab] = useState<PanelTab>('session');
    const [unreadChat, setUnreadChat] = useState(0);
    const prevChatCount = useRef(0);
    const lanIps = useLanIps();

    // Track unread chat badges when panel is closed or on session tab
    useEffect(() => {
        const newCount = chatMessages.length;
        if (newCount > prevChatCount.current) {
            const diff = newCount - prevChatCount.current;
            if (!showPanel || activeTab !== 'chat') {
                setUnreadChat((n) => n + diff);
            }
        }
        prevChatCount.current = newCount;
    }, [chatMessages.length, showPanel, activeTab]);

    // Clear badge when chat tab is opened
    useEffect(() => {
        if (showPanel && activeTab === 'chat') {
            setUnreadChat(0);
        }
    }, [showPanel, activeTab]);

    if (!isMultiplayer || role !== 'dm') return null;

    const players = room?.players.filter((p) => p.role === 'player') ?? [];
    const roomCode = room?.code ?? '—';

    // ── Handlers ─────────────────────────────────────────────

    const copyText = async (text: string, onDone: () => void) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const el = document.createElement('input');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        onDone();
    };

    const handleCopyCode = () => {
        copyText(roomCode, () => {
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        });
    };

    const handleCopyUrl = (url: string) => {
        copyText(url, () => {
            setCopiedUrl(url);
            setTimeout(() => setCopiedUrl(null), 2000);
        });
    };

    const handleEndSession = () => {
        if (confirm('End the multiplayer session? All players will be disconnected.')) {
            stopSync();
            leaveSession();
        }
    };

    const isBlackout = presentation?.mode === 'blackout';
    const liveSourceLabel = presentation?.mode === 'combat'
        ? 'Combat encounter'
        : presentation?.mode === 'navigator'
        ? 'Navigator scene'
        : presentation?.mode === 'legacy'
        ? 'Manual fallback'
        : presentation?.mode === 'blackout'
        ? 'Blackout'
        : 'Waiting for a scene';

    // ── Render ───────────────────────────────────────────────

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5
                           rounded-full shadow-xl transition-all border ${
                    connectionStatus === 'connected'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-600'
                }`}
                title="Multiplayer Session"
            >
                <Radio className="w-4 h-4" />
                <span className="text-sm font-semibold">
                    {players.length} online
                </span>
                {connectionStatus === 'connected' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                )}
                {/* Unread chat badge */}
                {unreadChat > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadChat > 9 ? '9+' : unreadChat}
                    </span>
                )}
            </button>

            {/* Panel */}
            {showPanel && (
                <div className="fixed bottom-16 right-4 z-50 w-[22rem] bg-stone-900 border border-stone-700
                               rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                    {/* ── Header ──────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3 bg-stone-800/70 border-b border-stone-700/50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-stone-200">Session Control</span>
                        </div>
                        <button onClick={() => setShowPanel(false)} className="text-stone-500 hover:text-stone-300">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ── Tabs ────────────────────────────────── */}
                    <div className="flex border-b border-stone-800 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('session')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                                activeTab === 'session'
                                    ? 'text-amber-300 border-b-2 border-amber-400 bg-stone-800/40'
                                    : 'text-stone-500 hover:text-stone-300'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" /> Session
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors relative ${
                                activeTab === 'chat'
                                    ? 'text-blue-300 border-b-2 border-blue-400 bg-stone-800/40'
                                    : 'text-stone-500 hover:text-stone-300'
                            }`}
                        >
                            <MessageCircle className="w-3.5 h-3.5" /> Chat & Dice
                            {unreadChat > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
                                    {unreadChat}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── Tab Content ─────────────────────────── */}
                    {activeTab === 'session' ? (
                        /* Session tab — scrollable */
                        <div className="overflow-y-auto flex-1">

                            {/* ── Room Code ───────────────────── */}
                            <div className="px-4 py-3 border-b border-stone-800">
                                <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1.5">Room Code</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-mono font-bold text-amber-300 tracking-widest">
                                        {roomCode}
                                    </span>
                                    <button
                                        onClick={handleCopyCode}
                                        className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                                        title="Copy room code"
                                    >
                                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Connection status */}
                                <div className="flex items-center gap-1.5 mt-2 text-xs">
                                    {connectionStatus === 'connected' ? (
                                        <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Server running</span></>
                                    ) : connectionStatus === 'connecting' ? (
                                        <><Loader className="w-3 h-3 text-amber-400 animate-spin" /><span className="text-amber-400">Reconnecting…</span></>
                                    ) : (
                                        <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-red-400">Disconnected</span></>
                                    )}
                                </div>
                            </div>

                            {/* ── LAN URLs ────────────────────── */}
                            {lanIps.length > 0 && (
                                <div className="px-4 py-3 border-b border-stone-800">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Link className="w-3 h-3 text-blue-400" />
                                        <p className="text-[10px] text-stone-500 uppercase tracking-widest">Player Join URLs</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        {lanIps.map((url) => (
                                            <div key={url} className="flex items-center gap-2 bg-stone-800/60 rounded-lg px-2.5 py-1.5">
                                                <span className="text-[11px] text-blue-300 font-mono flex-1 truncate">{url}</span>
                                                <button
                                                    onClick={() => handleCopyUrl(url)}
                                                    className="flex-shrink-0 text-stone-500 hover:text-stone-200 transition-colors"
                                                    title="Copy URL"
                                                >
                                                    {copiedUrl === url
                                                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        ))}
                                        <p className="text-[10px] text-stone-600 mt-1">
                                            Share these with players on the same network (LAN/Hamachi)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Active Map ──────────────────── */}
                            <div className="px-4 py-3 border-b border-stone-800">
                                <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">Player View</p>
                                <div className={`rounded-xl border px-3 py-3 ${
                                    isBlackout
                                        ? 'bg-red-950/30 border-red-800/40'
                                        : 'bg-emerald-950/20 border-emerald-800/30'
                                }`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className={`text-xs font-semibold ${
                                                isBlackout ? 'text-red-300' : 'text-emerald-300'
                                            }`}>
                                                {isBlackout ? 'Players are blacked out' : 'Auto-live broadcast enabled'}
                                            </div>
                                            <div className="text-[11px] text-stone-400 mt-1">
                                                Source: <span className="text-stone-200">{liveSourceLabel}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setBroadcastBlackout(!isBlackout)}
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold transition-colors ${
                                                isBlackout
                                                    ? 'bg-emerald-700/30 text-emerald-200 hover:bg-emerald-700/40'
                                                    : 'bg-stone-800 text-stone-300 hover:bg-red-900/30 hover:text-red-300'
                                            }`}
                                            title={isBlackout ? 'Resume the player display' : 'Hide the player display temporarily'}
                                        >
                                            {isBlackout ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            {isBlackout ? 'Resume' : 'Blackout'}
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                                        <div className="rounded-lg bg-stone-900/70 px-2.5 py-2">
                                            <div className="text-stone-500 uppercase tracking-widest">Scene</div>
                                            <div className="mt-1 text-stone-200 font-medium truncate">
                                                {presentation?.sceneTitle ?? 'No active scene'}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-stone-900/70 px-2.5 py-2">
                                            <div className="text-stone-500 uppercase tracking-widest">Map</div>
                                            <div className="mt-1 text-stone-200 font-medium truncate">
                                                {presentation?.mapName ?? 'Waiting'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-stone-600 mt-1.5">
                                    Navigator exploration and live combat now stream automatically without manual map pushes.
                                </p>
                            </div>

                            {/* ── Players ─────────────────────── */}
                            <div className="px-4 py-3">
                                <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">
                                    Players ({players.length})
                                </p>
                                {players.length === 0 ? (
                                    <div className="py-5 text-center text-stone-600 text-sm">
                                        <UserPlus className="w-7 h-7 mx-auto mb-2 text-stone-700" />
                                        No players yet.<br />
                                        <span className="text-xs">Share the URL or room code.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {players.map((player) => (
                                            <PlayerCard
                                                key={player.socketId}
                                                player={player}
                                                characters={characters}
                                                onAssign={(charId) => assignCharacter(player.socketId, charId)}
                                                onToggleEdit={() => togglePlayerEdit(player.socketId, !player.canEditSheet)}
                                                onKick={() => {
                                                    if (confirm(`Remove "${player.name}" from the session?`)) {
                                                        kickPlayer(player.socketId);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Chat tab */
                        <div className="overflow-y-auto flex-1">
                            <DMChatPanel />
                        </div>
                    )}

                    {/* ── Footer ──────────────────────────────── */}
                    <div className="px-4 py-3 border-t border-stone-800 flex-shrink-0">
                        <button
                            onClick={handleEndSession}
                            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20
                                       text-sm py-2 rounded-lg transition-colors"
                        >
                            End Session
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Player Card ───────────────────────────────────────────────

interface PlayerCardProps {
    player: PlayerInfo;
    characters: any[];
    onAssign: (charId: string) => void;
    onToggleEdit: () => void;
    onKick: () => void;
}

function PlayerCard({ player, characters, onAssign, onToggleEdit, onKick }: PlayerCardProps) {
    const assigned = characters.find((c) => c.id === player.characterId);

    return (
        <div className="bg-stone-800/60 border border-stone-700/50 rounded-xl p-3">
            {/* Name row */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${player.isOnline ? 'bg-emerald-400' : 'bg-stone-600'}`} />
                    <span className="text-sm font-semibold text-stone-100">{player.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Sheet edit toggle */}
                    <button
                        onClick={onToggleEdit}
                        className={`p-1.5 rounded-lg transition-colors ${
                            player.canEditSheet
                                ? 'text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50'
                                : 'text-stone-500 hover:bg-stone-700'
                        }`}
                        title={player.canEditSheet ? 'Lock sheet (click to lock)' : 'Unlock sheet editing'}
                    >
                        {player.canEditSheet ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                    {/* Kick */}
                    <button
                        onClick={onKick}
                        className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        title="Remove from session"
                    >
                        <UserX className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Character assignment */}
            <select
                value={player.characterId ?? ''}
                onChange={(e) => onAssign(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600/50 rounded-lg px-2.5 py-1.5
                           text-stone-300 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
                <option value="">— Assign character —</option>
                {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name} · Lv.{c.level} {c.className}
                    </option>
                ))}
            </select>

            {/* Assigned info */}
            {assigned && (
                <p className="mt-1.5 text-[10px] text-stone-500">
                    Playing <span className="text-amber-400">{assigned.name}</span>
                    {' '}· HP {assigned.currentHp}/{assigned.maxHp}
                    {' '}· {player.canEditSheet ? '✎ Can edit' : '🔒 Read-only'}
                </p>
            )}
        </div>
    );
}
