function svgPlaceholder(width: number, height: number, label: string): string {
  const fontSize = Math.max(11, Math.round(Math.min(width, height) * 0.06));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">` +
    `<rect width="${width}" height="${height}" fill="#e2e8f0"/>` +
    `<text x="${width / 2}" y="${height / 2 + fontSize / 3}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fontSize}" fill="#64748b">${label}</text>` +
    '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const IMAGE_PLACEHOLDER = {
  wide: svgPlaceholder(320, 200, 'sin imagen'),
  square: svgPlaceholder(80, 80, 'sin imagen'),
  poster: svgPlaceholder(240, 320, 'sin imagen'),
};

export function swapImageOnError(event: Event, fallback: string): void {
  const img = event.target as HTMLImageElement | null;
  if (!img || img.src === fallback) return;
  img.src = fallback;
}
