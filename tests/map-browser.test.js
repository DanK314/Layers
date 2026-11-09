import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/map-browser.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
class Element {
    children = []; events = {}; textContent = ''; disabled = false;
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(type, fn) { this.events[type] = fn; }
    querySelectorAll() { return this.children.map(item => item.children[0]); }
}
function setup() {
    const parts = new Map(['list', 'status', 'refresh', 'previous', 'next', 'page', 'pagination', 'search', 'search-button', 'search-clear', 'search-controls'].map(key => [key, new Element()]));
    const calls = [];
    const searches = [];
    let fail = false;
    let pending = null;
    const context = vm.createContext({
        AbortController, setTimeout, clearTimeout, Intl, Date,
        createMapPreview: () => ({ open() {}, cancel() {}, clearCache() {} }),
        document: { createElement: () => new Element() },
        listMaps: async ({ cursor, search }) => {
            searches.push(search);
            if (pending) { const promise = pending; pending = null; return promise; }
            calls.push(cursor);
            if (fail) throw new Error('Network unavailable');
            const start = cursor === null ? 40 : 20;
            return { maps: Array.from({ length: 20 }, (_, i) => ({ id: String(start - i), title: `Map ${start - i}` })), nextCursor: cursor === null ? 'cursor-2' : null };
        }
    });
    vm.runInContext(source + '\nglobalThis.create = createMapBrowser;', context);
    const root = { querySelector: selector => parts.get(selector === ".map-pagination" ? "pagination" : selector.slice(10, -1)), closest: () => null };
    const browser = context.create(root, () => {});
    return { browser, parts, calls, searches, deferNext() { let resolve; pending = new Promise(done => { resolve = done; }); return resolve; }, setFail(value) { fail = value; } };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('pages replace the 20 rows and previous reuses its original page', async () => {
    const { browser, parts, calls } = setup();
    await browser.refresh();
    assert.equal(parts.get('list').children.length, 20);
    assert.equal(parts.get('page').textContent, 'PAGE 1');
    assert.equal(parts.get('previous').disabled, true);
    assert.equal(parts.get('next').disabled, false);
    parts.get('next').events.click();
    await settled();
    assert.equal(parts.get('list').children.length, 20);
    assert.equal(parts.get('list').children[0].children[0].children[0].textContent, 'Map 20');
    assert.equal(parts.get('page').textContent, 'PAGE 2');
    assert.equal(parts.get('next').disabled, true);
    parts.get('previous').events.click();
    await settled();
    assert.equal(parts.get('page').textContent, 'PAGE 1');
    assert.equal(parts.get('list').children[0].children[0].children[0].textContent, 'Map 40');
    assert.deepEqual(calls, [null, 'cursor-2']);
});
test('failed navigation keeps current page and can retry; refresh returns to page one', async () => {
    const { browser, parts, calls, searches, setFail } = setup();
    await browser.refresh();
    setFail(true);
    parts.get('next').events.click();
    await settled();
    assert.equal(parts.get('page').textContent, 'PAGE 1');
    assert.equal(parts.get('list').children.length, 20);
    assert.equal(parts.get('next').disabled, false);
    assert.equal(parts.get('status').textContent, 'Network unavailable');
    setFail(false);
    parts.get('next').events.click();
    await settled();
    await browser.refresh();
    assert.equal(parts.get('page').textContent, 'PAGE 1');
    assert.equal(parts.get('previous').disabled, true);
    assert.equal(calls.at(-1), null);
});

test('search resets pagination, Enter does not submit map loading, and clear restores all maps', async () => {
    const { browser, parts, searches, calls } = setup();
    await browser.refresh();
    parts.get('next').events.click(); await settled();
    parts.get('search').value = '  castle  ';
    let prevented = false;
    parts.get('search').events.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
    await settled();
    assert.equal(prevented, true);
    assert.equal(searches.at(-1), 'castle');
    assert.equal(calls.at(-1), null);
    assert.equal(parts.get('page').textContent, 'PAGE 1');
    parts.get('next').events.click(); await settled();
    assert.equal(searches.at(-1), 'castle');
    assert.equal(calls.at(-1), 'cursor-2');
    parts.get('search-clear').events.click(); await settled();
    assert.equal(searches.at(-1), '');
    assert.equal(parts.get('search').value, '');
    assert.equal(parts.get('page').textContent, 'PAGE 1');
});

test('a late response from an earlier search cannot replace the newest results', async () => {
    const { browser, parts, deferNext } = setup();
    await browser.refresh();
    const resolveOld = deferNext();
    parts.get('search').value = 'old';
    parts.get('search-button').events.click();
    parts.get('search').value = 'new';
    parts.get('search-button').events.click();
    await settled();
    resolveOld({ maps: [{id:'999',title:'Stale result'}], nextCursor:null });
    await settled();
    assert.equal(parts.get('list').children[0].children[0].children[0].textContent, 'Map 40');
    assert.equal(parts.get('refresh').disabled, false);
});
