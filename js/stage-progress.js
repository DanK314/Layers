export const INTRO_KEY = 'layer-s-intro-seen-v1';
export const PROGRESS_KEY = 'layer-s-stage-progress-v1';

export function createStageProgress(count, { storage = () => window.localStorage, onStatus = () => {} } = {}) {
    let cleared = 0;
    try {
        const raw = storage().getItem(PROGRESS_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            if (saved?.version !== 1 || !Number.isInteger(saved.cleared) || saved.cleared < 0) throw new Error('Invalid progress');
            cleared = Math.min(saved.cleared, count);
        }
    } catch {
        onStatus('Could not read saved progress. Progress will be kept for this session.');
    }
    let introSeen = cleared > 0;
    try { introSeen ||= storage().getItem(INTRO_KEY) === 'true'; } catch {}
    return {
        get introSeen() { return introSeen; },
        markIntroSeen() {
            introSeen = true;
            try { storage().setItem(INTRO_KEY, 'true'); }
            catch { onStatus('Could not save intro history. It will be kept for this session only.'); }
        },
        get cleared() { return cleared; },
        get resumeIndex() { return Math.min(cleared, count - 1); },
        isUnlocked(index) { return Number.isInteger(index) && index >= 0 && index < count && index <= cleared; },
        complete(index) {
            if (!this.isUnlocked(index) || index < cleared) return false;
            cleared = index + 1;
            try {
                // Keep the furthest progress if another tab completed a stage meanwhile.
                const raw = storage().getItem(PROGRESS_KEY);
                const saved = raw ? JSON.parse(raw) : null;
                if (saved?.version === 1 && Number.isInteger(saved.cleared) && saved.cleared > cleared) cleared = Math.min(saved.cleared, count);
            } catch {}
            try {
                storage().setItem(PROGRESS_KEY, JSON.stringify({ version: 1, cleared }));
                onStatus('Progress saved on this browser.');
            } catch {
                onStatus('Could not save progress. It will be kept for this session only.');
            }
            return true;
        }
    };
}
