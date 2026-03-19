// Handles fetching the catalog of community homebrew packs from TheGiddyLimit repository

export interface HomebrewPack {
    author: string;
    title: string;
    filename: string;
    url: string;
}

const GITHUB_REPO = 'TheGiddyLimit/homebrew';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/master`;
const API_BASE = `https://api.github.com/repos/${GITHUB_REPO}/contents`;

const CATEGORY_MAP: Record<string, string> = {
    'Spells': 'spell',
    'Feats': 'feat',
    'Items': 'item',
    'Classes': 'class',
    'Races': 'race',
    'Monsters': 'creature',
    'Backgrounds': 'background',
    'Subclasses': 'subclass',
};

// Cache to prevent hitting GitHub API rate limits
const catalogCache: Record<string, HomebrewPack[]> = {};

/**
 * Fetches the list of available homebrew JSON files for a given category.
 */
export async function fetchHomebrewCatalog(category: string): Promise<HomebrewPack[]> {
    const dir = CATEGORY_MAP[category];
    if (!dir) return [];

    if (catalogCache[category]) {
        return catalogCache[category];
    }

    try {
        const res = await fetch(`${API_BASE}/${dir}`);
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

        const files: any[] = await res.json();

        const packs = files
            .filter(f => f.name.endsWith('.json') && f.name.includes(';'))
            .map(f => {
                const parts = f.name.replace('.json', '').split(';');
                return {
                    author: parts[0].trim(),
                    title: parts.slice(1).join(';').trim(),
                    filename: f.name,
                    url: `${RAW_BASE}/${dir}/${encodeURIComponent(f.name)}`
                };
            })
            // Sort alphabetically by title
            .sort((a, b) => a.title.localeCompare(b.title));

        catalogCache[category] = packs;
        return packs;

    } catch (err) {
        console.error("Failed to fetch homebrew catalog:", err);
        return [];
    }
}
