import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => 'false' };
globalThis.document = { documentElement: { dataset: {} } };
const listeners = new Map();
globalThis.window = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }
};
globalThis.Audio = class { play() { return Promise.resolve(); } pause() {} };
const { Player } = await import('../js/player.js');

test('jump requires landing again, including repeated presses in midair', () => {
    let jumps = 0;
    const p = new Player({}, 0, 0, () => jumps++);
    try {
        p.jump();
        assert.equal(jumps, 0);
        p.setGrounded(true); p.jump();
        assert.equal(jumps, 1);
        assert.equal(p.vy, -820);
        p.vy = 200;
        p.jump(); p.jump();
        assert.equal(p.vy, 200);
        assert.equal(jumps, 1);
        p.setGrounded(true); p.jump();
        assert.equal(jumps, 2);
        p.respawn(); p.jump();
        assert.equal(jumps, 2);
    } finally { p.dispose(); }
});
