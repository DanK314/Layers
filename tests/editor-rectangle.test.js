import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fillRectangle, rectangleBounds } from '../js/editor-rectangle.js';
import { createEditorHistory } from '../js/editor-history.js';
const map = () => ({ width: 3, height: 3, color: Array.from({length:3},()=>Array(3).fill('.')), object: Array.from({length:3},()=>Array(3).fill('.')) });
test('reverse rectangle includes both endpoints; erasing clears color; bounds stay in map', () => {
    const m = map();
    assert.equal(fillRectangle(m, {x:2,y:2}, {x:0,y:1}, '#', 'R'), true);
    assert.deepEqual(m.object, [['.','.','.'], ['#','#','#'], ['#','#','#']]);
    assert.equal(fillRectangle(m, {x:2,y:2}, {x:0,y:1}, '#', 'R'), false);
    fillRectangle(m, {x:-1,y:1}, {x:9,y:1}, '.', 'G');
    assert.deepEqual(m.color[1], ['.','.','.']);
});
test('real pointer handlers preview then fill once, undo as a group, and cancel without edits', () => {
    const source = readFileSync(new URL('../js/editor.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const a = source.indexOf('canvas.addEventListener(\n    "pointerdown"');
    const b = source.indexOf('canvas.addEventListener("wheel"', a);
    const finish = source.slice(source.indexOf('function finishPointerInteraction('), source.indexOf('window.addEventListener("pointerup"'));
    const handlers = {}; const m = map(); const history = createEditorHistory(m); let changes = 0;
    const context = vm.createContext({ fillRectangle, rectangleBounds,
        canvas: { addEventListener(type, fn) { handlers[type] = fn; }, setPointerCapture() {}, classList: { add() {}, remove() {} } },
        currentMap: () => m, recordHistory: () => history.record(m), mapChanged() { changes++; }, draw() {},
        getCellFromMouse: event => event.cell, getCellSize: () => 64 });
    vm.runInContext(`let editorTool='rectangle', rectangleStart=null, rectangleEnd=null;
      let isMouseDown=false, isPanning=false, lastPanPoint=null, activePointerId=null;
      let panModeEnabled=false, ignorePointersUntilReleased=false, pinchStart=null;
      const activePointers=new Map(); const selectedObject='#', selectedColor='W';
      ${source.slice(a,b)}\n${finish}\nglobalThis.finish=finishPointerInteraction;`, context);
    const event = (type, cell) => ({ type, cell, pointerId:1, pointerType:'mouse', button:0, preventDefault() {} });
    handlers.pointerdown(event('pointerdown',{x:0,y:0}));
    handlers.pointermove(event('pointermove',{x:1,y:1}));
    assert.equal(m.object[0][0], '.');
    context.finish(event('pointerup',{x:1,y:1}));
    assert.equal(changes, 1); assert.equal(m.object[1][1], '#');
    assert.deepEqual(history.undo(), map()); assert.equal(history.canUndo, false);
    handlers.pointerdown(event('pointerdown',{x:2,y:2}));
    context.finish(event('pointercancel',{x:2,y:2}));
    assert.equal(m.object[2][2], '.'); assert.equal(changes, 1);
});
