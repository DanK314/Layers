const stage = [
    {
        map: `
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        @..............$
        WWWWWWWWWWWWWWWW
        `
    },
    {
        map: `
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        @..............$
        WWWWWW..WWWWWWWW
        `
    },
];


export class MapParser {

    static parse(chunk) {

        const rows = chunk.map
            .trim()
            .split("\n")
            .map(row => row.trim());

        const height = rows.length;
        const width = rows[0].length;

        /*
         * 맵 크기 검사
         */

        if (height !== 16) {

            throw new Error(
                `Map height must be 16. Got ${height}.`
            );
        }

        for (let y = 0; y < height; y++) {

            if (rows[y].length !== 16) {

                throw new Error(
                    `Map width must be 16 at row ${y}. Got ${rows[y].length}.`
                );
            }
        }


        /*
         * 최종 파싱 결과
         *
         * map[y][x]
         *
         * 예:
         *
         * R → { R: true,  G: false, B: false }
         * Y → { R: true,  G: true,  B: false }
         * C → { R: false, G: true,  B: true  }
         * W → { R: true,  G: true,  B: true  }
         */

        const result = {

            map: [],

            objects: {
                player: [],
                goal: []
            }
        };


        /*
         * 타일 파싱
         */

        for (let y = 0; y < height; y++) {

            const row = [];

            for (let x = 0; x < width; x++) {

                const tile = rows[y][x];

                switch (tile) {

                    // -----------------------------------------
                    // Empty
                    // -----------------------------------------

                    case ".":

                        row.push({
                            R: false,
                            G: false,
                            B: false
                        });

                        break;


                    // -----------------------------------------
                    // Red
                    // -----------------------------------------

                    case "R":

                        row.push({
                            R: true,
                            G: false,
                            B: false
                        });

                        break;


                    // -----------------------------------------
                    // Green
                    // -----------------------------------------

                    case "G":

                        row.push({
                            R: false,
                            G: true,
                            B: false
                        });

                        break;


                    // -----------------------------------------
                    // Blue
                    // -----------------------------------------

                    case "B":

                        row.push({
                            R: false,
                            G: false,
                            B: true
                        });

                        break;


                    // -----------------------------------------
                    // Yellow = R + G
                    // -----------------------------------------

                    case "Y":

                        row.push({
                            R: true,
                            G: true,
                            B: false
                        });

                        break;


                    // -----------------------------------------
                    // Magenta = R + B
                    // -----------------------------------------

                    case "M":

                        row.push({
                            R: true,
                            G: false,
                            B: true
                        });

                        break;


                    // -----------------------------------------
                    // Cyan = G + B
                    // -----------------------------------------

                    case "C":

                        row.push({
                            R: false,
                            G: true,
                            B: true
                        });

                        break;


                    // -----------------------------------------
                    // White = R + G + B
                    // -----------------------------------------

                    case "W":

                        row.push({
                            R: true,
                            G: true,
                            B: true
                        });

                        break;


                    // -----------------------------------------
                    // Spike
                    // -----------------------------------------

                    case "^":

                        row.push({
                            R: true,
                            G: true,
                            B: true,
                            type: "spike"
                        });

                        break;


                    // -----------------------------------------
                    // Player
                    // -----------------------------------------

                    case "@":

                        row.push({
                            R: false,
                            G: false,
                            B: false
                        });

                        result.objects.player.push({
                            x: x,
                            y: y
                        });

                        break;


                    // -----------------------------------------
                    // Goal
                    // -----------------------------------------

                    case "$":

                        row.push({
                            R: false,
                            G: false,
                            B: false
                        });

                        result.objects.goal.push({
                            x: x,
                            y: y
                        });

                        break;


                    // -----------------------------------------
                    // Unknown
                    // -----------------------------------------

                    default:

                        throw new Error(
                            `Unknown tile "${tile}" at (${x}, ${y})`
                        );
                }
            }

            result.map.push(row);
        }


        return result;
    }
}


export const stageArray = stage.map(
    chunk => MapParser.parse(chunk)
);