export const BEST_TIMES_KEY = 'layer-s-best-times-v1';
export function createBestTimes(storage = () => window.localStorage) {
    const memory = new Map();
    const validKey = key => /^(stage|user):[1-9]\d*$/.test(key);
    function read(key) {
        let saved;
        try { saved = JSON.parse(storage().getItem(BEST_TIMES_KEY) || '{}')[key]; } catch {}
        const local = memory.get(key);
        const times = [saved, local].filter(time => typeof time === 'number' && Number.isFinite(time) && time > 0);
        return times.length ? Math.min(...times) : null;
    }
    return {
        get(key) { return validKey(key) ? read(key) : null; },
        record(key, seconds) {
            if (!validKey(key) || !Number.isFinite(seconds) || seconds <= 0) return null;
            const best = Math.min(read(key) ?? Infinity, seconds);
            memory.set(key, best);
            try {
                let data;
                try { data = JSON.parse(storage().getItem(BEST_TIMES_KEY) || '{}'); } catch {}
                if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
                data[key] = best;
                storage().setItem(BEST_TIMES_KEY, JSON.stringify(data));
            } catch {}
            return best;
        }
    };
}
export const bestTimes = createBestTimes();
