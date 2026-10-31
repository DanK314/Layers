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
  const state = { globalAlpha: 1 };
  const stack = [];
  const ctx = new Proxy(state, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'save') return () => stack.push({ ...state });
    if (key === 'restore') return () => { const saved = stack.pop(); for (const k of Object.keys(state)) delete state[k]; Object.assign(state, saved); };
    if (key === 'fillRect') return (...args) => draws.push({ args, alpha: state.globalAlpha, color: state.fillStyle });
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  return { width: 960, height: 720, draws, getContext: () => ctx };
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
