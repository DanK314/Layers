// Hand-authored campaign routes. Platforms, hazards and phase ceilings are
// combined into relay, dual-color, neutral, trapdoor and double-switch routes.
// Coordinates describe platform tops; jumps rise at most two 64px tiles.
const route = (name, width, height, points, options = {}) => ({ name, width, height, points, ...options });
export const expertCourses = [
    route('Prism ascent', 28, 20, [[2,17],[5,16],[8,14],[11,13],[14,11],[17,10],[20,8],[23,7]], { roofs: true, mechanic: 'relay' }),
    route('RGB tower', 16, 34, [[2,30],[6,28],[10,26],[6,24],[2,22],[6,20],[10,18],[6,16],[2,14],[6,12],[10,10],[6,8],[2,6],[6,4]], { roofs: true }),
    { name: 'Falling shutters', width: 22, height: 36, descent: [16,3,16,3,16,3,16], start: 3 },
    route('Reverse skyline', 32, 24, [[2,21],[6,19],[10,17],[14,15],[18,13],[22,11],[26,9],[23,7],[19,5],[15,3],[11,3],[7,3],[3,3]], { roofs: true }),
    route('Split spires', 26, 32, [[2,28],[6,26],[2,24],[6,22],[2,20],[6,18],[10,16],[14,14],[18,12],[22,10],[18,8],[22,6],[18,4]], { gates: true, mechanic: 'double' }),
    route('Sawtooth relay', 38, 20, [[2,16],[5,14],[8,17],[11,15],[14,13],[17,16],[20,14],[23,12],[26,15],[29,13],[32,11]], { roofs: true, gates: true, mechanic: 'trapdoor' }),
    route('Head-hitter gallery', 36, 18, [[2,14],[5,14],[8,13],[11,13],[14,11],[17,11],[20,10],[23,10],[26,8],[29,8],[32,6]], { roofs: true, headHitters: true }),
    { name: 'Offset waterfall', width: 28, height: 44, descent: [21,4,17,7,21,4,17,7,21], start: 4, narrow: true },
    route('Needle helix', 20, 38, [[2,34],[6,32],[10,30],[14,28],[10,26],[6,24],[2,22],[6,20],[10,18],[14,16],[10,14],[6,12],[2,10],[6,8],[10,6],[14,4]], { gates: true, edges: true, mechanic: 'needle' }),
    route('Broken pendulum', 34, 28, [[2,24],[6,22],[10,20],[14,18],[18,16],[22,14],[26,12],[29,10],[25,8],[21,6],[17,4],[13,4],[9,4],[5,4]], { roofs: true, gates: true, edges: true, mechanic: 'double' }),
    route('Chroma lattice', 26, 36, [[2,32],[6,30],[10,28],[14,26],[18,24],[22,22],[18,20],[14,18],[10,16],[6,14],[2,12],[6,10],[10,8],[14,6],[18,4]], { roofs: true, gates: true, mechanic: 'dual' }),
    { name: 'Shutter gauntlet', width: 32, height: 52, descent: [25,4,21,8,25,4,21,8,25,4,21], start: 4, narrow: true, gates: true },
    route('Fractured crown', 38, 30, [[2,26],[6,24],[10,22],[14,20],[18,18],[22,16],[26,14],[30,12],[33,10],[29,8],[25,6],[21,4],[17,4],[13,4],[9,4],[5,4]], { roofs: true, gates: true, edges: true, mechanic: 'neutral' }),
    route('Spectrum switchbacks', 22, 46, [[2,42],[6,40],[10,38],[14,36],[18,34],[14,32],[10,30],[6,28],[2,26],[6,24],[10,22],[14,20],[18,18],[14,16],[10,14],[6,12],[2,10],[6,8],[10,6],[14,4]], { roofs: true, gates: true, edges: true, mechanic: 'dual' }),
    route('Total refraction', 46, 40, [[2,36],[6,34],[10,32],[14,30],[18,28],[22,26],[26,24],[30,22],[34,20],[38,18],[41,16],[37,14],[33,12],[29,10],[25,8],[21,6],[17,4],[13,4],[9,4],[5,4]], { roofs: true, headHitters: true, gates: true, edges: true, mechanic: 'mixed' })
];

const layers = ['R', 'G', 'B'];
const complement = { R: 'C', G: 'M', B: 'Y', Y: 'B', C: 'R', M: 'G', W: '.' };

export function platformSpec(course, rank, index) {
    const [x, y] = course.points[index];
    const endpoint = index === 0 || index === course.points.length - 1;
    const mechanic = course.mechanic === 'mixed'
        ? ['relay', 'double', 'dual', 'neutral', 'trapdoor', 'needle'][index % 6]
        : course.mechanic || 'relay';
    const layer = layers[(index - 1 + 3) % 3];
    const floor = endpoint ? 'W' : mechanic === 'dual' ? ['Y', 'C', 'M'][(index - 1) % 3]
        : mechanic === 'neutral' && index % 2 === 0 ? 'W' : layer;
    const trapdoor = !endpoint && mechanic === 'trapdoor' && course.points[index + 1][1] > y;
    const canopy = endpoint || trapdoor ? '.' : floor === 'W' ? layer : complement[floor];
    const edge = !endpoint && course.edges && index % 4 === 2 && course.points[index - 1][1] - y <= 1;
    return { x, y, endpoint, mechanic, layer, floor, canopy, edge, trapdoor, size: endpoint || rank < 7 ? 2 : 1 };
}

