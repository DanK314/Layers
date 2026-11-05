import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeyBindings, DEFAULT_BINDINGS } from '../js/keybindings.js';
test('bindings persist, reject duplicates, and preserve defaults on corrupt storage', () => {
    const data = new Map(); const storage = () => ({ getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) });
    const keys = createKeyBindings(storage);
    assert.equal(keys.action({ code: 'KeyA' }), 'left');
    assert.equal(keys.set('left', 'ArrowLeft'), true);
    assert.equal(createKeyBindings(storage).action({ code: 'ArrowLeft' }), 'left');
    assert.equal(keys.action({ code: 'KeyA' }), null);
    assert.throws(() => keys.set('jump', 'KeyD'), /already assigned/);
    assert.throws(() => keys.set('jump', 'Escape'));
    assert.equal(keys.action({ code: 'ArrowLeft', ctrlKey: true }), null);
    assert.equal(keys.action({ code: 'ArrowLeft', target: { closest: () => ({}) } }), null);
    keys.reset(); assert.deepEqual(keys.get(), DEFAULT_BINDINGS);
    assert.deepEqual(createKeyBindings(() => ({ getItem: () => '{' })).get(), DEFAULT_BINDINGS);
});
test('storage denial keeps new controls active for the session', () => {
    const keys = createKeyBindings(() => { throw new Error('Denied'); });
    assert.equal(keys.set('jump', 'Space'), false);
    assert.equal(keys.action({ code: 'Space' }), 'jump');
});
