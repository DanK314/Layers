import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Audio = class { play() { return Promise.resolve(); } pause() {} };
globalThis.localStorage = { getItem: () => 'false' };
const listeners = new Map();
globalThis.window = {
  innerWidth: 960, innerHeight: 720,
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }
};
function canvas() {
  const draws = [];
  const texts = [];
  const state = { globalAlpha: 1 };
  const stack = [];
  const ctx = new Proxy(state, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'save') return () => stack.push({ ...state });
    if (key === 'restore') return () => { const saved = stack.pop(); for (const k of Object.keys(state)) delete state[k]; Object.assign(state, saved); };
    if (key === 'fillText') return text => texts.push(text);
    if (key === 'fillRect') return (...args) => draws.push({ args, alpha: state.globalAlpha, color: state.fillStyle });
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  return { width: 960, height: 720, draws, texts, getContext: () => ctx };
}
globalThis.document = { documentElement: { dataset: {} }, createElement: () => canvas() };
const { Game } = await import('../js/game.js');
const { parseUserMapData } = await import('../js/user-map.js');
const stage = () => parseUserMapData({ mapData: {
  width: 4, height: 3,
  color: [['.', '.', '.', '.'], ['.', '.', '.', '.'], ['W', 'W', 'W', 'W']],
  object: [['.', '.', '.', '.'], ['@', '.', '.', '$'], ['#', '#', '#', '#']]
} });

test('opponent renders at 50%, does not change own layer or collide', () => {
  const c = canvas();
  const game = new Game(c, stage(), null, false, true);
  const before = game.getOnlineState();
  game.setOpponent({ x: before.x, y: before.y, layer: 'B' });
  assert.deepEqual(game.getOnlineState(), before);
  game.draw(1 / 60);
  assert.ok(c.draws.some(d => d.alpha === 0.5 && d.color === '#FFFFFF'));
  assert.equal(game.getOnlineState().layer, 'R');
  game.cycleLayer();
  assert.equal(game.getOnlineState().layer, 'G');
  game.setOpponent({ x: NaN, y: 0, layer: 'R' });
  game.draw(1 / 60);
  assert.ok(c.draws.every(d => d.args.every(Number.isFinite)));
  game.stop();
});
test('goal freezes online race and emits exactly one finish', () => {
  let finishes = 0;
  const game = new Game(canvas(), stage(), ended => { if (ended) finishes++; }, false, true);
  game.setInput('right', true);
  for (let i = 0; i < 600 && !finishes; i++) game.update(1 / 60);
  assert.equal(finishes, 1);
  const final = game.getOnlineState();
  for (let i = 0; i < 180; i++) game.update(1 / 60);
  game.cycleLayer();
  assert.equal(finishes, 1);
  assert.deepEqual(game.getOnlineState(), final);
  game.stop();
  assert.ok([...listeners.values()].every(set => set.size === 0));
});

test('map countdown blocks keyboard, touch and physics until released', () => {
  const game = new Game(canvas(), stage(), null, false, true);
  game.setCountdownPaused(true);
  const before = game.getOnlineState();
  game.setInput('right', true);
  game.jump(); game.cycleLayer();
  for (const fn of listeners.get('keydown')) fn({ code: 'KeyD', preventDefault() {} });
  for (let i = 0; i < 180; i++) game.update(1 / 60);
  assert.deepEqual(game.getOnlineState(), before);
  game.setCountdownPaused(false);
  game.setInput('right', true);
  game.update(1 / 60);
  assert.ok(game.getOnlineState().x > before.x);
  game.stop();
});

