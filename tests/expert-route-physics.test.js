import test from 'node:test';
import assert from 'node:assert/strict';
import { expertCourses, expertStages, platformSpec } from '../js/expert-stages.js';
import { MapParser } from '../js/map.js';
import { BoxCollider } from '../js/engine.js';

const layers = ['R', 'G', 'B'];
const overlap = (p, b) => p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.h && p.y + p.h > b.y;

// Check each authored jump against the actual collider, gravity and friction.
// This is local feasibility, not a claim of a complete uninterrupted playthrough.
function canJump(map, from, to, fromWidth, toWidth, initial, destination, transit = null, delay = 0, jumpVelocity = -820) {
    const [sx, sy] = from, [tx, ty] = to;
    const direction = Math.sign(tx - sx);
    const tiles = [];
    for (let y = Math.max(0, Math.min(sy, ty) - 4); y <= Math.min(map.height - 1, Math.max(sy, ty) + 2); y++) {
        for (let x = Math.max(0, Math.min(sx, tx) - 2); x <= Math.min(map.width - 1, Math.max(sx, tx) + 3); x++) {
            const t = map.map[y][x];
            if (t.type === 'block') tiles.push({ ...t, x: x * 64, y: y * 64, w: 64, h: 64 });
            if (t.type === 'spike') tiles.push({ ...t, x: x * 64 + 24, y: y * 64 + 24, w: 16, h: 16 });
        }
    }
    const blocks = tiles.filter(t => t.type === 'block');
    const spikes = tiles.filter(t => t.type === 'spike');
    for (let offset = -24; offset <= fromWidth * 64 - 8; offset += 16) {
        for (const speed of [600, 300, 0]) {
            for (const aim of [-16, 8, 40]) {
                for (let switchFrame = 0; switchFrame <= 24; switchFrame += 2) {
                    const p = new BoxCollider(sx * 64 + offset, sy * 64 - 32, 32, 32);
                    let layer = initial;
                    let phaseTarget = initial;
                    if (spikes.some(s => s[layer] && overlap(p, s))) continue;
                    p.vx = direction * speed; p.vy = jumpVelocity;
                    for (let frame = 0; frame < 100; frame++) {
                        if (frame === switchFrame) phaseTarget = transit || destination;
                        if (transit && frame === switchFrame + delay) phaseTarget = destination;
                        if (layer !== phaseTarget) layer = layers[(layers.indexOf(layer) + 1) % 3];
                        const dx = tx * 64 + aim - p.x;
                        const desired = Math.max(-600, Math.min(600, dx * 10));
                        const input = Math.abs(desired - p.vx) < 70 ? 0 : Math.sign(desired - p.vx);
                        p.vx = Math.max(-7500, Math.min(7500, p.vx + input * 9000 / 60));
                        p.update(1 / 60);
                        let landed = false;
                        for (const b of blocks) {
                            if (!b[layer] || !overlap(p, b)) continue;
                            const falling = p.vy >= 0 && p.y + p.h <= b.y + 16;
                            const target = b.y === ty * 64 && b.x >= tx * 64 && b.x < (tx + toWidth) * 64;
                            p.resolveCollision(b);
                            if (falling && target) landed = true;
                        }
                        if (spikes.some(s => s[layer] && overlap(p, s))) break;
                        if (landed) return true;
                        if (p.y > Math.max(sy, ty) * 64 + 128) break;
                    }
                }
            }
        }
    }
    return false;
}

