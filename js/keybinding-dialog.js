import { keyBindings, keyLabel } from './keybindings.js';
export function setupKeyBindingDialog(dialog) {
    const list = dialog.querySelector('[data-binding-list]');
    const status = dialog.querySelector('[data-binding-status]');
    let capture = null;
    const buttons = new Map();
    const labels = { left: 'MOVE LEFT', right: 'MOVE RIGHT', jump: 'JUMP', layer: 'CHANGE LAYER' };
    function render() {
        for (const [action, button] of buttons) button.textContent = capture === action ? 'PRESS A KEY…' : keyLabel(keyBindings.get()[action]);
        for (const hint of document.querySelectorAll('[data-key-hint]')) hint.textContent = keyLabel(keyBindings.get()[hint.dataset.keyHint]);
    }
    for (const [action, label] of Object.entries(labels)) {
        const row = document.createElement('div');
        const text = document.createElement('span'); text.textContent = label;
        const button = document.createElement('button'); button.type = 'button';
        button.setAttribute('aria-label', `Change ${label.toLowerCase()} key`);
        button.addEventListener('click', () => { capture = action; status.textContent = 'Press a key. ESC cancels.'; render(); });
        buttons.set(action, button); row.append(text, button); list.append(row);
    }
    dialog.addEventListener('keydown', event => {
        if (!capture) return;
        event.preventDefault(); event.stopPropagation();
        if (event.code === 'Escape') { capture = null; status.textContent = 'Key change cancelled.'; render(); return; }
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        try {
            const saved = keyBindings.set(capture, event.code);
            capture = null;
            status.textContent = saved ? 'Key binding saved.' : 'Applied for this session. Browser storage is unavailable.';
            render();
        } catch (error) { status.textContent = error.message; }
    });
    dialog.querySelector('[data-binding-reset]').addEventListener('click', () => { capture = null; const saved = keyBindings.reset(); status.textContent = saved ? 'Default keys restored.' : 'Defaults applied for this session.'; render(); });
    dialog.querySelector('[data-binding-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { capture = null; render(); });
    render();
    return () => { capture = null; status.textContent = 'Select an action to change its key.'; render(); dialog.showModal(); buttons.get('left').focus(); };
}
