// Store map data only; camera, selection and preview state are not edits.
export function createEditorHistory(initial, limit = 50) {
    const states = [JSON.stringify(initial)];
    let index = 0;
    return {
        record(map) {
            const state = JSON.stringify(map);
            if (states[index] === state) return false;
            states.splice(index + 1);
            states.push(state);
            if (states.length > limit + 1) states.shift();
            index = states.length - 1;
            return true;
        },
        undo() { return index > 0 ? JSON.parse(states[--index]) : null; },
        redo() { return index < states.length - 1 ? JSON.parse(states[++index]) : null; },
        get canUndo() { return index > 0; },
        get canRedo() { return index < states.length - 1; }
    };
}

export function historyShortcut(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return null;
    if (event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return null;
    return event.shiftKey ? 'redo' : 'undo';
}
