
const API_BASE = "https://layers-server.kimdanoo-mnp.workers.dev";

async function requestJSON(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            result.error || `Request failed: HTTP ${response.status}`
        );

        error.status = response.status;
        error.retryAfter = result.retryAfter;
        throw error;
    }

    return result;
}

export async function uploadMap(mapData, title = "Untitled") {
    return requestJSON("/api/maps", {
        method: "POST",
        body: JSON.stringify({
            title,
            mapData
        })
    });
}

export async function loadMap(mapId, options = {}) {
    const id = String(mapId);

    if (!/^[1-9]\d*$/.test(id)) {
        throw new Error("Enter a valid map number.");
    }

    return requestJSON(`/api/maps/${id}`, options);
}

// The listing endpoint returns metadata only, in creation order (newest first).
export async function listMaps({ cursor = null, search = "", signal } = {}) {
    const query = new URLSearchParams({ limit: "20" });
    if (search.trim()) query.set("q", search.trim());
    if (cursor !== null) query.set("cursor", String(cursor));
    let result;
    try {
        result = await requestJSON(`/api/maps?${query}`, { signal });
    } catch (error) {
        if (error.status === 404 || error.status === 405) {
            throw new Error("Recent maps are not available yet. You can still enter a map number or share link below.");
        }
        throw error;
    }
    if (!Array.isArray(result.maps)) throw new Error("The map list could not be read. Please try again.");
    const maps = result.maps.map(map => {
        const id = String(map.id ?? map.mapId ?? "");
        if (!/^[1-9]\d*$/.test(id)) throw new Error("The map list contains an invalid map number.");
        const rawDate = map.createdAt ?? map.created_at;
        const milliseconds = typeof rawDate === "number" ? rawDate * 1000 : Date.parse(rawDate);
        const createdAt = Number.isFinite(milliseconds) && Math.abs(milliseconds) <= 8640000000000000
            ? new Date(milliseconds).toISOString() : null;
        return { id, title: typeof map.title === "string" && map.title.trim() ? map.title : "Untitled", createdAt };
    });
    maps.sort((a, b) => {
        const dateOrder = (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
        if (dateOrder) return dateOrder;
        return BigInt(a.id) < BigInt(b.id) ? 1 : BigInt(a.id) > BigInt(b.id) ? -1 : 0;
    });
    return { maps, nextCursor: result.nextCursor ?? null };
}
