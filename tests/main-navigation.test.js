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
test('only first stage with unseen intro redirects to cutscene', () => {
    const play = source.slice(source.indexOf('function playStage('), source.indexOf("continueButton.addEventListener"));
    for (const [index, seen, expected] of [[0, false, 'intro'], [0, true, 'game'], [1, true, 'game']]) {
        let started = null;
        const context = vm.createContext({ gameStarted: false, progress: { introSeen: seen, isUnlocked: () => true }, stageDialog: { close() {} }, window: { location: {} }, startGame(...args) { started = args; } });
        vm.runInContext(play + `\nplayStage(${index});`, context);
        if (expected === 'intro') assert.equal(context.window.location.href, './cutscene.html');
        else assert.equal(started[2], index);
    }
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
