import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const source = readFileSync(new URL('../js/online.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
function client(role = 'host') {
  const elements = new Map();
  const windowEvents = {};
  const documentEvents = {};
  const controls = ['left', 'right', 'jump', 'layer'].map(control => ({
    dataset: { control }, events: {}, disabled: false, classList: { add() {}, remove() {} },
    addEventListener(type, fn) { this.events[type] = fn; }, setPointerCapture() {}
  }));
  const timers = new Map();
  const intervals = new Map();
  let next = 0;
  let now = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: false, textContent: '', events: {}, addEventListener(type, fn) { this.events[type] = fn; }, querySelectorAll() { return []; } });
    return elements.get(id);
  };
  const socketInstances = [];
  class Socket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor(url) { this.url = url; socketInstances.push(this); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    close() { this.readyState = 3; }
  }
  class Peer {
    remoteDescription = null;
    async setLocalDescription(description) { this.localDescription = description; }
    async setRemoteDescription(description) { this.remoteDescription = description; }
    async createOffer() { return { type: 'offer', sdp: 'test-offer' }; }
    async createAnswer() { return { type: 'answer', sdp: 'test-answer' }; }
    async addIceCandidate() {}
    createDataChannel() { return { readyState: 'open', sent: [], send(raw) { this.sent.push(JSON.parse(raw)); }, close() {} }; }
    close() {}
  }
  class Game {
    constructor(canvas, stage, onFinish) { this.onFinish = onFinish; }
    setCountdownPaused(paused) { this.paused = paused; }
    inputs = [];
    setInput(control, active) { this.inputs.push([control, active]); }
    jump() { this.jumps = (this.jumps || 0) + 1; }
    cycleLayer() { this.layers = (this.layers || 0) + 1; }
    run() {}
    stop() {}
    freezeRace() { this.frozen = true; }
    getOnlineState() { return { x: 0, y: 0, layer: 'R' }; }
  }
  const context = vm.createContext({
    Game, loadMap: async () => ({ mapData: { sample: 'map' } }),
    parseUserMapData: () => ({ objects: { goal: [{}] } }),
    SIGNAL_ORIGIN: 'https://online-test.kimdanoo-mnp.workers.dev', SIGNAL_PROTOCOL: 'relay', ICE_SERVERS: [],
    WebSocket: Socket, RTCPeerConnection: Peer, URL, URLSearchParams, AbortController, TextEncoder, crypto: webcrypto,
    performance: { now: () => now },
    setTimeout(fn) { const id = ++next; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    setInterval(fn) { const id = ++next; intervals.set(id, fn); return id; }, clearInterval(id) { intervals.delete(id); },
    window: { isSecureContext: true, RTCPeerConnection: Peer, addEventListener(type, fn) { windowEvents[type] = fn; } },
    document: { addEventListener(type, fn) { documentEvents[type] = fn; }, getElementById: element, querySelectorAll: selector => selector === '[data-control]' ? controls : [], body: { classList: { add() {}, remove() {} } } }
  });
  vm.runInContext(source + '\n globalThis.api = { message, relayControl, ready, attachChannel, getSession: () => session };', context);
  element('nickname').value = role === 'host' ? 'Alice' : 'Bob';
  element('room').value = '123456';
  element('map').value = role === 'host' ? '42' : '';
  element('room-form').events.submit({ preventDefault() {}, submitter: { value: role } });
  return { timers, controls, windowEvents, documentEvents, api: context.api, s: context.api.getSession(), element, sockets: socketInstances, advance(ms = 4000) { now += ms; for (const fn of [...intervals.values()]) fn(); } };
}
test('Live Server client uses Cloudflare WSS and a 12-digit room', () => {
  const c = client();
  assert.equal(c.sockets[0].url.origin, 'wss://online-test.kimdanoo-mnp.workers.dev');
  assert.equal(c.sockets[0].url.pathname, '/signal/000000123456');
});
test('existing relay handshake includes host map and nickname', async () => {
  const c = client();
  await c.api.message(c.s, { type: 'ready', role: 'host' });
  assert.ok(c.s.stage);
  await c.api.message(c.s, { type: 'guest-joined' });
  const offer = c.sockets[0].sent.find(m => m.type === 'offer');
  assert.equal(offer.map, '42');
  assert.equal(offer.name, 'Alice');
  assert.equal(offer.game, 'layers-dual-v1');
  assert.equal(offer.description.type, 'offer');
});
test('guest loads host map and returns nickname using the old relay', async () => {
  const c = client('guest');
  await c.api.message(c.s, { type: 'ready', role: 'guest' });
  await c.api.message(c.s, { type: 'offer', map: '42', name: 'Alice', game: 'layers-dual-v1', description: { type: 'offer', sdp: 'test' } });
  const answer = c.sockets[0].sent.find(m => m.type === 'answer');
  assert.equal(answer.name, 'Bob');
  assert.equal(answer.description.type, 'answer');
  assert.equal(c.element('players').textContent, 'Alice vs Bob · Room 123456');
});
test('relay mode matches hashes, starts, and delivers a single shared result', async () => {
  const c = client();
  await c.api.message(c.s, { type: 'ready', role: 'host' });
  await c.api.message(c.s, { type: 'guest-joined' });
  await c.api.message(c.s, { type: 'answer', name: 'Bob', game: 'layers-dual-v1', description: { type: 'answer', sdp: 'test' } });
  c.api.ready(c.s);
  c.api.relayControl(c.s, { type: 'race-ready', hash: c.s.hash });
  assert.ok(c.s.channel.sent.some(m => m.type === 'race-start'));
  c.advance();
  assert.ok(c.s.game);
  c.api.relayControl(c.s, { type: 'race-finish' });
  assert.equal(c.element('status').textContent, 'Bob wins! You lost.');
  assert.equal(c.s.channel.sent.at(-1).winner, 'guest');
  c.s.game.onFinish(true);
  assert.equal(c.element('status').textContent, 'Bob wins! You lost.');
});
test('relay rejects maps with different hashes and incompatible games', async () => {
  const c = client();
  await c.api.message(c.s, { type: 'ready', role: 'host' });
  await c.api.message(c.s, { type: 'guest-joined' });
  c.api.ready(c.s);
  c.api.relayControl(c.s, { type: 'race-ready', hash: '0'.repeat(64) });
  assert.equal(c.s.closed, true);
  assert.match(c.element('status').textContent, /map versions do not match/);
  const guest = client('guest');
  await guest.api.message(guest.s, { type: 'offer', name: 'Demo' });
  assert.match(guest.element('status').textContent, /incompatible game/);
});

