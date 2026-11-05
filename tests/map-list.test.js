import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../server/map-worker.js';
import { listMaps, loadMap } from '../js/map-api.js';

function setup(t) {
    const db = new DatabaseSync(':memory:');
    t.after(() => db.close());
    db.exec('CREATE TABLE maps (id INTEGER PRIMARY KEY, title TEXT, data TEXT, created_at INTEGER, request_token TEXT); CREATE INDEX maps_recent_created_at_id ON maps(created_at DESC, id DESC);');
    const mapData = { width: 2, height: 1, color: [['W', 'W']], object: [['@', '$']] };
    for (const [id, title, created] of [[1, 'Oldest', 100], [2, 'Same second A', 200], [3, 'Same second B', 200], [4, 'Newest', 300]]) {
        db.prepare('INSERT INTO maps VALUES (?, ?, ?, ?, ?)').run(id, title, JSON.stringify(mapData), created, `request-${id}`);
    }
    const env = { DB: { prepare(sql) {
        const statement = db.prepare(sql);
        return { bind(...params) { return {
            all: async () => ({ results: statement.all(...params) }),
            first: async () => statement.get(...params) ?? null
        }; } };
    } } };
    const request = (query = '') => worker.fetch(new Request(`https://maps.example/api/maps${query}`), env);
    return { db, env, request, mapData };
}

test('map listing uses newest creation date and descending ID for ties, without map bodies', async t => {
    const { request } = setup(t);
    const response = await request();
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.maps.map(m => m.id), [4, 3, 2, 1]);
    assert.equal(body.nextCursor, null);
    assert.ok(body.maps.every(m => !('data' in m) && !('mapData' in m) && !('request_token' in m)));
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});
test('keyset pagination avoids duplicates when a newer map arrives between requests', async t => {
    const { db, request } = setup(t);
    const first = await (await request('?limit=2')).json();
    assert.deepEqual(first.maps.map(m => m.id), [4, 3]);
    assert.equal(first.nextCursor, '200:3');
    db.prepare('INSERT INTO maps VALUES (?, ?, ?, ?, ?)').run(5, 'Just published', '{}', 400, 'new');
    const second = await (await request(`?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`)).json();
    assert.deepEqual(second.maps.map(m => m.id), [2, 1]);
    assert.equal(second.nextCursor, null);
});
test('invalid limits and cursors are rejected before querying', async t => {
    const { request } = setup(t);
    for (const query of ['?limit=0', '?limit=51', '?limit=2.5', '?limit=', '?cursor=bad', '?cursor=1:0', '?cursor=9007199254740992:1']) {
        assert.equal((await request(query)).status, 400, query);
    }
});
test('existing individual map lookup still returns the map data', async t => {
    const { env, mapData } = setup(t);
    const response = await worker.fetch(new Request('https://maps.example/api/maps/2'), env);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mapId, 2);
    assert.deepEqual(body.mapData, mapData);
});
test('frontend reads Unix creation times and follows the server cursor', async t => {
    const { env } = setup(t);
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    let url;
    globalThis.fetch = (input, options) => { url = new URL(input); return worker.fetch(new Request(input, options), env); };
    const result = await listMaps();
    assert.deepEqual(result.maps.map(m => m.id), ['4', '3', '2', '1']);
    assert.equal(result.maps[0].createdAt, '1970-01-01T00:05:00.000Z');
    await listMaps({ cursor: '200:3' });
    assert.equal(url.searchParams.get('cursor'), '200:3');
    assert.equal((await loadMap(2)).mapId, 2);
});
test('frontend gives an English fallback while the old Worker is deployed', async t => {
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Old API' }), { status: 405 });
    await assert.rejects(() => listMaps(), /Recent maps are not available yet/);
});
