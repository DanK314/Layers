import { listMaps } from "./map-api.js";
import { createMapPreview } from "./map-preview.js";

export function createMapBrowser(root, onSelect, { getBestTime = () => null } = {}) {
    const searchInput = root.querySelector("[data-map-search]");
    const searchButton = root.querySelector("[data-map-search-button]");
    const searchClear = root.querySelector("[data-map-search-clear]");
    const searchControls = root.querySelector("[data-map-search-controls]");
    let search = "";
    const list = root.querySelector("[data-map-list]");
    const status = root.querySelector("[data-map-status]");
    const refresh = root.querySelector("[data-map-refresh]");
    const previous = root.querySelector("[data-map-previous]");
    const next = root.querySelector("[data-map-next]");
    const pageLabel = root.querySelector("[data-map-page]");
    const pagination = root.querySelector(".map-pagination");
    const preview = createMapPreview(root.querySelector("[data-map-preview]"), {
        onSelect,
        getBestTime,
        onOpen() {
            if (searchControls) searchControls.hidden = true;
            list.hidden = true;
            pagination.hidden = true;
            status.hidden = true;
            refresh.hidden = true;
            root.closest("dialog")?.scrollTo({ top: 0, behavior: "auto" });
        },
        onClose() {
            list.hidden = false;
            if (searchControls) searchControls.hidden = false;
            pagination.hidden = false;
            status.hidden = false;
            refresh.hidden = false;
        }
    });
    let controller = null;
    let pages = [];
    let pageIndex = -1;
    let busy = false;
    let selecting = false;

    function controls() {
        refresh.disabled = busy || selecting;
        if (searchButton) searchButton.disabled = selecting;
        if (searchClear) searchClear.disabled = selecting;
        previous.disabled = busy || selecting || pageIndex <= 0;
        next.disabled = busy || selecting || !pages[pageIndex]?.nextCursor;
        pageLabel.textContent = pageIndex < 0 ? "PAGE 1" : `PAGE ${pageIndex + 1}`;
        for (const button of list.querySelectorAll("button")) button.disabled = busy || selecting;
    }
    function row(map) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-list-item";
        const title = document.createElement("span");
        title.className = "map-list-title";
        title.textContent = map.title;
        const metadata = document.createElement("span");
        metadata.className = "map-list-meta";
        metadata.textContent = `#${map.id}`;
        if (map.createdAt) {
            const time = document.createElement("time");
            time.dateTime = map.createdAt;
            time.textContent = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(map.createdAt));
            metadata.append(" · ", time);
        }
        const best = getBestTime(map.id);
        if (best !== null) metadata.append(` · BEST ${best.toFixed(2)} s`);
        const action = document.createElement("span");
        action.className = "map-list-action";
        action.textContent = "PREVIEW →";
        button.append(title, metadata, action);
        button.addEventListener("click", () => {
            if (busy || selecting) return;
            void preview.open(map);
        });
        item.append(button);
        return item;
    }
    function showList() {
        preview.cancel();
        list.hidden = false;
        if (searchControls) searchControls.hidden = false;
        pagination.hidden = false;
        status.hidden = false;
        refresh.hidden = false;
    }
    function render() {
        showList();
        list.replaceChildren(...pages[pageIndex].maps.map(row));
        status.textContent = pages[pageIndex].maps.length
            ? "Newest maps first. Select a map to preview." : search ? "No maps match your search." : "No maps have been published yet.";
        controls();
        root.closest("dialog")?.scrollTo({ top: 0, behavior: "auto" });
    }
    async function load(target = 0, refreshPage = false) {
        if (selecting || busy || target < 0) return;
        if (refreshPage) { showList(); preview.clearCache(); }
        if (!refreshPage && pages[target]) {
            pageIndex = target;
            render();
            return;
        }
        const cursor = target === 0 ? null : pages[target - 1]?.nextCursor;
        if (target > 0 && !cursor) return;
        controller?.abort();
        const request = controller = new AbortController();
        const timeout = setTimeout(() => request.abort(), 15000);
        busy = true;
        status.textContent = `Loading page ${target + 1}…`;
        controls();
        try {
            const result = await listMaps({ cursor, search, signal: request.signal });
            if (controller !== request || request.signal.aborted) return;
            const unique = new Map(result.maps.map(map => [map.id, map]));
            const page = {
                maps: [...unique.values()],
                nextCursor: result.nextCursor === cursor ? null : result.nextCursor
            };
            if (refreshPage) pages = [];
            pages[target] = page;
            pageIndex = target;
            render();
        } catch (error) {
            if (controller !== request) return;
            status.textContent = request.signal.aborted ? "The map list took too long to load. Please try again." : error.message;
        } finally {
            clearTimeout(timeout);
            if (controller === request) { busy = false; controls(); }
        }
    }
    function applySearch(clear = false) {
        if (selecting) return;
        search = clear ? "" : searchInput.value.trim();
        if (clear) searchInput.value = "";
        controller?.abort();
        controller = null;
        busy = false;
        pages = [];
        pageIndex = -1;
        list.replaceChildren();
        void load(0, true);
    }
    searchButton?.addEventListener("click", () => applySearch());
    searchClear?.addEventListener("click", () => applySearch(true));
    searchInput?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); applySearch(); }
    });
    searchInput?.addEventListener("search", () => { if (!searchInput.value) applySearch(true); });
    refresh.addEventListener("click", () => void load(0, true));
    previous.addEventListener("click", () => void load(pageIndex - 1));
    next.addEventListener("click", () => void load(pageIndex + 1));
    controls();
    return {
        refresh: () => load(0, true),
        cancel() { preview.cancel(); controller?.abort(); controller = null; busy = false; controls(); }
    };
}
