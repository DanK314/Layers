import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
test('HOME removes only startGame, keeps other URL data, and clears startup overlay', () => {
    let home; let replaced; const removed = [];
    const element = { classList: { remove(...names) { removed.push(...names); } } };
    const context = vm.createContext({ URL, homeButton: { addEventListener(type, fn) { home = fn; } },
        window: { location: { href: 'https://game.example/index.html?startGame=1&other=ok#menu' }, history: { state: { x: 1 }, replaceState(state, title, url) { replaced = { state, url }; } } },
        document: { documentElement: element }, backgroundMusic: { pause() {} }, gameScreen: element, titleScreen: element, updateMenu() {} });
    const start = source.indexOf('homeButton.addEventListener(');
    const end = source.indexOf('retryButton.addEventListener(', start);
    vm.runInContext('let gameStarted = true, game = { stop() {} };\n' + source.slice(start, end), context);
    home();
    assert.equal(replaced.url, 'https://game.example/index.html?other=ok#menu');
    assert.equal(replaced.state.x, 1);
    assert.ok(removed.includes('starting-game'));
});
test('first stage always redirects to cutscene regardless of intro history', () => {
    const play = source.slice(source.indexOf('function playStage('), source.indexOf("continueButton.addEventListener"));
    for (const [index, seen, expected] of [[0, false, 'intro'], [0, true, 'intro'], [1, true, 'game']]) {
        let started = null;
        const context = vm.createContext({ gameStarted: false, progress: { introSeen: seen, isUnlocked: () => true }, stageDialog: { close() {} }, window: { location: {} }, startGame(...args) { started = args; } });
        vm.runInContext(play + `\nplayStage(${index});`, context);
        if (expected === 'intro') assert.equal(context.window.location.href, './cutscene.html');
        else assert.equal(started[2], index);
    }
});

test('returning from the story starts stage 1 even with later saved progress', () => {
    let started;
    const context = vm.createContext({ sharedMapId: null, startAfterCutscene: true,
        progress: { resumeIndex: 5, markIntroSeen() {} },
        startGame(...args) { started = args; } });
    vm.runInContext(source.slice(source.lastIndexOf('if (sharedMapId)')), context);
    assert.deepEqual(started, [null, true, 0]);
});

test('Escape skips the story through the normal completion route', () => {
    const cutscene = readFileSync(new URL('../cutscene.js', import.meta.url), 'utf8');
    let keydown; let prevented = false;
    const context = vm.createContext({ window: { location: {}, addEventListener(type, fn) { keydown = fn; } } });
    const start = cutscene.indexOf('function onCutsceneEnd()');
    const end = cutscene.indexOf('// Resize', start);
    vm.runInContext(cutscene.slice(start, end), context);
    keydown({ key: 'Enter' });
    assert.equal(context.window.location.href, undefined);
    keydown({ key: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(context.window.location.href, './index.html?startGame=1');
});

test('only the final campaign stage opens ending, after progress is saved', () => {
    const handler = source.slice(source.indexOf('function onCampaignStageCleared('), source.indexOf('function playStage('));
    const calls = [];
    const location = { set href(value) { calls.push(value); } };
    const context = vm.createContext({ stageArray: Array(10), progress: { complete(index) { calls.push(index); } }, window: { location } });
    vm.runInContext(handler + '\nonCampaignStageCleared(8);', context);
    assert.deepEqual(calls, [8]);
    vm.runInContext('onCampaignStageCleared(9);', context);
    assert.deepEqual(calls, [8, 9, './ending.html']);
});
