import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { parseUserMapData } from '../js/user-map.js';

const source = readFileSync(new URL('../js/map-preview.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export function/g, 'function');
const response = { title: 'Preview map', mapData: {
    width: 4, height: 2, color: [['W', 'R', 'B', 'W'], ['W', 'W', 'G', 'W']],
    object: [['@', '#', '^', '$'], ['#', '#', 'O', '#']]
} };
function setup(load = async () => response, getBestTime = () => null) {
    const draws = [];
    const state = { globalAlpha: 1 };
    const stack = [];
    const ctx = new Proxy(state, { get(target, key) {
        if (key in target) return target[key];
        if (key === 'save') return () => stack.push({ ...state });
        if (key === 'restore') return () => Object.assign(state, stack.pop());
        return (...args) => draws.push({ method: key, args, color: state.fillStyle, alpha: state.globalAlpha });
    } });
    const element = () => ({ hidden: false, disabled: false, events: {}, attributes: {},
        addEventListener(type, fn) { this.events[type] = fn; },
        setAttribute(key, value) { this.attributes[key] = value; } });
    const parts = new Map(['canvas', 'title', 'meta', 'status', 'play', 'back'].map(key => [key, element()]));
    parts.get('canvas').getContext = () => ctx;
    const layers = ['ALL', 'R', 'G', 'B'].map(layer => ({ ...element(), dataset: { previewLayer: layer } }));
    const root = { hidden: true, querySelector: selector => parts.get(selector.slice(14, -1)), querySelectorAll: () => layers };
    const context = vm.createContext({ AbortController, setTimeout, clearTimeout, parseUserMapData, loadMap: load });
    vm.runInContext(source + '\nglobalThis.create = createMapPreview;', context);
    const events = [];
    const preview = context.create(root, { getBestTime, onSelect: async id => events.push(['play', id]), onOpen: () => events.push(['open']), onClose: () => events.push(['close']) });
    return { preview, root, parts, layers, draws, events };
}
test('preview loads the selected map, marks start/goal, switches layer, and plays only on request', async () => {
    const c = setup(undefined, () => 12.34);
    await c.preview.open({ id: '12', title: 'List title' });
    assert.equal(c.root.hidden, false);
    assert.equal(c.parts.get('title').textContent, 'Preview map');
    assert.equal(c.parts.get('meta').textContent, '#12 · 4 × 2 tiles · BEST 12.34 s');
    assert.equal(c.parts.get('play').disabled, false);
    assert.ok(c.draws.some(d => d.method === 'fillText' && d.args[0] === 'S'));
    assert.ok(c.draws.some(d => d.method === 'fillText' && d.args[0] === 'G'));
    assert.equal(c.events.filter(e => e[0] === 'play').length, 0);
    c.draws.length = 0;
    c.layers[2].events.click();
    assert.ok(c.draws.some(d => d.color === '#ff4545' && d.alpha === 0.18));
    assert.equal(c.layers[2].attributes['aria-pressed'], 'true');
    await c.parts.get('play').events.click();
    assert.deepEqual(c.events.at(-1), ['play', '12']);
    c.parts.get('back').events.click();
    assert.equal(c.root.hidden, true);
    assert.deepEqual(c.events.at(-1), ['close']);
});
test('cached preview avoids repeated fetches; refresh can clear the cache', async () => {
    let count = 0;
    const c = setup(async () => { count++; return response; });
    await c.preview.open({ id: '1', title: 'Map' });
    await c.preview.open({ id: '1', title: 'Map' });
    assert.equal(count, 1);
    c.preview.clearCache();
    await c.preview.open({ id: '1', title: 'Map' });
    assert.equal(count, 2);
});
test('invalid maps cannot play and back remains available', async () => {
    const c = setup(async () => ({ mapData: { width: 129 } }));
    await c.preview.open({ id: '1', title: 'Bad map' });
    assert.equal(c.parts.get('play').disabled, true);
    assert.equal(c.parts.get('canvas').hidden, true);
    assert.match(c.parts.get('status').textContent, /Could not load preview/);
    assert.equal(c.parts.get('back').disabled, false);
});
test('closing a loading preview aborts it and ignores late responses', async () => {
    let resolve;
    let signal;
    const c = setup((id, options) => { signal = options.signal; return new Promise(r => { resolve = r; }); });
    const pending = c.preview.open({ id: '1', title: 'Loading' });
    c.parts.get('back').events.click();
    assert.equal(signal.aborted, true);
    resolve(response);
    await pending;
    assert.equal(c.root.hidden, true);
    assert.equal(c.parts.get('canvas').hidden, true);
});
