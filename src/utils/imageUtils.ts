/**
 * Image compression and utility helpers for mobile camera uploads
 */

export async function compressAndResizeImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scale
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }

        // Draw image smoothly
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/webp if supported, fallback to jpeg
        const outputType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

/**
 * Mobile tactile haptic feedback trigger
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') navigator.vibrate(12);
      else if (type === 'medium') navigator.vibrate(25);
      else if (type === 'success') navigator.vibrate([15, 40, 20]);
      else if (type === 'warning') navigator.vibrate([40, 60, 40]);
    } catch {
      // Ignore vibration errors if restricted by browser
    }
  }
}

/**
 * Generate a clean SVG placeholder data URL with product initials
 */
export function getProductPlaceholderSvg(name: string, color = '#3b82f6'): string {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="16" fill="#1e293b"/>
    <circle cx="100" cy="100" r="60" fill="${color}" opacity="0.2"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="${color}">
      ${initials || 'WH'}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