test('real map is rendered before centered 3-2-1, and input unlocks after 1', async () => {
  const c = client();
  await c.api.message(c.s, { type: 'ready', role: 'host' });
  await c.api.message(c.s, { type: 'guest-joined' });
  c.api.ready(c.s);
  c.api.relayControl(c.s, { type: 'race-ready', hash: c.s.hash });
  assert.ok(c.s.game);
  assert.equal(c.s.game.paused, true);
  assert.equal(c.element('arena').hidden, false);
  assert.equal(c.element('countdown').textContent, '3');
  c.advance(1000);
  assert.equal(c.element('countdown').textContent, '2');
  assert.equal(c.s.game.paused, true);
  c.advance(1000);
  assert.equal(c.element('countdown').textContent, '1');
  assert.equal(c.s.raceStarted, undefined);
  c.advance(1000);
  assert.equal(c.s.game.paused, false);
  assert.equal(c.s.raceStarted, true);
  assert.equal(c.element('countdown').hidden, true);
});

test('mobile multi-touch moves and jumps together, releases on cancel and blur', async () => {
  const c = client();
  await c.api.message(c.s, { type: 'ready', role: 'host' });
  await c.api.message(c.s, { type: 'guest-joined' });
  c.api.ready(c.s);
  c.api.relayControl(c.s, { type: 'race-ready', hash: c.s.hash });
  const [left, right, jump, layer] = c.controls;
  const pointer = pointerId => ({ pointerId, preventDefault() {} });
  left.events.pointerdown(pointer(1));
  assert.equal(c.s.game.inputs.length, 0);
  assert.ok(c.controls.every(button => button.disabled));
  c.advance();
  assert.ok(c.controls.every(button => !button.disabled));
  right.events.pointerdown(pointer(1));
  jump.events.pointerdown(pointer(2));
  layer.events.pointerdown(pointer(3));
  assert.deepEqual(c.s.game.inputs.at(-1), ['right', true]);
  assert.equal(c.s.game.jumps, 1);
  assert.equal(c.s.game.layers, 1);
  right.events.pointercancel(pointer(1));
  assert.deepEqual(c.s.game.inputs.at(-1), ['right', false]);
  left.events.pointerdown(pointer(4));
  left.events.pointerdown(pointer(5));
  left.events.pointerup(pointer(4));
  assert.deepEqual(c.s.game.inputs.at(-1), ['left', true]);
  left.events.lostpointercapture(pointer(5));
  assert.deepEqual(c.s.game.inputs.at(-1), ['left', false]);
  right.events.pointerdown(pointer(6));
  c.windowEvents.blur();
  right.events.pointerdown(pointer(7));
  right.events.pointerup(pointer(7));
  assert.deepEqual(c.s.game.inputs.at(-1), ['right', false]);
});

