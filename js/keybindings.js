export const BINDINGS_KEY = 'layer-s-keybindings-v1';
export const DEFAULT_BINDINGS = Object.freeze({ left: 'KeyA', right: 'KeyD', jump: 'KeyW', layer: 'Enter' });
export const keyLabel = code => code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, 'ARROW ').toUpperCase();
const allowed = code => /^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Enter|Numpad[0-9])$/.test(code);
export function createKeyBindings(storage = () => window.localStorage) {
    let values = { ...DEFAULT_BINDINGS };
    try {
        const saved = JSON.parse(storage().getItem(BINDINGS_KEY));
        if (saved && Object.keys(DEFAULT_BINDINGS).every(action => allowed(saved[action])) && new Set(Object.keys(DEFAULT_BINDINGS).map(action => saved[action])).size === 4) values = Object.fromEntries(Object.keys(DEFAULT_BINDINGS).map(action => [action, saved[action]]));
    } catch {}
    function persist() { try { storage().setItem(BINDINGS_KEY, JSON.stringify(values)); return true; } catch { return false; } }
    return {
        get: () => ({ ...values }),
        set(action, code) {
            if (!(action in DEFAULT_BINDINGS) || !allowed(code)) throw new Error('Choose a letter, number, arrow key, SPACE or ENTER.');
            if (Object.entries(values).some(([other, value]) => other !== action && value === code)) throw new Error('That key is already assigned to another action.');
            values[action] = code;
            return persist();
        },
        reset() { values = { ...DEFAULT_BINDINGS }; return persist(); },
        action(event) {
            if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return null;
            return Object.keys(values).find(action => values[action] === event.code) || null;
        }
    };
}
export const keyBindings = createKeyBindings();
