export function bindStageKeyboard(dialog, grid, continueButton, backButton) {
    const directions = {
        ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0],
        ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1]
    };
    dialog.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        const direction = directions[event.code];
        if (!direction && event.code !== 'Enter' && event.code !== 'NumpadEnter') return;
        event.preventDefault();
        event.stopPropagation();
        const buttons = [...grid.querySelectorAll('button')];
        const positions = [
            { button: continueButton, row: -1, col: 0 },
            ...buttons.map((button, i) => ({ button, row: Math.floor(i / 2), col: i % 2 })),
            { button: backButton, row: -2, col: 0 }
        ].filter(p => !p.button.disabled);
        const current = positions.find(p => p.button === dialog.ownerDocument.activeElement) || positions[0];
        if (!direction) {
            if (!event.repeat) current.button.click();
            return;
        }
        const [dy, dx] = direction;
        const candidates = positions.filter(p => dy
            ? (p.row - current.row) * dy > 0
            : p.row === current.row && (p.col - current.col) * dx > 0);
        candidates.sort((a, b) => dy
            ? Math.abs(a.row - current.row) - Math.abs(b.row - current.row) || Math.abs(a.col - current.col) - Math.abs(b.col - current.col)
            : Math.abs(a.col - current.col) - Math.abs(b.col - current.col));
        const next = candidates[0] || current;
        next.button.focus();
        next.button.scrollIntoView({ block: 'nearest' });
    });
}
