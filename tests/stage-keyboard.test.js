import test from 'node:test';
import assert from 'node:assert/strict';
import { bindStageKeyboard } from '../js/stage-keyboard.js';
function setup() {
    const doc = { activeElement: null }; let handler;
    const button = (name, disabled = false) => ({ name, disabled, clicks: 0, focus() { doc.activeElement = this; }, click() { this.clicks++; }, scrollIntoView() {} });
    const start = button('continue'), back = button('back');
    const stages = Array.from({ length: 10 }, (_, i) => button(String(i + 1), i > 4));
    bindStageKeyboard({ ownerDocument: doc, addEventListener(type, fn) { handler = fn; } }, { querySelectorAll: () => stages }, start, back);
    start.focus();
    return { doc, start, back, stages, press(code, extra = {}) { const event = { code, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra }; handler(event); return event; } };
}
test('stage arrow/WASD navigation follows two columns, skips locks, and reaches back', () => {
    const s = setup();
    s.press('KeyS'); assert.equal(s.doc.activeElement, s.stages[0]);
    s.press('KeyD'); assert.equal(s.doc.activeElement, s.stages[1]);
    s.press('ArrowDown'); assert.equal(s.doc.activeElement, s.stages[3]);
    s.press('KeyA'); assert.equal(s.doc.activeElement, s.stages[2]);
    s.press('KeyS'); assert.equal(s.doc.activeElement, s.stages[4]);
    s.press('ArrowRight'); assert.equal(s.doc.activeElement, s.stages[4]);
    s.press('ArrowDown'); assert.equal(s.doc.activeElement, s.stages[4]);
    s.press('ArrowUp'); assert.equal(s.doc.activeElement, s.stages[2]);
    s.press('KeyW'); assert.equal(s.doc.activeElement, s.stages[0]);
    s.press('KeyW'); assert.equal(s.doc.activeElement, s.start);
    s.press('KeyW'); assert.equal(s.doc.activeElement, s.back);
    s.press('KeyS'); assert.equal(s.doc.activeElement, s.start);
});
test('Enter activates once and stops propagation; modifiers and Tab keep native behavior', () => {
    const s = setup();
    const e = s.press('Enter');
    assert.equal(s.start.clicks, 1); assert.equal(e.prevented, true); assert.equal(e.stopped, true);
    s.press('Enter', { repeat: true }); assert.equal(s.start.clicks, 1);
    s.press('KeyS', { ctrlKey: true }); assert.equal(s.doc.activeElement, s.start);
    assert.equal(s.press('Tab').prevented, undefined);
    s.back.focus(); s.press('NumpadEnter'); assert.equal(s.back.clicks, 1);
});
