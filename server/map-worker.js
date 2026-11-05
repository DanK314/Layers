
const COOLDOWN_SECONDS = 600;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_WIDTH = 128;
const MAX_HEIGHT = 128;

const VALID_COLORS = new Set([".", "R", "G", "B", "Y", "M", "C", "W"]);
const VALID_OBJECTS = new Set([".", "#", "^", "O", "@", "$"]);

const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
};

// ==================================================
// Response / CORS
// ==================================================

function getAllowedOrigin(request, env) {
    const origin = request.headers.get("Origin");
    const configured = (env.ALLOWED_ORIGIN || "*")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);

    if (!origin) {
        return configured.includes("*") ? "*" : configured[0] || "null";
    }

    if (configured.includes("*")) {
        return "*";
    }

    return configured.includes(origin) ? origin : null;
}

function json(data, status, origin, extraHeaders = {}) {
    const headers = new Headers(JSON_HEADERS);

    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin");

    if (origin) {
        headers.set("Access-Control-Allow-Origin", origin);
    }

    for (const [key, value] of Object.entries(extraHeaders)) {
        headers.set(key, value);
    }

    return new Response(JSON.stringify(data), {
        status,
        headers
    });
}

function errorResponse(message, status, origin, extraHeaders = {}) {
    return json({ success: false, error: message }, status, origin, extraHeaders);
}

// ==================================================
// Map Validation
// Data format: { width, height, color, object }
// ==================================================

function validateMap(map) {
    if (!map || typeof map !== "object" || Array.isArray(map)) {
        return "맵 데이터 형식이 올바르지 않습니다.";
    }

    const { width, height, color, object } = map;

    if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 1 ||
        width > MAX_WIDTH ||
        height < 1 ||
        height > MAX_HEIGHT
    ) {
        return `맵 크기는 가로 1~${MAX_WIDTH}, 세로 1~${MAX_HEIGHT}여야 합니다`;
    }

    if (!Array.isArray(color) || !Array.isArray(object)) {
        return "color와 object는 2차원 배열이어야 합니다.";
    }

    if (color.length !== height || object.length !== height) {
        return "맵의 세로 크기와 데이터가 일치하지 않습니다.";
    }

    let playerCount = 0;
    let goalCount = 0;

    for (let y = 0; y < height; y++) {
        if (
            !Array.isArray(color[y]) ||
            !Array.isArray(object[y]) ||
            color[y].length !== width ||
            object[y].length !== width
        ) {
            return `${y}번째 행의 가로 크기가 올바르지 않습니다.`;
        }

        for (let x = 0; x < width; x++) {
            const c = color[y][x];
            const o = object[y][x];

            if (typeof c !== "string" || !VALID_COLORS.has(c)) {
                return `잘못된 색상 데이터: (${x}, ${y})`;
            }

            if (typeof o !== "string" || !VALID_OBJECTS.has(o)) {
                return `잘못된 오브젝트 데이터: (${x}, ${y})`;
            }

            // 빈 칸은 색상도 비어 있어야 함
            if (o === "." && c !== ".") {
                return `빈 칸에 색상이 지정되어 있습니다: (${x}, ${y})`;
            }

            // 오브젝트가 있으면 색상도 지정되어 있어야 함
            if (o !== "." && c === ".") {
                return `오브젝트의 색상이 없습니다: (${x}, ${y})`;
            }

            if (o === "@") playerCount++;
            if (o === "$") goalCount++;
        }
    }

    if (playerCount !== 1) {
        return "플레이어 시작 지점(@)은 정확히 하나여야 합니다.";
    }

    if (goalCount !== 1) {
        return "골 지점($)은 정확히 하나여야 합니다.";
    }

    return null;
}

// ==================================================
// IP Hash
// Store only a hash of the client IP
// ==================================================

