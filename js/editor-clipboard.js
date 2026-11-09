import { rectangleBounds } from './editor-rectangle.js';

export function copyRegion(map, start, end) {
    const b = rectangleBounds(start, end, map.width, map.height);
    return {
        width: b.right - b.left + 1, height: b.bottom - b.top + 1,
        color: map.color.slice(b.top, b.bottom + 1).map(row => row.slice(b.left, b.right + 1)),
        object: map.object.slice(b.top, b.bottom + 1).map(row => row.slice(b.left, b.right + 1))
    };
}

export function pasteRegion(map, clip, target) {
    let changed = false;
    for (let y = 0; y < clip.height; y++) for (let x = 0; x < clip.width; x++) {
        const dx = target.x + x, dy = target.y + y;
        if (dx < 0 || dy < 0 || dx >= map.width || dy >= map.height) continue;
        if (map.object[dy][dx] !== clip.object[y][x] || map.color[dy][dx] !== clip.color[y][x]) changed = true;
        map.object[dy][dx] = clip.object[y][x];
        map.color[dy][dx] = clip.color[y][x];
    }
    return changed;
}

export function clipboardShortcut(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.isComposing) return null;
    if (event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return null;
    const key = event.key.toLowerCase();
    return key === 'c' ? 'copy' : key === 'v' ? 'paste' : null;
}