test('room submission opens dedicated waiting screen and cancel returns to lobby', () => {
  const c = client();
  assert.equal(c.element('lobby').hidden, true);
  assert.equal(c.element('waiting').hidden, false);
  assert.equal(c.element('arena').hidden, true);
  assert.equal(c.element('waiting-room').textContent, '123456');
  assert.equal(c.element('waiting-map').textContent, '42');
  c.element('reset').events.click();
  assert.equal(c.api.getSession(), null);
  assert.equal(c.element('lobby').hidden, false);
  assert.equal(c.element('waiting').hidden, true);
  assert.equal(c.s.closed, true);
});
test('already-open incoming DataChannel marks guest ready without a new open event', async () => {
  const c = client('guest');
  await c.api.message(c.s, { type: 'ready', role: 'guest' });
  await c.api.message(c.s, { type: 'offer', map: '42', name: 'Alice', game: 'layers-dual-v1', description: { type: 'offer', sdp: 'test' } });
  const channel = { readyState: 'open', sent: [], send(raw) { this.sent.push(JSON.parse(raw)); }, close() {} };
  c.api.attachChannel(c.s, channel);
  assert.equal(c.s.ready, true);
  assert.equal(channel.sent[0].type, 'race-ready');
  assert.equal(c.s.peerTimeout, null);
});
test('P2P deadline survives guest map loading and reports failure on waiting screen', async () => {
  const c = client('guest');
  await c.api.message(c.s, { type: 'ready', role: 'guest' });
  const deadline = c.s.peerTimeout;
  assert.ok(c.timers.has(deadline));
  await c.api.message(c.s, { type: 'offer', map: '42', name: 'Alice', game: 'layers-dual-v1', description: { type: 'offer', sdp: 'test' } });
  assert.ok(c.timers.has(deadline));
  c.timers.get(deadline)();
  assert.equal(c.s.closed, true);
  assert.equal(c.element('waiting').hidden, false);
  assert.equal(c.element('waiting-title').textContent, 'Connection stopped');
  assert.match(c.element('status').textContent, /Could not connect/);
  assert.equal(c.element('reset').textContent, 'BACK TO LOBBY');
});
test('map transition hides dedicated waiting screen for the complete countdown', async () => {
  const c = client();
  await c.api.message(c.s, { type: 'ready', role: 'host' });
  await c.api.message(c.s, { type: 'guest-joined' });
  c.api.relayControl(c.s, { type: 'race-ready', hash: c.s.hash });
  assert.equal(c.element('waiting').hidden, true);
  assert.equal(c.element('lobby').hidden, true);
  assert.equal(c.element('arena').hidden, false);
  assert.equal(c.element('countdown').textContent, '3');
});

for (const role of ['host', 'guest']) {
  test(`${role} sees the correct victory/defeat screen with match details`, async () => {
    const c = client(role);
    c.s.names = { host: 'Alice', guest: 'Bob' };
    await c.api.message(c.s, { type: 'welcome', role, map: '42' });
    await c.api.message(c.s, { type: 'result', winner: 'host', name: 'Alice' });
    assert.equal(c.element('result-screen').hidden, false);
    assert.equal(c.element('result-title').textContent, role === 'host' ? 'VICTORY' : 'DEFEAT');
    assert.equal(c.element('result-winner').textContent, 'Alice');
    assert.equal(c.element('result-match').textContent, 'Alice vs Bob');
    assert.equal(c.element('result-map').textContent, '42');
    assert.equal(c.element('result-room').textContent, '123456');
    assert.equal(c.element('arena').hidden, true);
    assert.equal(c.element('waiting').hidden, true);
    c.timers.get(c.s.timeout)();
    assert.equal(c.element('result-screen').hidden, false);
    assert.equal(c.s.closed, true);
    c.element('result-lobby').events.click();
    assert.equal(c.element('result-screen').hidden, true);
    assert.equal(c.element('lobby').hidden, false);
    assert.equal(c.api.getSession(), null);
  });
}
