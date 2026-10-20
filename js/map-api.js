
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
            result.error || `요청 실패: HTTP ${response.status}`
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

export async function loadMap(mapId) {
    const id = String(mapId);

    if (!/^[1-9]\d*$/.test(id)) {
        throw new Error("올바른 맵 번호를 입력하세요.");
    }

    return requestJSON(`/api/maps/${id}`);
}