async function hashIP(ip, secret) {
    const data = new TextEncoder().encode(`${secret}:${ip}`);
    const digest = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

// ==================================================
// Router
// ==================================================

export default {
    async fetch(request, env) {
        const origin = getAllowedOrigin(request, env);
        const url = new URL(request.url);
        const path = url.pathname;

        if (!origin) {
            return errorResponse("허용되지 않은 Origin입니다.", 403, null);
        }

        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Max-Age": "86400",
                    "Vary": "Origin"
                }
            });
        }

        if (!env.DB) {
            return errorResponse("D1 데이터베이스 바인딩(DB)이 없습니다.", 500, origin);
        }

        try {
            // GET /api/maps?limit=20&cursor=CREATED_AT:ID
            // Return metadata only, newest first, using a stable keyset cursor.
            if (path === "/api/maps" && request.method === "GET") {
                const rawLimit = url.searchParams.get("limit") ?? "20";
                if (!/^[1-9]\d*$/.test(rawLimit) || Number(rawLimit) > 50) {
                    return errorResponse("Limit must be between 1 and 50.", 400, origin);
                }
                const limit = Number(rawLimit);
                const cursor = url.searchParams.get("cursor");
                let beforeTime;
                let beforeId;
                if (cursor !== null) {
                    const parts = /^(0|[1-9]\d*):([1-9]\d*)$/.exec(cursor);
                    if (!parts || !Number.isSafeInteger(Number(parts[1])) ||
                        !Number.isSafeInteger(Number(parts[2]))) {
                        return errorResponse("Invalid map list cursor.", 400, origin);
                    }
                    beforeTime = Number(parts[1]);
                    beforeId = Number(parts[2]);
                }
                const statement = cursor === null
                    ? env.DB.prepare(`
                        SELECT id, title, created_at FROM maps
                        ORDER BY created_at DESC, id DESC LIMIT ?
                    `).bind(limit + 1)
                    : env.DB.prepare(`
                        SELECT id, title, created_at FROM maps
                        WHERE created_at < ? OR (created_at = ? AND id < ?)
                        ORDER BY created_at DESC, id DESC LIMIT ?
                    `).bind(beforeTime, beforeTime, beforeId, limit + 1);
                const { results } = await statement.all();
                const page = results.slice(0, limit);
                const last = page[page.length - 1];
                return json({
                    success: true,
                    maps: page.map(row => ({
                        id: row.id,
                        title: row.title,
                        createdAt: row.created_at
                    })),
                    nextCursor: results.length > limit && last
                        ? `${last.created_at}:${last.id}` : null
                }, 200, origin);
            }

            // ==================================================
            // POST /api/maps
            // Upload map
            // ==================================================

            if (path === "/api/maps" && request.method === "POST") {
                const contentLength = Number(request.headers.get("Content-Length") || 0);

                if (contentLength > MAX_BODY_BYTES) {
                    return errorResponse("요청 데이터가 너무 큽니다.", 413, origin);
                }

                const rawBody = await request.text();

                if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
                    return errorResponse("요청 데이터가 너무 큽니다.", 413, origin);
                }

                let body;

                try {
                    body = JSON.parse(rawBody);
                } catch {
                    return errorResponse("JSON 형식이 올바르지 않습니다.", 400, origin);
                }

                const title =
                    typeof body.title === "string"
                        ? body.title.trim()
                        : "Untitled";

                const mapData = body.mapData;
                const validationError = validateMap(mapData);

                if (validationError) {
                    return errorResponse(validationError, 400, origin);
                }

                if (!title || title.length > 60) {
                    return errorResponse("맵 제목은 1~60자여야 합니다.", 400, origin);
                }

                // Cloudflare가 제공하는 클라이언트 IP
                const ip = request.headers.get("CF-Connecting-IP");

                if (!ip) {
                    return errorResponse("클라이언트 IP를 확인할 수 없습니다.", 400, origin);
                }

                if (!env.IP_HASH_SECRET) {
                    return errorResponse("IP_HASH_SECRET 설정이 필요합니다.", 500, origin);
                }

                const ipHash = await hashIP(ip, env.IP_HASH_SECRET);
                const now = Math.floor(Date.now() / 1000);
                const attemptToken = crypto.randomUUID();
                const requestToken = crypto.randomUUID();

                // IP별 업로드 제한을 원자적으로 확보
                const claim = await env.DB.prepare(`
                    INSERT INTO upload_limits (ip_hash, last_upload, attempt_token)
                    VALUES (?, ?, ?)
                    ON CONFLICT(ip_hash) DO UPDATE SET
                        last_upload = excluded.last_upload,
                        attempt_token = excluded.attempt_token
                    WHERE upload_limits.last_upload <= ?
                `).bind(
                    ipHash,
                    now,
                    attemptToken,
                    now - COOLDOWN_SECONDS
                ).run();

                if (claim.meta.changes !== 1) {
                    const limit = await env.DB.prepare(`
                        SELECT last_upload
                        FROM upload_limits
                        WHERE ip_hash = ?
                    `).bind(ipHash).first();

                    const retryAfter = Math.max(
                        1,
                        (limit?.last_upload ?? now) + COOLDOWN_SECONDS - now
                    );

                    return errorResponse(
                        "업로드는 10분에 한 번만 가능합니다.",
                        429,
                        origin,
                        { "Retry-After": String(retryAfter) }
                    );
                }

                // 확보한 토큰이 아직 유효할 때만 맵 저장
                const insert = await env.DB.prepare(`
                    INSERT INTO maps (title, data, created_at, request_token)
                    SELECT ?, ?, ?, ?
                    WHERE EXISTS (
                        SELECT 1
                        FROM upload_limits
                        WHERE ip_hash = ?
                          AND attempt_token = ?
                    )
                `).bind(
                    title,
                    JSON.stringify(mapData),
                    now,
                    requestToken,
                    ipHash,
                    attemptToken
                ).run();

                if (insert.meta.changes !== 1) {
                    return errorResponse(
                        "업로드 처리에 실패했습니다. 다시 시도해 주세요.",
                        409,
                        origin
                    );
                }

                const saved = await env.DB.prepare(`
                    SELECT id, title, created_at
                    FROM maps
                    WHERE request_token = ?
                `).bind(requestToken).first();

                if (!saved) {
                    return errorResponse("저장된 맵을 확인할 수 없습니다.", 500, origin);
                }

                return json({
                    success: true,
                    mapId: saved.id,
                    title: saved.title,
                    createdAt: saved.created_at
                }, 201, origin);
            }

            // ==================================================
            // GET /api/maps/:id
            // Fetch map by ID
            // ==================================================

            const match = path.match(/^\/api\/maps\/([1-9]\d*)$/);

            if (match && request.method === "GET") {
                const mapId = Number(match[1]);

                if (!Number.isSafeInteger(mapId)) {
                    return errorResponse("올바른 맵 번호가 아닙니다.", 400, origin);
                }

                const row = await env.DB.prepare(`
                    SELECT id, title, data, created_at
                    FROM maps
                    WHERE id = ?
                `).bind(mapId).first();

                if (!row) {
                    return errorResponse("해당 맵을 찾을 수 없습니다.", 404, origin);
                }

                let mapData;

                try {
                    mapData = JSON.parse(row.data);
                } catch {
                    return errorResponse("저장된 맵 데이터가 손상되었습니다.", 500, origin);
                }

                return json({
                    success: true,
                    mapId: row.id,
                    title: row.title,
                    mapData,
                    createdAt: row.created_at
                }, 200, origin);
            }

            if (path === "/api/maps" || match) {
                return errorResponse("지원하지 않는 HTTP 메서드입니다.", 405, origin);
            }

            return errorResponse("요청한 API를 찾을 수 없습니다.", 404, origin);

        } catch (error) {
            console.error("LAYER:S API error:", error);

            return errorResponse(
                "서버 내부 오류가 발생했습니다.",
                500,
                origin
            );
        }
    }
};