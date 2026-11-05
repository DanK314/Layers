export function createMapVerification() {
    let revision = 0;
    let verified = null;
    const snapshot = map => JSON.stringify(map);
    return {
        begin(map) { return { revision, snapshot: snapshot(map) }; },
        invalidate() { revision++; verified = null; },
        complete(attempt, map) {
            if (attempt.revision !== revision || attempt.snapshot !== snapshot(map)) return false;
            verified = attempt.snapshot;
            return true;
        },
        isVerified(map) { return verified !== null && verified === snapshot(map); }
    };
}
