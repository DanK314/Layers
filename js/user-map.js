import { MapParser } from "./map.js";

export function parseUserMapData(response) {
    const mapData = response?.mapData;

    if (
        !mapData ||
        !Number.isInteger(mapData.width) ||
        !Number.isInteger(mapData.height) ||
        mapData.width < 1 ||
        mapData.height < 1 ||
        mapData.width > 128 ||
        mapData.height > 128 ||
        !Array.isArray(mapData.color) ||
        !Array.isArray(mapData.object) ||
        mapData.color.length !== mapData.height ||
        mapData.object.length !== mapData.height
    ) {
        throw new Error("The uploaded map data is invalid.");
    }

    for (const [layerName, layer] of [
        ["color", mapData.color],
        ["object", mapData.object]
    ]) {
        if (
            layer.some(row =>
                !Array.isArray(row) ||
                row.length !== mapData.width ||
                row.some(cell => typeof cell !== "string" || cell.length !== 1)
            )
        ) {
            throw new Error(`The uploaded map's ${layerName} layer is invalid.`);
        }
    }

    const stage = MapParser.parse({
        width: mapData.width,
        height: mapData.height,
        color: mapData.color.map(row => row.join("")).join("\n"),
        object: mapData.object.map(row => row.join("")).join("\n")
    });

    if (stage.objects.player.length !== 1) {
        throw new Error("The uploaded map must contain exactly one player start.");
    }

    return stage;
}

