export function rectangleBounds(start, end, width, height) {
    return { left: Math.max(0, Math.min(start.x, end.x)), right: Math.min(width - 1, Math.max(start.x, end.x)), top: Math.max(0, Math.min(start.y, end.y)), bottom: Math.min(height - 1, Math.max(start.y, end.y)) };
}
export function fillRectangle(map, start, end, object, color) {
    const bounds = rectangleBounds(start, end, map.width, map.height);
    const paintColor = object === '.' ? '.' : color;
    let changed = false;
    for (let y = bounds.top; y <= bounds.bottom; y++) for (let x = bounds.left; x <= bounds.right; x++) {
        if (map.object[y][x] !== object || map.color[y][x] !== paintColor) changed = true;
        map.object[y][x] = object; map.color[y][x] = paintColor;
    }
    return changed;
}
