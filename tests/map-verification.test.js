import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createMapVerification } from '../js/map-verification.js';
const map = () => ({ width: 2, height: 1, color: [['W', 'W']], object: [['@', '$']] });
test('only the exact completed snapshot can upload; any intervening edit invalidates attempts', () => {
    const v = createMapVerification(); const m = map();
    assert.equal(v.isVerified(m), false);
    const attempt = v.begin(m);
    assert.equal(v.isVerified(m), false);
    assert.equal(v.complete(attempt, m), true);
    assert.equal(v.isVerified(m), true);
    m.color[0][0] = 'R'; assert.equal(v.isVerified(m), false);
    m.color[0][0] = 'W'; v.invalidate();
    assert.equal(v.isVerified(m), false);
    assert.equal(v.complete(attempt, m), false);
    assert.equal(v.complete(v.begin(m), m), true);
});
const source = readFileSync(new URL('../js/editor.js', import.meta.url), 'utf8');
function preview() {
    const games = []; const tasks = [];
    const verification = createMapVerification(); const m = map();
    const uploadButton = { disabled: true }; const verifyStatus = {};
    const element = { classList: { add() {}, remove() {} }, setAttribute() {} };
    const context = vm.createContext({ verification, uploadButton, verifyStatus, uploading: false,
        currentMap: () => m, MAP_WIDTH: 2, MAP_HEIGHT: 1, colorMap: m.color, objectMap: m.object,
        validateMap: () => true, finishPointerInteraction() {}, releasePreviewControls() {},
        MapParser: { parse: data => data }, previewCanvas: {}, gamePreview: element,
        window: { innerWidth: 800, innerHeight: 600 }, alert() {}, queueMicrotask: fn => tasks.push(fn),
        Game: class { constructor(canvas, stage, callback) { this.callback = callback; games.push(this); } run() {} stop() { this.stopped = true; } }
    });
    const a = source.indexOf('function startPreview()');
    const b = source.indexOf("verifyButton.addEventListener", a);
    vm.runInContext('let previewGame = null;\n' + source.slice(a, b) + '\nglobalThis.api = { startPreview, stopPreview };', context);
    return { context, games, tasks, verification, m, uploadButton, verifyStatus, api: context.api };
}
test('test play enables upload only at goal and returns to editor; abandoned runs cannot verify', () => {
    const s = preview(); s.api.startPreview();
    assert.equal(s.uploadButton.disabled, true);
    s.games[0].callback(false); assert.equal(s.verification.isVerified(s.m), false);
    s.api.stopPreview();
    s.games[0].callback(true); assert.equal(s.verification.isVerified(s.m), false);
    s.api.startPreview(); s.games[1].callback(true);
    assert.equal(s.verification.isVerified(s.m), true);
    assert.equal(s.uploadButton.disabled, false);
    s.tasks.forEach(fn => fn());
    assert.equal(s.games[1].stopped, true);
});
test('upload handler blocks unverified data even if a button is enabled externally', async () => {
    const verification = createMapVerification(); const m = map(); let handler; let uploads = 0;
    const context = vm.createContext({ verification, currentMap: () => m, validateMap: () => true,
        uploadButton: { disabled: false, addEventListener(type, fn) { handler = fn; } }, verifyStatus: {},
        prompt() { throw new Error('Must not prompt for unverified upload'); }, uploadMap() { uploads++; }
    });
    const a = source.indexOf('uploadButton.addEventListener("click"');
    const b = source.indexOf('copyShareButton.addEventListener', a);
    vm.runInContext(source.slice(a, b), context);
    await handler();
    assert.equal(uploads, 0);
    assert.equal(context.uploadButton.disabled, true);
});
