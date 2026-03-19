import { Link } from 'react-router-dom';
import { BookOpen, Link2, Shield, Sparkles, Swords, Users } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import { useCharacterStore } from '../store/characterStore';
import { useCombatStore } from '../store/combatStore';

export function OwlbearOverviewPage() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const characters = useCharacterStore((state) => state.characters);
    const activeEncounter = useCombatStore((state) => state.activeEncounter);

    const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId);
    const activePartySize = activeCampaign ? activeCampaign.partyIds.length : characters.length;

    return (
        <div className="space-y-8 p-6 md:p-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),linear-gradient(135deg,_rgba(17,24,39,0.95),_rgba(10,10,10,0.96))] p-8 shadow-[0_35px_90px_-45px_rgba(245,158,11,0.45)]">
                <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
                <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-gold">
                            <Sparkles size={14} />
                            Owlbear-Integrated DM Control
                        </div>
                        <div>
                            <h1 className="font-cinzel text-4xl font-bold text-parchment md:text-5xl">DM Assistant Workbench</h1>
                            <p className="mt-3 text-base leading-relaxed text-stone-300 md:text-lg">
                                Character sheets, party management, rest automation, combat tracking, and Owlbear token linking in one place.
                                Owlbear stays the map host; this workbench handles the DM burden around it.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link to="/combat" className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400">
                                Open Combat Bridge
                            </Link>
                            <Link to="/room" className="rounded-xl border border-stone-700 bg-stone-900/80 px-5 py-3 text-sm font-semibold text-stone-100 transition-colors hover:border-gold/40 hover:text-gold">
                                Link Tokens & Assign Players
                            </Link>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:w-[460px]">
                        <MetricCard label="Campaigns" value={campaigns.length} accent="text-blue-300" icon={BookOpen} />
                        <MetricCard label="Characters" value={characters.length} accent="text-emerald-300" icon={Users} />
                        <MetricCard label="Encounter" value={activeEncounter ? activeEncounter.combatants.length : 0} accent="text-rose-300" icon={Swords} />
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ActionCard
                    title="Campaign vault"
                    description={activeCampaign ? `Active campaign: ${activeCampaign.title}` : 'Create campaigns, notes, NPCs, and locations.'}
                    icon={BookOpen}
                    href="/campaigns"
                />
                <ActionCard
                    title="Character sheets"
                    description="Run full character creation and sheet editing inside the extension workbench."
                    icon={Users}
                    href="/characters"
                />
                <ActionCard
                    title="Token support"
                    description="Link Owlbear tokens to characters, then let players open their sheets from the tabletop."
                    icon={Link2}
                    href="/room"
                />
                <ActionCard
                    title="Combat automation"
                    description="Import selected tokens into initiative, then use theater-of-the-mind combat or Owlbear maps."
                    icon={Swords}
                    href="/combat"
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <div className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6">
                    <div className="flex items-center gap-2 text-gold">
                        <Shield size={18} />
                        <h2 className="font-cinzel text-xl font-bold text-parchment">Compatibility posture</h2>
                    </div>
                    <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-300">
                        <p>
                            This extension is designed to coexist with Owlbear&apos;s map ecosystem rather than replace it. Smoke &amp; Specter!,
                            Embers, and similar scene-effect extensions keep ownership of their lighting, ambience, and map metadata.
                        </p>
                        <p>
                            DM Assistant only writes character snapshots and assignment data under its own metadata namespace, which keeps the
                            extension non-destructive and makes token-linked character sheets possible without hijacking other tools.
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6">
                    <h2 className="font-cinzel text-xl font-bold text-parchment">Current room posture</h2>
                    <dl className="mt-5 space-y-4 text-sm">
                        <div className="flex items-center justify-between border-b border-stone-800/70 pb-3">
                            <dt className="text-stone-500">Tracked party size</dt>
                            <dd className="font-semibold text-stone-100">{activePartySize}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-stone-800/70 pb-3">
                            <dt className="text-stone-500">Active encounter</dt>
                            <dd className="font-semibold text-stone-100">{activeEncounter ? activeEncounter.title : 'None'}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-stone-500">Map ownership</dt>
                            <dd className="font-semibold text-gold">Owlbear Rodeo</dd>
                        </div>
                    </dl>
                </div>
            </section>
        </div>
    );
}

function MetricCard({
    label,
    value,
    accent,
    icon: Icon,
}: {
    label: string;
    value: number;
    accent: string;
    icon: typeof Sparkles;
}) {
    return (
        <div className="rounded-2xl border border-stone-800/80 bg-stone-950/80 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-stone-500">{label}</div>
                    <div className="mt-2 font-cinzel text-3xl font-bold text-parchment">{value}</div>
                </div>
                <Icon className={accent} size={22} />
            </div>
        </div>
    );
}

function ActionCard({
    title,
    description,
    icon: Icon,
    href,
}: {
    title: string;
    description: string;
    icon: typeof Sparkles;
    href: string;
}) {
    return (
        <Link
            to={href}
            className="group rounded-3xl border border-stone-800 bg-stone-950/70 p-6 transition-all hover:border-gold/30 hover:bg-stone-900"
        >
            <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-3 text-gold transition-transform group-hover:scale-105">
                    <Icon size={22} />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.24em] text-stone-600 transition-colors group-hover:text-gold">Open</span>
            </div>
            <h3 className="mt-5 font-cinzel text-2xl font-bold text-parchment">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">{description}</p>
        </Link>
    );
}
