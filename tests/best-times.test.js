import test from 'node:test';
import assert from 'node:assert/strict';
import { createBestTimes, BEST_TIMES_KEY } from '../js/best-times.js';
test('per-map records persist across sessions and only faster clears replace the best', () => {
    const data = new Map(); const storage = () => ({ getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) });
    const b = createBestTimes(storage);
    assert.equal(b.record('stage:1', 12.34), 12.34);
    assert.equal(b.record('stage:1', 15), 12.34);
    assert.equal(b.record('stage:1', 10), 10);
    b.record('user:1', 20);
    assert.equal(createBestTimes(storage).get('stage:1'), 10);
    assert.equal(createBestTimes(storage).get('user:1'), 20);
    assert.equal(b.get('stage:2'), null);
    assert.ok(data.has(BEST_TIMES_KEY));
});
test('invalid records are ignored and storage failures preserve in-session records', () => {
    const b = createBestTimes(() => { throw new Error('Blocked'); });
    for (const time of [0, -1, NaN, Infinity]) assert.equal(b.record('stage:1', time), null);
    assert.equal(b.record('editor', 1), null);
    assert.equal(b.record('user:2', 4.5), 4.5);
    assert.equal(b.get('user:2'), 4.5);
    assert.equal(createBestTimes(() => ({ getItem: () => 'null' })).get('stage:1'), null);
});
