export const DRAFT_KEY = 'layer-s-editor-draft-v1';

export function validateDraft(data) {
    if (!data || data.version !== 1) throw new Error('Invalid draft version');
    const { width, height, color, object } = data;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 128 || height > 128) throw new Error('Invalid draft size');
    for (const [rows, allowed] of [[color, '.WRGBYMC'], [object, '.#^O@$']]) {
        if (!Array.isArray(rows) || rows.length !== height || rows.some(row => !Array.isArray(row) || row.length !== width || row.some(cell => typeof cell !== 'string' || cell.length !== 1 || !allowed.includes(cell)))) throw new Error('Invalid draft cells');
    }
    return { width, height, color, object };
}

export function createEditorAutosave({ getMap, onStatus, storage = () => window.localStorage, delay = 500 }) {
    let timer;
    let dirty = false;
    function flush() {
        clearTimeout(timer);
        if (!dirty) return;
        try {
            const draft = { ...getMap(), version: 1, savedAt: Date.now() };
            validateDraft(draft);
            storage().setItem(DRAFT_KEY, JSON.stringify(draft));
            dirty = false;
            onStatus('Autosaved on this browser.');
        } catch {
            onStatus('Autosave failed. Use COPY CODE to keep a backup.');
        }
    }
    return {
        restore() {
            try {
                const raw = storage().getItem(DRAFT_KEY);
                if (!raw) { onStatus('Autosave ready · this browser only.'); return null; }
                const map = validateDraft(JSON.parse(raw));
                onStatus('Autosaved draft restored.');
                return map;
            } catch {
                onStatus('Could not restore autosave. Use LOAD or LOAD WITH CODE.');
                return null;
            }
        },
        changed() {
            dirty = true;
            clearTimeout(timer);
            onStatus('Unsaved changes…');
            timer = setTimeout(flush, delay);
        },
        beforeUnload(event) {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = '';
        },
        flush
    };
}
