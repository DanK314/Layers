import test from 'node:test';
import assert from 'node:assert/strict';
import { createStageProgress, PROGRESS_KEY } from '../js/stage-progress.js';
function store(raw) {
    const data = new Map(raw ? [[PROGRESS_KEY, raw]] : []);
    return { data, storage: () => ({ getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }) };
}
test('stages unlock in order and a new session resumes at the latest unlocked stage', () => {
    const s = store(); const p = createStageProgress(10, s);
    assert.equal(p.resumeIndex, 0);
    assert.equal(p.isUnlocked(0), true); assert.equal(p.isUnlocked(1), false);
    assert.equal(p.complete(4), false); assert.equal(p.complete(-1), false);
    p.complete(0);
    assert.equal(p.isUnlocked(1), true); assert.equal(p.isUnlocked(2), false);
    assert.equal(createStageProgress(10, s).resumeIndex, 1);
    p.complete(1); p.complete(0);
    assert.equal(p.cleared, 2);
    assert.equal(createStageProgress(10, s).resumeIndex, 2);
});
test('final completion stays in bounds and replay does not erase progress', () => {
    const s = store(); const p = createStageProgress(2, s);
    p.complete(0); p.complete(1); p.complete(1);
    assert.equal(p.cleared, 2); assert.equal(p.resumeIndex, 1);
    assert.equal(p.isUnlocked(2), false);
    assert.equal(p.isUnlocked(0.5), false);
    assert.equal(createStageProgress(2, s).cleared, 2);
});
test('corrupt storage resets safely; unavailable storage preserves progress in memory', () => {
    for (const raw of ['{', 'null', '{"version":1,"cleared":-1}', '{"version":1,"cleared":1.5}', '{"version":2,"cleared":9}']) {
        assert.equal(createStageProgress(10, store(raw)).resumeIndex, 0);
    }
    const messages = [];
    const p = createStageProgress(10, { storage() { throw new Error('Blocked'); }, onStatus: m => messages.push(m) });
    assert.doesNotThrow(() => p.complete(0));
    assert.equal(p.resumeIndex, 1); assert.match(messages.at(-1), /session only/);
});
test('saving merges newer progress from another tab', () => {
    const s = store(); const a = createStageProgress(10, s); const b = createStageProgress(10, s);
    a.complete(0); a.complete(1); a.complete(2);
    b.complete(0);
    assert.equal(b.cleared, 3);
    assert.equal(createStageProgress(10, s).cleared, 3);
});

test('intro plays once even before stage 1 is cleared; existing progress skips intro', () => {
    const s = store(); const p = createStageProgress(10, s);
    assert.equal(p.introSeen, false);
    p.markIntroSeen();
    assert.equal(p.cleared, 0);
    assert.equal(createStageProgress(10, s).introSeen, true);
    const old = store(JSON.stringify({ version: 1, cleared: 2 }));
    assert.equal(createStageProgress(10, old).introSeen, true);
});
