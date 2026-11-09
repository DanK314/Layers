import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/editor.js', import.meta.url), 'utf8');
const resize = source.slice(source.indexOf('function resizeCanvas()'), source.indexOf('// The workspace changes'));
const sizing = source.slice(source.indexOf('function getCellSize()'), source.indexOf('function resetMapView()'));
const hitTest = source.slice(source.indexOf('function getCellFromMouse('), source.indexOf('function drawCell('));

test('rectangular workspaces fill both axes, keep tiles square and hit the correct cells', () => {
    for (const [width, height] of [[1080, 580], [367, 330], [529, 205]]) {
        const canvas = { getBoundingClientRect: () => ({ width, height, left: 20, top: 100 }) };
        const camera = { x: 0, y: 0, zoom: 1 };
        const context = vm.createContext({ canvas, camera, MAP_WIDTH: 32, MAP_HEIGHT: 24, draw() {} });
        vm.runInContext(`${resize}\n${sizing}\n${hitTest}\nresizeCanvas();`, context);
        assert.equal(canvas.width, width);
        assert.equal(canvas.height, height);
        assert.equal(vm.runInContext('getCellSize()', context), Math.min(width, height) / 16);
        for (const zoom of [0.5, 1, 2.2]) {
            camera.zoom = zoom;
            const size = vm.runInContext('getCellSize()', context);
            context.event = { clientX: 20 + camera.x + 8.5 * size, clientY: 100 + camera.y + 6.5 * size };
            assert.equal(vm.runInContext('JSON.stringify(getCellFromMouse(event))', context), '{"x":8,"y":6}');
        }
    }
});
