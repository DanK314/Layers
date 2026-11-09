import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { copyRegion, pasteRegion, clipboardShortcut } from '../js/editor-clipboard.js';
import { createEditorHistory } from '../js/editor-history.js';
import { rectangleBounds } from '../js/editor-rectangle.js';
const makeMap = () => ({ width: 4, height: 3, object: [['#','^','.','.'],['.','O','.','.'],['.','.','.','.']], color: [['R','G','.','.'],['.','B','.','.'],['.','.','.','.']] });

test('copy snapshots both layers, reversed selection, empty cells and overlapping paste', () => {
    const m = makeMap();
    const clip = copyRegion(m, {x:1,y:1}, {x:0,y:0});
    assert.deepEqual(clip.object, [['#','^'],['.','O']]);
    m.object[0][0] = '$';
    assert.equal(clip.object[0][0], '#');
    assert.equal(pasteRegion(m, clip, {x:1,y:0}), true);
    assert.deepEqual(m.object[0], ['$','#','^','.']);
    assert.deepEqual(m.color[1], ['.','.','B','.']);
    assert.equal(pasteRegion(m, clip, {x:1,y:0}), false);
    assert.equal(pasteRegion(m, clip, {x:3,y:2}), true);
    assert.equal(m.object[2][3], '#');
    assert.equal(m.object.length, 3);
    assert.ok(m.object.every(row => row.length === 4));
});
test('clipboard shortcuts support Ctrl and Cmd while preserving native field editing', () => {
    assert.equal(clipboardShortcut({key:'C',ctrlKey:true}), 'copy');
    assert.equal(clipboardShortcut({key:'v',metaKey:true}), 'paste');
    for (const extra of [{altKey:true},{shiftKey:true},{isComposing:true},{target:{closest:()=>({})}}]) {
        assert.equal(clipboardShortcut({key:'c',ctrlKey:true,...extra}), null);
    }
});
test('real touch and mouse handlers select without painting and paste as one undoable edit', () => {
    const source = readFileSync(new URL('../js/editor.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const a = source.indexOf('canvas.addEventListener(\n    "pointerdown"');
    const b = source.indexOf('canvas.addEventListener("wheel"', a);
    const finish = source.slice(source.indexOf('function finishPointerInteraction('), source.indexOf('window.addEventListener("pointerup"'));
    for (const pointerType of ['mouse', 'touch']) {
        const m = makeMap(), history = createEditorHistory(m), handlers = {};
        let changes = 0;
        const context = vm.createContext({ pasteRegion, rectangleBounds,
            canvas: {addEventListener(t,f){handlers[t]=f;},setPointerCapture(){},classList:{add(){},remove(){}}},
            currentMap:()=>m, recordHistory:()=>history.record(m), mapChanged(){changes++;}, draw(){},
            getCellFromMouse:e=>e.cell, getCanvasPoint:(x,y)=>({x,y}), getCellSize:()=>64,
            copySelectionButton:{disabled:true}, clipboardStatus:{}, toolButtons:[], MAP_WIDTH:4, MAP_HEIGHT:3 });
        vm.runInContext(`let editorTool='select', rectangleStart=null, rectangleEnd=null, selection=null, clipboard=null, pasteTarget=null;
            let isMouseDown=false,isPanning=false,lastPanPoint=null,activePointerId=null,panModeEnabled=false,ignorePointersUntilReleased=false,pinchStart=null;
            const activePointers=new Map();
            ${source.slice(a,b)}\n${finish}\nglobalThis.finish=finishPointerInteraction;`, context);
        const event=(type,x,y)=>({type,cell:{x,y},clientX:x,clientY:y,pointerId:1,pointerType,button:0,preventDefault(){}});
        handlers.pointerdown(event('pointerdown',0,0));
        handlers.pointermove(event('pointermove',1,1));
        context.finish(event('pointerup',1,1));
        assert.equal(changes,0);
        context.clip = copyRegion(m,{x:0,y:0},{x:1,y:1});
        vm.runInContext("clipboard=clip; editorTool='paste';",context);
        handlers.pointerdown(event('pointerdown',2,1));
        context.finish(event('pointerup',2,1));
        assert.equal(changes,1);
        assert.equal(m.object[1][2],'#');
        assert.equal(m.color[2][3],'B');
        assert.deepEqual(history.undo(),makeMap());
        assert.equal(history.canUndo,false);
        vm.runInContext("editorTool='paste';",context);
        handlers.pointerdown(event('pointerdown',0,2));
        context.finish(event('pointercancel',0,2));
        assert.equal(changes,1, 'cancelled touch must not paste');

    }
});
