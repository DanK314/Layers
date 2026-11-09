// Route annotations used only for physics regression tests. Map tiles live in js/map.js.
import { stage } from '../../js/map.js';

export const expertStages = stage.slice(35);
export const expertCourses = [
  {
    "name": "Prism ascent",
    "width": 28,
    "height": 20,
    "points": [
      [
        2,
        17
      ],
      [
        5,
        16
      ],
      [
        8,
        14
      ],
      [
        11,
        13
      ],
      [
        14,
        11
      ],
      [
        17,
        10
      ],
      [
        20,
        8
      ],
      [
        23,
        7
      ]
    ],
    "roofs": true,
    "mechanic": "relay"
  },
  {
    "name": "RGB tower",
    "width": 16,
    "height": 34,
    "points": [
      [
        2,
        30
      ],
      [
        6,
        28
      ],
      [
        10,
        26
      ],
      [
        6,
        24
      ],
      [
        2,
        22
      ],
      [
        6,
        20
      ],
      [
        10,
        18
      ],
      [
        6,
        16
      ],
      [
        2,
        14
      ],
      [
        6,
        12
      ],
      [
        10,
        10
      ],
      [
        6,
        8
      ],
      [
        2,
        6
      ],
      [
        6,
        4
      ]
    ],
    "roofs": true
  },
  {
    "name": "Falling shutters",
    "width": 22,
    "height": 36,
    "descent": [
      16,
      3,
      16,
      3,
      16,
      3,
      16
    ],
    "start": 3
  },
  {
    "name": "Reverse skyline",
    "width": 32,
    "height": 24,
    "points": [
      [
        2,
        21
      ],
      [
        6,
        19
      ],
      [
        10,
        17
      ],
      [
        14,
        15
      ],
      [
        18,
        13
      ],
      [
        22,
        11
      ],
      [
        26,
        9
      ],
      [
        23,
        7
      ],
      [
        19,
        5
      ],
      [
        15,
        3
      ],
      [
        11,
        3
      ],
      [
        7,
        3
      ],
      [
        3,
        3
      ]
    ],
    "roofs": true
  },
  {
    "name": "Split spires",
    "width": 26,
    "height": 37,
    "points": [
      [
        2,
        33
      ],
      [
        6,
        31
      ],
      [
        2,
        29
      ],
      [
        6,
        27
      ],
      [
        2,
        25
      ],
      [
        6,
        23
      ],
      [
        10,
        21
      ],
      [
        14,
        19
      ],
      [
        18,
        17
      ],
      [
        22,
        15
      ],
      [
        18,
        13
      ],
      [
        22,
        11
      ],
      [
        18,
        9
      ],
      [
        15,
        7
      ],
      [
        12,
        5
      ]
    ],
    "gates": true,
    "mechanic": "relay",
    "airSwitchExit": true
  },
  {
    "name": "Sawtooth relay",
    "width": 38,
    "height": 20,
    "points": [
      [
        2,
        16
      ],
      [
        5,
        14
      ],
      [
        8,
        17
      ],
      [
        11,
        15
      ],
      [
        14,
        13
      ],
      [
        17,
        16
      ],
      [
        20,
        14
      ],
      [
        23,
        12
      ],
      [
        26,
        15
      ],
      [
        29,
        13
      ],
      [
        32,
        11
      ]
    ],
    "roofs": true,
    "gates": true,
    "mechanic": "trapdoor"
  },
  {
    "name": "Head-hitter gallery",
    "width": 36,
    "height": 23,
    "points": [
      [
        2,
        19
      ],
      [
        5,
        19
      ],
      [
        8,
        18
      ],
      [
        11,
        18
      ],
      [
        14,
        16
      ],
      [
        17,
        16
      ],
      [
        20,
        15
      ],
      [
        23,
        15
      ],
      [
        26,
        13
      ],
      [
        29,
        13
      ],
      [
        32,
        11
      ],
      [
        29,
        9
      ],
      [
        26,
        7
      ]
    ],
    "roofs": true,
    "headHitters": true,
    "airSwitchExit": true
  },
  {
    "name": "Offset waterfall",
    "width": 28,
    "height": 44,
    "descent": [
      21,
      4,
      17,
      7,
      21,
      4,
      17,
      7,
      21
    ],
    "start": 4,
    "narrow": true
  },
  {
    "name": "Needle helix",
    "width": 20,
    "height": 43,
    "points": [
      [
        2,
        39
      ],
      [
        6,
        37
      ],
      [
        10,
        35
      ],
      [
        14,
        33
      ],
      [
        10,
        31
      ],
      [
        6,
        29
      ],
      [
        2,
        27
      ],
      [
        6,
        25
      ],
      [
        10,
        23
      ],
      [
        14,
        21
      ],
      [
        10,
        19
      ],
      [
        6,
        17
      ],
      [
        2,
        15
      ],
      [
        6,
        13
      ],
      [
        10,
        11
      ],
      [
        14,
        9
      ],
      [
        11,
        7
      ],
      [
        8,
        5
      ]
    ],
    "gates": true,
    "edges": true,
    "mechanic": "needle",
    "airSwitchExit": true
  },
  {
    "name": "Broken pendulum",
    "width": 34,
    "height": 28,
    "points": [
      [
        2,
        24
      ],
      [
        6,
        22
      ],
      [
        10,
        20
      ],
      [
        14,
        18
      ],
      [
        18,
        16
      ],
      [
        22,
        14
      ],
      [
        26,
        12
      ],
      [
        29,
        10
      ],
      [
        25,
        8
      ],
      [
        21,
        6
      ],
      [
        17,
        4
      ],
      [
        13,
        4
      ],
      [
        9,
        4
      ],
      [
        5,
        4
      ]
    ],
    "roofs": true,
    "gates": true,
    "edges": true,
    "mechanic": "relay"
  },
  {
    "name": "Chroma lattice",
    "width": 26,
    "height": 41,
    "points": [
      [
        2,
        37
      ],
      [
        6,
        35
      ],
      [
        10,
        33
      ],
      [
        14,
        31
      ],
      [
        18,
        29
      ],
      [
        22,
        27
      ],
      [
        18,
        25
      ],
      [
        14,
        23
      ],
      [
        10,
        21
      ],
      [
        6,
        19
      ],
      [
        2,
        17
      ],
      [
        6,
        15
      ],
      [
        10,
        13
      ],
      [
        14,
        11
      ],
      [
        18,
        9
      ],
      [
        15,
        7
      ],
      [
        12,
        5
      ]
    ],
    "roofs": true,
    "gates": true,
    "mechanic": "dual",
    "airSwitchExit": true
  },
  {
    "name": "Shutter gauntlet",
    "width": 32,
    "height": 52,
    "descent": [
      25,
      4,
      21,
      8,
      25,
      4,
      21,
      8,
      25,
      4,
      21
    ],
    "start": 4,
    "narrow": true,
    "gates": true
  },
  {
    "name": "Fractured crown",
    "width": 38,
    "height": 35,
    "points": [
      [
        2,
        31
      ],
      [
        6,
        29
      ],
      [
        10,
        27
      ],
      [
        14,
        25
      ],
      [
        18,
        23
      ],
      [
        22,
        21
      ],
      [
        26,
        19
      ],
      [
        30,
        17
      ],
      [
        33,
        15
      ],
      [
        29,
        13
      ],
      [
        25,
        11
      ],
      [
        21,
        9
      ],
      [
        17,
        9
      ],
      [
        13,
        9
      ],
      [
        9,
        9
      ],
      [
        5,
        9
      ],
      [
        8,
        7
      ],
      [
        11,
        5
      ]
    ],
    "roofs": true,
    "gates": true,
    "edges": true,
    "mechanic": "neutral",
    "airSwitchExit": true
  },
  {
    "name": "Spectrum switchbacks",
    "width": 22,
    "height": 51,
    "points": [
      [
        2,
        47
      ],
      [
        6,
        45
      ],
      [
        10,
        43
      ],
      [
        14,
        41
      ],
      [
        18,
        39
      ],
      [
        14,
        37
      ],
      [
        10,
        35
      ],
      [
        6,
        33
      ],
      [
        2,
        31
      ],
      [
        6,
        29
      ],
      [
        10,
        27
      ],
      [
        14,
        25
      ],
      [
        18,
        23
      ],
      [
        14,
        21
      ],
      [
        10,
        19
      ],
      [
        6,
        17
      ],
      [
        2,
        15
      ],
      [
        6,
        13
      ],
      [
        10,
        11
      ],
      [
        14,
        9
      ],
      [
        11,
        7
      ],
      [
        8,
        5
      ]
    ],
    "roofs": true,
    "gates": true,
    "edges": true,
    "mechanic": "dual",
    "airSwitchExit": true
  },
  {
    "name": "Total refraction",
    "width": 46,
    "height": 45,
    "points": [
      [
        2,
        41
      ],
      [
        6,
        39
      ],
      [
        10,
        37
      ],
      [
        14,
        35
      ],
      [
        18,
        33
      ],
      [
        22,
        31
      ],
      [
        26,
        29
      ],
      [
        30,
        27
      ],
      [
        34,
        25
      ],
      [
        38,
        23
      ],
      [
        41,
        21
      ],
      [
        37,
        19
      ],
      [
        33,
        17
      ],
      [
        29,
        15
      ],
      [
        25,
        13
      ],
      [
        21,
        11
      ],
      [
        17,
        9
      ],
      [
        13,
        9
      ],
      [
        9,
        9
      ],
      [
        5,
        9
      ],
      [
        8,
        7
      ],
      [
        11,
        5
      ]
    ],
    "roofs": true,
    "headHitters": true,
    "gates": true,
    "edges": true,
    "mechanic": "mixed",
    "airSwitchExit": true
  }
];

