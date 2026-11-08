import test from 'node:test';
import assert from 'node:assert/strict';
import { stageArray, MapParser } from '../js/map.js';
import { expertCourses, expertStages, platformSpec } from '../js/expert-stages.js';
import { BoxCollider } from '../js/engine.js';
globalThis.document = { documentElement: { dataset: {} } };
globalThis.localStorage = { getItem: () => 'false' };
const { Spike } = await import('../js/spike.js');

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const spike = y => new Spike(null, 256, y, '#FFFFFF', { R: true, G: true, B: true }, {});

test('expert campaign has 15 distinct arenas, valid endpoints and no blackholes', () => {
    assert.equal(stageArray.length, 50);
    assert.equal(expertStages.length, 15);
    assert.equal(new Set(expertStages.map(s => s.object + s.color)).size, 15);
    assert.equal(new Set(expertStages.map(s => s.width + 'x' + s.height)).size, 15);
    expertStages.forEach(raw => {
        const map = MapParser.parse(raw);
        assert.equal(raw.object.includes('O'), false);
        for (const key of ['color', 'object']) {
            const rows = raw[key].split('\n');
            assert.equal(rows.length, raw.height);
            assert.ok(rows.every(row => row.length === raw.width));
        }
        assert.equal(map.objects.player.length, 1);
        assert.equal(map.objects.goal.length, 1);
        for (const p of [...map.objects.player, ...map.objects.goal]) {
            assert.equal(map.map[p.y][p.x].type, undefined);
            assert.deepEqual(map.map[p.y + 1][p.x], { R: true, G: true, B: true, type: 'block' });
        }
        assert.ok(map.map.at(-1).every(t => t.type === 'spike' && t.R && t.G && t.B));
    });
});

test('routes mix relay, double-switch, dual-color, neutral, trapdoor and needle mechanics', () => {
    const mechanics = new Set();
    expertCourses.forEach((course, rank) => {
        if (!course.points) return;
        const map = MapParser.parse(expertStages[rank]);
        course.points.slice(1, -1).forEach(([x, y], i) => {
            const spec = platformSpec(course, rank, i + 1);
            mechanics.add(spec.mechanic);
            assert.equal(map.map[y][x].type, 'block');
            assert.equal(course.points[i][1] - y <= 2, true);
            if (spec.trapdoor) assert.equal(map.map[y - 1][x].type, undefined);
            else assert.equal(map.map[y - 1][x].type, 'spike');
            if (spec.mechanic === 'dual') {
                assert.equal(['R', 'G', 'B'].filter(l => map.map[y][x][l]).length, 2);
            }
            if (spec.floor === 'W') assert.ok(map.map[y][x].R && map.map[y][x].G && map.map[y][x].B);
        });
    });
    assert.deepEqual([...mechanics].sort(), ['double', 'dual', 'needle', 'neutral', 'relay', 'trapdoor']);
});

test('descent shutters stagger their gaps and require all three colors', () => {
    expertCourses.forEach((course, rank) => {
        if (!course.descent) return;
        const map = MapParser.parse(expertStages[rank]);
        const layers = ['R', 'G', 'B'];
        const gapWidth = course.narrow ? 1 : 2;
        course.descent.forEach((gap, i) => {
            const y = 7 + i * 4;
            const layer = layers[i % 3];
            for (let x = 1; x < map.width - 1; x++) {
                const tile = map.map[y][x];
                if (x >= gap && x < gap + gapWidth) {
                    assert.equal(tile.type, undefined);
                } else {
                    assert.equal(tile.type, 'block');
                    assert.equal(tile[layer], true);
                    const canopy = map.map[y - 1][x];
                    assert.equal(canopy.type, 'spike');
                    if (!(canopy.R && canopy.G && canopy.B)) assert.equal(canopy[layer], false);
                    assert.ok(layers.filter(l => l !== layer).every(l => canopy[l]));
                }
            }
            if (i) assert.ok(Math.abs(gap - course.descent[i - 1]) > gapWidth);
            if (i < course.descent.length - 1) {
                for (const x of [gap - 1, gap + gapWidth]) {
                    const shoulder = map.map[y + 1][x];
                    assert.equal(shoulder.type, 'spike');
                    assert.ok(shoulder.R && shoulder.G && shoulder.B);
                }
                assert.equal(map.map[y + 2][gap].type, 'spike');
            }
        });
    });
});

test('edge gates leave exactly 16px landing tolerance using real spike hitboxes', () => {
    const left = new Spike(null, 192, 704, '#FFFFFF', { R: true, G: true, B: true }, {}).hitbox;
    const right = spike(704).hitbox;
    assert.equal(left.w, 16);
    assert.equal(left.h, 16);
    assert.equal(right.x - (left.x + left.w), 48);
    for (let x = 232; x <= 248; x++) {
        const player = { x, y: 736, w: 32, h: 32 };
        assert.equal(overlaps(player, left) || overlaps(player, right), false);
        assert.ok(x + 32 > 256); // 8–24px overlap with the landing tile
    }
    assert.ok(overlaps({ x: 231, y: 736, w: 32, h: 32 }, left));
    assert.ok(overlaps({ x: 249, y: 736, w: 32, h: 32 }, right));
});

test('head-hitter roof cancels a real jump and the shortened arc clears a one-tile pit', () => {
    const p = new BoxCollider(200, 736, 32, 32);
    p.vx = 600;
    p.vy = -820;
    const roof = { x: 64, y: 640, w: 192, h: 64 };
    let bumped = false;
    let grounded = false;
    for (let i = 0; i < 90; i++) {
        p.vx += 9000 / 120;
        p.update(1 / 120);
        if (p.isCollidingWith(roof)) {
            p.resolveCollision(roof);
            assert.equal(p.vy, 0);
            assert.equal(p.y, 704);
            bumped = true;
        }
        const landing = { x: 320, y: 768, w: 192, h: 64 };
        if (p.isCollidingWith(landing) && p.previousY + p.h <= landing.y) {
            p.resolveCollision(landing);
            grounded = true;
            break;
        }
        if (p.y > 900) break;
    }
    assert.ok(bumped);
    assert.ok(grounded);
});

