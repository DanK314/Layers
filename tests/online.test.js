import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlineRoom } from '../server/online-worker.js';
import { parseUserMapData } from '../js/user-map.js';

class Socket {
  sent = []; closed = false;
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.closed = true; }
  serializeAttachment(value) { this.meta = structuredClone(value); }
  deserializeAttachment() { return structuredClone(this.meta); }
  accept() {}
}
globalThis.WebSocketPair = class { constructor() { this[0] = new Socket(); this[1] = new Socket(); this[0].sent = this[1].sent; } };
// Node's Response disallows status 101; the Workers runtime supports it.
globalThis.Response = class { constructor(body, options = {}) { Object.assign(this, options); this.body = body; } };
function setup() {
  const data = new Map();
  const sockets = [];
  const ctx = {
    storage: { get: async key => structuredClone(data.get(key)), put: async (key, value) => data.set(key, structuredClone(value)), setAlarm: async () => {}, deleteAll: async () => data.clear() },
    blockConcurrencyWhile: fn => fn(),
    getWebSockets: role => sockets.filter(s => !s.closed && (!role || s.role === role)),
    acceptWebSocket: (ws, [role]) => { ws.role = role; sockets.push(ws); }
  };
  const room = new OnlineRoom(ctx);
  const join = (role, name = role, map = '1') => room.fetch(new Request(`https://example.com/signal/123456?${new URLSearchParams({ role, name, map })}`, { headers: { Upgrade: 'websocket' } }));
  const message = (ws, m) => room.webSocketMessage(ws, JSON.stringify(m));
  return { room, ctx, sockets, data, join, message };
}
test('room admission, full room, and duplicate host', async () => {
  const s = setup();
  assert.equal((await s.join('guest')).webSocket.sent[0].message, 'Room not found.');
  assert.equal((await s.join('host')).status, 101);
  assert.equal(s.sockets[0].sent[0].map, '1');
  assert.equal((await s.join('host')).webSocket.sent[0].type, 'error');
  await s.join('guest');
  assert.equal(s.sockets.length, 2);
  assert.equal(s.sockets[0].sent.at(-1).type, 'paired');
  assert.equal((await s.join('guest')).webSocket.sent[0].type, 'error');
});
test('signaling routes to opponent and enforces offer role', async () => {
  const s = setup(); await s.join('host'); await s.join('guest');
  const [host, guest] = s.sockets;
  const count = host.sent.length;
  await s.message(guest, { type: 'offer', description: 'invalid' });
  assert.equal(host.sent.length, count);
  await s.message(host, { type: 'offer', description: 'offer' });
  assert.equal(guest.sent.at(-1).description, 'offer');
  await s.message(guest, { type: 'candidate', candidate: {} });
  assert.equal(host.sent.at(-1).type, 'candidate');
});
test('both ready start once, pre-start finish ignored, one shared winner', async () => {
  const s = setup(); await s.join('host'); await s.join('guest');
  const [host, guest] = s.sockets;
  await s.message(host, { type: 'ready', hash: 'a'.repeat(64) });
  assert.equal(s.data.get('room').startAt, null);
  await s.message(guest, { type: 'ready', hash: 'a'.repeat(64) });
  const start = s.data.get('room').startAt;
  assert.ok(start > Date.now());
  await s.message(host, { type: 'finish' });
  assert.equal(s.data.get('room').result, null);
  await s.message(host, { type: 'ready', hash: 'a'.repeat(64) });
  assert.equal(s.data.get('room').startAt, start);
  s.data.get('room').startAt = Date.now() - 10;
  await s.message(guest, { type: 'finish' });
  await s.message(host, { type: 'finish' });
  assert.equal(host.sent.at(-1).winner, 'guest');
  assert.deepEqual(host.sent.at(-1), guest.sent.at(-1));
});
test('map mismatch prevents start', async () => {
  const s = setup(); await s.join('host'); await s.join('guest');
  await s.message(s.sockets[0], { type: 'ready', hash: 'a'.repeat(64) });
  await s.message(s.sockets[1], { type: 'ready', hash: 'b'.repeat(64) });
  assert.equal(s.data.get('room').startAt, null);
  assert.equal(s.sockets[0].sent.at(-1).type, 'error');
});
test('disconnect cancels peer; empty room can be reused', async () => {
  const s = setup(); await s.join('host'); await s.join('guest');
  const [host, guest] = s.sockets;
  host.close(); s.room.webSocketClose(host);
  assert.equal(guest.sent.at(-1).type, 'opponent-left');
  assert.equal(guest.closed, true);
  await s.join('host', 'new host', '2');
  assert.equal(s.data.get('room').map, '2');
  assert.equal(s.data.get('room').startAt, null);
});
test('invalid nicknames, oversized messages, and expiry', async () => {
  const s = setup();
  assert.equal((await s.join('host', ' ')).status, 400);
  await s.join('host');
  await s.room.webSocketMessage(s.sockets[0], 'x'.repeat(20001));
  assert.equal(s.sockets[0].closed, true);
  await s.join('host');
  await s.room.alarm();
  assert.equal(s.data.size, 0);
  assert.ok(s.sockets.every(ws => ws.closed));
});
test('shared user map parser validates dimensions and player start', () => {
  const mapData = { width: 3, height: 2, color: [['.', '.', '.'], ['W', 'W', 'W']], object: [['@', '.', '$'], ['#', '#', '#']] };
  const stage = parseUserMapData({ mapData });
  assert.equal(stage.objects.player.length, 1);
  assert.equal(stage.objects.goal.length, 1);
  assert.throws(() => parseUserMapData({ mapData: { ...mapData, width: 129 } }));
  assert.throws(() => parseUserMapData({ mapData: { ...mapData, object: [['.', '.', '$'], ['#', '#', '#']] } }));
});