test('all authored route jumps have a collision-safe local trajectory', () => {
    const failed = [];
    expertCourses.forEach((course, rank) => {
        if (!course.points) return;
        const map = MapParser.parse(expertStages[rank]);
        for (let i = 1; i < course.points.length; i++) {
            const fromWidth = i === 1 || rank < 7 ? 2 : 1;
            const toWidth = i === course.points.length - 1 || rank < 7 ? 2 : 1;
            const validLayers = ([x, y]) => {
                const floor = map.map[y][x];
                const spike = map.map[y - 1][x];
                return layers.filter(l => floor[l] && (!spike.type || (spike.R && spike.G && spike.B) || !spike[l]));
            };
            const initials = i === 1 ? ['R'] : validLayers(course.points[i - 1]);
            const destinations = validLayers(course.points[i]);
            let found = false;
            for (const initial of initials) for (const destination of destinations) {
                if (found) continue;
                found = canJump(map, course.points[i - 1], course.points[i], fromWidth, toWidth, initial, destination);
                if (!found) for (const transit of layers.filter(l => l !== destination)) {
                    for (const delay of [4, 8, 12, 16, 20]) {
                        found = canJump(map, course.points[i - 1], course.points[i], fromWidth, toWidth, initial, destination, transit, delay);
                        if (found) break;
                    }
                    if (found) break;
                }
            }
            if (!found) failed.push((36 + rank) + ':' + i);
        }
    });
    assert.deepEqual(failed, []);
});


test('tight descent apertures admit a phased drop between the actual spike boxes', () => {
    expertCourses.forEach((course, rank) => {
        if (!course.descent) return;
        const map = MapParser.parse(expertStages[rank]);
        course.descent.slice(0, -1).forEach((gap, i) => {
            const y = 7 + i * 4;
            const gapWidth = course.narrow ? 1 : 2;
            const p = new BoxCollider((gap + gapWidth / 2) * 64 - 16, y * 64 - 32, 32, 32);
            let layer = layers[i % 3];
            let landed = false;
            for (let frame = 0; frame < 60 && !landed; frame++) {
                if (frame === 3) layer = layers[(i + 1) % 3];
                p.update(1 / 60);
                for (let row = y - 1; row <= y + 4; row++) {
                    for (let x = gap - 1; x <= gap + gapWidth; x++) {
                        const tile = map.map[row][x];
                        if (!tile[layer]) continue;
                        if (tile.type === 'spike') {
                            assert.equal(overlap(p, { x: x * 64 + 24, y: row * 64 + 24, w: 16, h: 16 }), false, course.name + ': unsafe fall');
                        }
                        if (tile.type === 'block') {
                            const box = { x: x * 64, y: row * 64, w: 64, h: 64 };
                            if (overlap(p, box)) {
                                p.resolveCollision(box);
                                if (row === y + 4 && p.y + 32 === row * 64) landed = true;
                            }
                        }
                    }
                }
            }
            assert.ok(landed, course.name + ': drop did not reach next shelf');
        });
    });
});


test('trapdoor shelves can release the player by switching without jumping', () => {
    let drops = 0;
    expertCourses.forEach((course, rank) => {
        if (!course.points) return;
        const map = MapParser.parse(expertStages[rank]);
        course.points.forEach((point, i) => {
            const spec = platformSpec(course, rank, i);
            if (!spec.trapdoor) return;
            const target = platformSpec(course, rank, i + 1);
            assert.ok(canJump(map, point, course.points[i + 1], spec.size, target.size, spec.layer, target.layer, null, 0, 0), course.name + ': no safe release');
            drops++;
        });
    });
    assert.ok(drops >= 3);
});


test('stage 40 needs only the next RGB color on every jump, without a transit phase', () => {
    const rank = 4;
    const course = expertCourses[rank];
    const map = MapParser.parse(expertStages[rank]);
    // The first red-to-green jump travels left through this gate. Yellow
    // incorrectly blocks both the departure and destination colors.
    const firstGate = map.map[24][5];
    assert.equal(firstGate.type, 'block');
    assert.equal(firstGate.R, true);
    assert.equal(firstGate.G, false);
    assert.equal(firstGate.B, false);
    for (let i = 1; i < course.points.length; i++) {
        const initial = i === 1 ? 'R' : layers[(i - 2) % 3];
        const destination = layers[(i - 1) % 3];
        assert.ok(canJump(map, course.points[i - 1], course.points[i], 2, 2, initial, destination), 'Stage 40 jump ' + i + ' requires an extra phase');
    }
});
