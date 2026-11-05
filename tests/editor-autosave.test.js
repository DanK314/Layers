import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorAutosave, DRAFT_KEY } from '../js/editor-autosave.js';
const map = () => ({ width: 2, height: 1, color: [['W', '.']], object: [['#', '.']] });
function setup(initial) {
    const data = new Map(initial ? [[DRAFT_KEY, initial]] : []);
    let current = map();
    let writes = 0;
    const statuses = [];
    const save = createEditorAutosave({ getMap: () => current, onStatus: s => statuses.push(s), delay: 5,
        storage: () => ({ getItem: key => data.get(key), setItem(key, value) { writes++; data.set(key, value); } }) });
    return { save, data, statuses, setMap: value => { current = value; }, writes: () => writes };
}
test('debounces changes and restores the latest unfinished map independently of manual saves', async () => {
    const s = setup();
    assert.equal(s.save.restore(), null);
    s.save.changed();
    s.setMap({ width: 1, height: 1, color: [['R']], object: [['.']] });
    s.save.changed();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(s.writes(), 1);
    const restored = setup(s.data.get(DRAFT_KEY)).save.restore();
    assert.deepEqual(restored, { width: 1, height: 1, color: [['R']], object: [['.']] });
    assert.equal(s.data.has('layer-s-map'), false);
});
test('flush saves immediately and does not write when unchanged; clear persists as empty cells', () => {
    const s = setup();
    s.save.flush(); assert.equal(s.writes(), 0);
    s.save.changed(); s.save.flush();
    s.setMap({ width: 1, height: 1, color: [['.']], object: [['.']] });
    s.save.changed(); s.save.flush(); s.save.flush();
    assert.equal(s.writes(), 2);
    assert.deepEqual(setup(s.data.get(DRAFT_KEY)).save.restore().object, [['.']]);
});
test('invalid stored drafts are rejected without deleting the stored value', () => {
    for (const raw of ['{bad', 'null', JSON.stringify({ ...map(), version: 2 }), JSON.stringify({ ...map(), version: 1, width: 129 }), JSON.stringify({ ...map(), version: 1, object: [['<', '.']] })]) {
        const s = setup(raw);
        assert.equal(s.save.restore(), null);
        assert.equal(s.data.get(DRAFT_KEY), raw);
        assert.match(s.statuses.at(-1), /Could not restore/);
    }
});
test('blocked storage and quota failures do not crash editing and can retry', () => {
    let fail = true; let writes = 0; const statuses = [];
    const save = createEditorAutosave({ getMap: map, onStatus: s => statuses.push(s), storage: () => {
        if (fail) throw new Error('Blocked');
        return { setItem() { writes++; } };
    } });
    assert.equal(save.restore(), null);
    save.changed(); save.flush();
    assert.match(statuses.at(-1), /failed/);
    fail = false; save.flush();
    assert.equal(writes, 1);
});

test('leaving warns only while changes are pending or storage fails', () => {
    let fail = false;
    const save = createEditorAutosave({ getMap: map, onStatus() {}, storage: () => ({
        setItem() { if (fail) throw new Error('Quota exceeded'); }
    }) });
    function warns() {
        const event = { prevented: false, preventDefault() { this.prevented = true; } };
        save.beforeUnload(event);
        if (event.prevented) assert.equal(event.returnValue, '');
        return event.prevented;
    }
    assert.equal(warns(), false);
    save.changed();
    assert.equal(warns(), true);
    save.flush();
    assert.equal(warns(), false);
    fail = true;
    save.changed(); save.flush();
    assert.equal(warns(), true);
    fail = false; save.flush();
    assert.equal(warns(), false);
});