export function buildExpertStage(course, rank) {
    const { width, height } = course;
    const color = Array.from({ length: height }, () => Array(width).fill('.'));
    const object = Array.from({ length: height }, () => Array(width).fill('.'));
    const put = (x, y, tint, symbol) => {
        if (x < 0 || y < 0 || x >= width || y >= height) throw new Error(`Out of bounds in ${course.name}`);
        if (object[y][x] !== '.' && (object[y][x] !== symbol || color[y][x] !== tint)) {
            throw new Error(`Overlapping geometry in ${course.name} at ${x},${y}`);
        }
        color[y][x] = tint; object[y][x] = symbol;
    };
    const line = (x, y, length, tint, symbol) => {
        for (let i = 0; i < length; i++) put(x + i, y, tint, symbol);
    };
    // Outer walls seal the arena; the bottom is lethal in every layer.
    for (let y = 0; y < height - 1; y++) {
        put(0, y, 'W', '#'); put(width - 1, y, 'W', '#');
    }
    line(1, 0, width - 2, 'W', '#');
    line(0, height - 1, width, 'W', '^');

    if (course.descent) {
        // Alternating openings prevent a straight fall to the goal. A shelf
        // exists only in its own layer; the other two layers activate its
        // spike canopy. Switch in the opening, after clearing the old canopy.
        line(course.start, 4, 2, 'W', '#');
        put(course.start, 3, 'W', '@');
        course.descent.forEach((gap, index) => {
            const y = 7 + index * 4;
            const layer = layers[index % 3];
            const gapWidth = course.narrow ? 1 : 2;
            for (let x = 1; x < width - 1; x++) {
                if (x >= gap && x < gap + gapWidth) continue;
                put(x, y, layer, '#');
                const previous = index ? course.descent[index - 1] : course.start;
                const tooth = x % (course.narrow ? 4 : 5) === 0
                    && Math.abs(x - previous) > 2 && Math.abs(x - gap) > 1;
                put(x, y - 1, tooth ? 'W' : complement[layer], '^');
            }
            // Spike shoulders punish drifting during the drop. The central
            // phase mine must be disabled before reaching the next shelf.
            if (index < course.descent.length - 1) {
                put(gap - 1, y + 1, 'W', '^');
                put(gap + gapWidth, y + 1, 'W', '^');
                put(gap, y + 2, complement[layers[(index + 1) % 3]], '^');
                if (course.gates) put(gap + gapWidth, y + 2, 'W', '^');
            }
        });
        const last = course.descent.at(-1);
        const goalX = last < width / 2 ? width - 4 : 2;
        const floorY = height - 3;
        // The final shelf repeats the phase-lock before the white exit.
        const tint = layers[course.descent.length % 3];
        line(1, floorY, width - 2, tint, '#');
        line(1, floorY - 1, width - 2, complement[tint], '^');
        // White endpoint occupies a gap in the last canopy.
        for (let x = goalX; x < goalX + 2; x++) {
            object[floorY][x] = '#'; color[floorY][x] = 'W';
            object[floorY - 1][x] = '.'; color[floorY - 1][x] = '.';
        }
        put(goalX, floorY - 1, 'W', '$');
    } else {
        course.points.forEach(([x, y], index) => {
            const spec = platformSpec(course, rank, index);
            const { endpoint, layer, edge, size, floor, canopy, mechanic, trapdoor } = spec;
            line(x, y, size, floor, '#');
            if (endpoint) {
                put(x, y - 1, 'W', index === 0 ? '@' : '$');
                return;
            }
            // Relay canopies punish the wrong landing phase; dual-color and
            // neutral shelves use different safe sets. Trapdoors stay clear
            // so the player can turn off the floor without jumping.
            if (edge) {
                put(x - 1, y - 1, 'W', '^');
                put(x, y - 1, 'W', '^');
                put(x + 1, y - 1, 'W', '^');
            } else if (canopy !== '.') {
                line(x, y - 1, size, canopy, '^');
            }
            const next = course.points[index + 1];
            // A same-phase ceiling must disappear during the jump. White
            // head-hitters are reserved for targets at most one tile higher.
            if (course.roofs && !trapdoor && y >= 4 && index % 2 === 1) {
                const tint = course.headHitters && y - next[1] <= 1 ? 'W' : layer;
                line(x, y - 3, size, tint, '#');
            }
            if (course.gates && !edge && !trapdoor && index % 3 === 1) {
                // A departing-phase wall in the gap prevents carrying the
                // old color all the way across. Two taps may be necessary.
                const direction = Math.sign(next[0] - x);
                const gateX = direction > 0 ? x + size : x - 1;
                // Two-phase walls force a third transit color, followed by
                // another switch to activate the destination platform.
                const nextLayer = layers[index % 3];
                const gateTint = mechanic === 'double'
                    ? ({ RG: 'Y', GB: 'C', BR: 'M' })[layer + nextLayer] : layer;
                put(gateX, Math.min(y, next[1]) - 1, gateTint, '#');
                put(gateX, Math.min(y, next[1]), gateTint, '#');
            }
        });
    }
    return { width, height, color: color.map(row => row.join('')).join('\n'), object: object.map(row => row.join('')).join('\n') };
}

export const expertStages = expertCourses.map(buildExpertStage);