test('campaign starts at selected stage and reports a clear before transitioning', async () => {
  const { stageArray } = await import('../js/map.js');
  const original = stageArray[1];
  stageArray[1] = stage();
  const cleared = [];
  let game;
  try {
    game = new Game(canvas(), null, null, false, false, { stageIndex: 1, onStageCleared: index => cleared.push(index) });
    assert.equal(game.getOnlineState().x, 16);
    game.setInput('right', true);
    for (let i = 0; i < 600 && !cleared.length; i++) game.update(1 / 60);
    assert.deepEqual(cleared, [1]);
    game.retry();
    game.setInput('right', true);
    for (let i = 0; i < 110; i++) game.update(1 / 60);
    assert.deepEqual(cleared, [1]);
  } finally { game?.stop(); stageArray[1] = original; }
});
test('custom and online maps do not report campaign clears', () => {
  for (const online of [false, true]) {
    const cleared = [];
    const game = new Game(canvas(), stage(), null, false, online, { onStageCleared: index => cleared.push(index) });
    game.setInput('right', true);
    for (let i = 0; i < 200; i++) game.update(1 / 60);
    assert.deepEqual(cleared, []);
    game.stop();
  }
});

test('stage clock excludes countdown and resets on retry; only completed user maps get a best', async () => {
  const { bestTimes } = await import('../js/best-times.js');
  const c = canvas();
  const game = new Game(c, stage(), null, false, false, { recordKey: 'user:90001' });
  const time = () => { c.texts.length = 0; game.draw(0); return Number(c.texts.find(t => t.startsWith('TIME ')).split(' ')[1]); };
  assert.equal(bestTimes.get('user:90001'), null);
  game.setCountdownPaused(true);
  for (let i = 0; i < 60; i++) game.update(1 / 60);
  assert.equal(time(), 0);
  game.setCountdownPaused(false);
  for (let i = 0; i < 90; i++) game.update(1 / 60);
  assert.ok(time() > 0);
  assert.equal(bestTimes.get('user:90001'), null);
  game.retry(); assert.equal(time(), 0);
  game.setInput('right', true);
  for (let i = 0; i < 200 && bestTimes.get('user:90001') === null; i++) game.update(1 / 60);
  const best = bestTimes.get('user:90001');
  assert.ok(best > 0);
  const finished = time();
  for (let i = 0; i < 180; i++) game.update(1 / 60);
  assert.equal(time(), finished);
  game.stop();
});
test('next campaign stage starts at zero instead of carrying the previous timer', async () => {
  const { stageArray } = await import('../js/map.js');
  const originals = [stageArray[0], stageArray[1]];
  stageArray[0] = stage(); stageArray[1] = stage();
  const c = canvas(); let cleared = false;
  const game = new Game(c, null, null, false, false, { onStageCleared() { cleared = true; } });
  try {
    game.setInput('right', true);
    for (let i = 0; i < 600 && !cleared; i++) game.update(1 / 60);
    assert.equal(cleared, true);
    for (let i = 0; i < 65; i++) game.update(1 / 60);
    c.texts.length = 0; game.draw(0);
    assert.ok(c.texts.includes('TIME 0.00 s'));
  } finally { game.stop(); [stageArray[0], stageArray[1]] = originals; }
});

test('custom keyboard bindings control actual movement and layer changes in Game', async () => {
  const { keyBindings } = await import('../js/keybindings.js');
  let game;
  try {
    keyBindings.set('left', 'ArrowLeft'); keyBindings.set('layer', 'Space');
    game = new Game(canvas(), stage());
    for (let i = 0; i < 50; i++) game.update(1 / 60);
    const initial = game.getOnlineState();
    for (const fn of listeners.get('keydown')) fn({ code: 'KeyA', preventDefault() {} });
    game.update(1 / 60);
    assert.equal(game.getOnlineState().x, initial.x);
    for (const fn of listeners.get('keydown')) fn({ code: 'ArrowLeft', preventDefault() {} });
    game.update(1 / 60);
    assert.ok(game.getOnlineState().x < initial.x);
    for (const fn of listeners.get('keyup')) fn({ code: 'ArrowLeft', ctrlKey: true });
    for (const fn of listeners.get('keydown')) fn({ code: 'Space', preventDefault() {} });
    assert.equal(game.getOnlineState().layer, 'G');
    for (const fn of listeners.get('keydown')) fn({ code: 'Enter', preventDefault() {} });
    assert.equal(game.getOnlineState().layer, 'G');
  } finally { game?.stop(); keyBindings.reset(); }
});
