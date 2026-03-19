/**
 * Engine for handling character and monster portrait images.
 * - Auto-fetches monster token art from 5e.tools GitHub mirrors.
 * - Compresses player-uploaded images to base64 for safe localStorage use.
 */

const _5ETOOLS_IMG_MIRRORS = [
    'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/',
    'https://raw.githubusercontent.com/TheGiddyLimit/5etools-img/main/bestiary/tokens/',
    'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/tokens/'
];

/**
 * Constructs the URL for a monster's token image based on its source book and name.
 * @param monsterName e.g., "Goblin", "Adult Red Dragon"
 * @param source e.g., "MM", "VGM", "MTF"
 * @returns An array of fallback URLs to try
 */
export function getMonsterTokenUrls(monsterName?: string, source?: string): string[] {
    if (!monsterName || !source) return [];

    // 5e.tools token URLs follow a strict format: img/{source}/{name}.webp
    // Spaces are sometimes preserved, sometimes URL-encoded. We URL-encode them.
    const cleanName = encodeURIComponent(monsterName);
    const cleanSource = encodeURIComponent(source);

    // We'll return just the primary mirror URL for the Combat Setup preview but 
    // components should ideally fall back if it 404s. The primary mirror is very stable.

    return _5ETOOLS_IMG_MIRRORS.map(m => `${m}${cleanSource}/${cleanName}.webp`);
}

/**
 * Gets a reliable single URL for a monster token, defaulting to mirror 3.
 */
export function getPrimaryMonsterTokenUrl(monsterName?: string, source?: string): string | undefined {
    const urls = getMonsterTokenUrls(monsterName, source);
    return urls.length > 0 ? urls[0] : undefined;
}

/**
 * Compresses an uploaded image file into a highly optimized, cropped square WebP base64 string.
 * Keeps file sizes tiny (~20-50KB) to prevent localStorage quota issues.
 * @param file The uploaded image file
 * @param maxDimension The max width/height of the square output (default 256px)
 * @param quality WebP compression quality (0-1, default 0.8)
 */
export async function compressPortraitImage(file: File, maxDimension: number = 256, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Calculate square crop box (center crop)
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;

                // Set canvas size to the target dimension
                canvas.width = maxDimension;
                canvas.height = maxDimension;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not supported'));
                    return;
                }

                // Draw the cropped portion onto the square canvas
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDimension, maxDimension);

                // Convert to compressed WebP
                const compressedBase64 = canvas.toDataURL('image/webp', quality);
                resolve(compressedBase64);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}