const layers = ['R', 'G', 'B'];
const complement = { R: 'C', G: 'M', B: 'Y', Y: 'B', C: 'R', M: 'G', W: '.' };

export function platformSpec(course, rank, index) {
    const [x, y] = course.points[index];
    const endpoint = index === 0 || index === course.points.length - 1;
    const mechanic = course.mechanic === 'mixed'
        ? ['relay', 'double', 'dual', 'neutral', 'trapdoor', 'needle'][index % 6]
        : course.mechanic || 'relay';
    const airLanding = course.airSwitchExit && index === course.points.length - 2;
    const airTakeoff = course.airSwitchExit && index === course.points.length - 3;
    const layer = layers[(index - 1 + 3 + (airLanding ? 1 : 0)) % 3];
    const floor = endpoint ? 'W' : airLanding || airTakeoff ? layer : mechanic === 'dual' ? ['Y', 'C', 'M'][(index - 1) % 3]
        : mechanic === 'neutral' && index % 2 === 0 ? 'W' : layer;
    const trapdoor = !endpoint && mechanic === 'trapdoor' && course.points[index + 1][1] > y;
    const canopy = endpoint || trapdoor || airTakeoff ? '.' : floor === 'W' ? layer : complement[floor];
    const edge = !endpoint && course.edges && index % 4 === 2 && course.points[index - 1][1] - y <= 1;
    return { x, y, airLanding, airTakeoff, endpoint, mechanic, layer, floor, canopy, edge, trapdoor, size: endpoint || rank < 7 ? 2 : 1 };
}
