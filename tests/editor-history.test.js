import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createEditorHistory, historyShortcut } from '../js/editor-history.js';
const map = value => ({ width: 1, height: 1, color: [['W']], object: [[value]] });
test('history restores map dimensions and cells without sharing live arrays', () => {
    const initial = map('.');
    const h = createEditorHistory(initial);
    initial.object[0][0] = '#'; h.record(initial);
    h.record({ width: 2, height: 1, color: [['R', 'G']], object: [['@', '$']] });
    const previous = h.undo(); assert.equal(previous.width, 1); assert.equal(previous.object[0][0], '#');
    previous.object[0][0] = '^';
    assert.deepEqual(h.undo(), map('.'));
    assert.deepEqual(h.redo(), map('#'));
    assert.equal(h.redo().width, 2);
    assert.equal(h.redo(), null);
});
test('no-op edits preserve redo; new edits replace redo; history is bounded', () => {
    const h = createEditorHistory(map('.'), 2);
    h.record(map('#')); h.record(map('^')); h.record(map('@'));
    assert.deepEqual(h.undo(), map('^'));
    assert.equal(h.record(map('^')), false);
    assert.equal(h.canRedo, true);
    h.record(map('$'));
    assert.equal(h.canRedo, false);
    assert.deepEqual(h.undo(), map('^'));
    assert.deepEqual(h.undo(), map('#'));
    assert.equal(h.undo(), null);
});
test('Ctrl/Cmd shortcuts preserve text field undo and reject other modifier combinations', () => {
    const event = { key: 'z', ctrlKey: true };
    assert.equal(historyShortcut(event), 'undo');
    assert.equal(historyShortcut({ ...event, key: 'Z', shiftKey: true }), 'redo');
    assert.equal(historyShortcut({ key: 'z', metaKey: true }), 'undo');
    assert.equal(historyShortcut({ ...event, altKey: true }), null);
    assert.equal(historyShortcut({ ...event, target: { closest: () => ({}) } }), null);
});
test('actual paint handlers group a drag into one edit and undo/redo triggers autosave', () => {
    const source = readFileSync(new URL('../js/editor.js', import.meta.url), 'utf8');
    const functions = source.slice(source.indexOf('function currentMap()'), source.indexOf("undoButton.addEventListener"));
    const paint = source.slice(source.indexOf('function paintCell('), source.indexOf('canvas.addEventListener(', source.indexOf('function paintCell(')));
    const finish = source.slice(source.indexOf('function finishPointerInteraction('), source.indexOf('window.addEventListener("pointerup"'));
    const context = vm.createContext({ createEditorHistory, document: { querySelector: () => null } });
    vm.runInContext(`
      let MAP_WIDTH = 2, MAP_HEIGHT = 1;
      let colorMap = [['.', '.']], objectMap = [['.', '.']];
      let selectedColor = 'R', selectedObject = '#';
      let previewGame = null, editHistory;
      const undoButton = {}, redoButton = {}, mapWidthInput = {}, mapHeightInput = {};
      let saves = 0; const autosave = { changed() { saves++; } };
      function draw() {} function recenterMapView() {} function mapChanged() { autosave.changed(); }
      const activePointers = new Map(); let pinchStart, ignorePointersUntilReleased;
      let isMouseDown, isPanning, lastPanPoint, activePointerId, rectangleStart, rectangleEnd;
      const canvas = { classList: { remove() {} } };
      ${functions}\n${paint}\n${finish}
      editHistory = createEditorHistory(currentMap());
      paintCell(0, 0); paintCell(1, 0);
      finishPointerInteraction();
      travelHistory('undo');
      globalThis.afterUndo = JSON.stringify(currentMap());
      globalThis.onlyOneEdit = !editHistory.canUndo;
      travelHistory('redo');
      globalThis.afterRedo = JSON.stringify(currentMap());
      globalThis.saveCount = saves;
    `, context);
    assert.deepEqual(JSON.parse(context.afterUndo).object, [['.', '.']]);
    assert.deepEqual(JSON.parse(context.afterRedo).object, [['#', '#']]);
    assert.equal(context.onlyOneEdit, true);
    assert.equal(context.saveCount, 4);
});
