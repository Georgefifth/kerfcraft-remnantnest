import { FabricationPreset } from '../types/fabrication';
import {
  normalizePolygon,
  createRectPolygon,
  createLBracketPolygon,
  createChamferPlatePolygon,
  createDroneArmPolygon,
} from '../engine/geometry';

function makePart(
  id: string,
  name: string,
  quantity: number,
  pts: Array<{ x: number; y: number }>,
  rotationConstraint: 'grain_locked' | 'orthogonal_90' | 'free_45',
  materialTag: string,
  color: string,
  sourceFormat: 'SVG' | 'DXF' | 'PARAMETRIC' = 'SVG'
) {
  const norm = normalizePolygon(pts);
  return {
    id,
    name,
    quantity,
    polygon: norm.polygon,
    width: norm.width,
    height: norm.height,
    areaMm2: norm.areaMm2,
    rotationConstraint,
    materialTag,
    color,
    sourceFormat,
  };
}

export const FABRICATION_PRESETS: FabricationPreset[] = [
  {
    id: 'fablab-drone-acrylic',
    title: 'FabLab 5" FPV Drone & Sensor Deck on Scrap Acrylic',
    subtitle: 'Rescues an irregular laser-cut 600×400mm acrylic skeleton with 2 prior cutout holes before touching new sheet stock',
    category: 'Laser / Acrylic',
    kerfMm: 0.2,
    partSpacingMm: 2.0,
    description:
      'Typical university makerspace laser job: 14 irregular structural plates, L-brackets, and sensor mounts packed around existing cutout holes on a leftover 3mm cast acrylic sheet.',
    parts: [
      makePart(
        'top-deck',
        'Main_Telemetry_Deck',
        1,
        createChamferPlatePolygon(195, 95, 16),
        'grain_locked',
        '3mm Matte Black Acrylic',
        '#F59E0B',
        'DXF'
      ),
      makePart(
        'bottom-plate',
        'Bottom_Power_Plate',
        1,
        createChamferPlatePolygon(180, 90, 14),
        'orthogonal_90',
        '3mm Matte Black Acrylic',
        '#10B981',
        'DXF'
      ),
      makePart(
        'drone-arm',
        'Cantilever_Standoff_Arm',
        4,
        createDroneArmPolygon(135, 36, 20),
        'orthogonal_90',
        '3mm Matte Black Acrylic',
        '#38BDF8',
        'DXF'
      ),
      makePart(
        'cam-cage-l',
        'Gimbal_L_Bracket',
        4,
        createLBracketPolygon(76, 68, 22),
        'orthogonal_90',
        '3mm Matte Black Acrylic',
        '#A3E635',
        'SVG'
      ),
      makePart(
        'lidar-mount',
        'LiDAR_Bezel_Plate',
        2,
        createChamferPlatePolygon(84, 72, 10),
        'orthogonal_90',
        '3mm Matte Black Acrylic',
        '#F97316',
        'SVG'
      ),
      makePart(
        'esc-guard',
        'ESC_Cover_Strip',
        2,
        createRectPolygon(110, 32),
        'orthogonal_90',
        '3mm Matte Black Acrylic',
        '#22D3EE',
        'SVG'
      ),
    ],
    sheets: [
      {
        id: 'remnant-acrylic-600x400',
        name: 'Remnant #A14 — Leftover 600×400mm Cast Acrylic (2 Prior Cutouts)',
        kind: 'remnant',
        material: '3mm Matte Black Acrylic',
        thicknessMm: 3,
        width: 600,
        height: 400,
        costUsd: 19.5,
        outerPolygon: [
          { x: 0, y: 0 },
          { x: 600, y: 0 },
          { x: 600, y: 400 },
          { x: 0, y: 400 },
        ],
        cutoutHoles: [
          {
            id: 'hole-prev-enclosure',
            label: 'Prior Job Cutout (170×140mm)',
            polygon: [
              { x: 410, y: 235 },
              { x: 580, y: 235 },
              { x: 580, y: 375 },
              { x: 410, y: 375 },
            ],
          },
          {
            id: 'hole-prev-circle-win',
            label: 'Prior Dial Cutout (120×95mm)',
            polygon: [
              { x: 445, y: 20 },
              { x: 565, y: 20 },
              { x: 565, y: 115 },
              { x: 445, y: 115 },
            ],
          },
        ],
        enabled: true,
      },
      {
        id: 'fresh-acrylic-600x400',
        name: 'Fresh Stock — Standard 600×400mm Cast Acrylic Sheet',
        kind: 'fresh_stock',
        material: '3mm Matte Black Acrylic',
        thicknessMm: 3,
        width: 600,
        height: 400,
        costUsd: 28.0,
        outerPolygon: [
          { x: 0, y: 0 },
          { x: 600, y: 0 },
          { x: 600, y: 400 },
          { x: 0, y: 400 },
        ],
        cutoutHoles: [],
        enabled: true,
      },
    ],
  },
  {
    id: 'baltic-birch-cabinet',
    title: 'Baltic Birch Modular Synthesizer Case (Grain-Locked Woodworking)',
    subtitle: 'Enforces strict 0°/180° wood-grain orientation on visible face panels while nesting internal braces into an L-shaped plywood offcut',
    category: 'Woodworking / Plywood',
    kerfMm: 3.0,
    partSpacingMm: 4.0,
    description:
      'Solves SVGnest Issue #15 (Required Grain Orientation) and Issue #19 (Remnant Reuse): keeps walnut/birch grain continuous across cheek panels while packing internal corner cleats onto shop scrap.',
    parts: [
      makePart(
        'face-panel',
        'GrainLocked_Front_Fascia',
        2,
        createRectPolygon(340, 110),
        'grain_locked',
        '12mm Baltic Birch Plywood',
        '#F59E0B',
        'PARAMETRIC'
      ),
      makePart(
        'side-cheek',
        'Angled_Side_Cheek',
        2,
        [
          { x: 0, y: 25 },
          { x: 240, y: 0 },
          { x: 240, y: 145 },
          { x: 0, y: 145 },
        ],
        'grain_locked',
        '12mm Baltic Birch Plywood',
        '#10B981',
        'DXF'
      ),
      makePart(
        'corner-gusset',
        'Internal_L_Gusset',
        4,
        createLBracketPolygon(115, 105, 36),
        'orthogonal_90',
        '12mm Baltic Birch Plywood',
        '#38BDF8',
        'DXF'
      ),
      makePart(
        'rail-cleat',
        'Eurorack_Rail_Cleat',
        4,
        createRectPolygon(165, 48),
        'orthogonal_90',
        '12mm Baltic Birch Plywood',
        '#A3E635',
        'PARAMETRIC'
      ),
    ],
    sheets: [
      {
        id: 'remnant-ply-lshape',
        name: 'Remnant #W08 — L-Shaped Baltic Birch Offcut (800×520mm)',
        kind: 'remnant',
        material: '12mm Baltic Birch Plywood',
        thicknessMm: 12,
        width: 800,
        height: 520,
        costUsd: 34.0,
        outerPolygon: [
          { x: 0, y: 0 },
          { x: 800, y: 0 },
          { x: 800, y: 280 },
          { x: 490, y: 280 },
          { x: 490, y: 520 },
          { x: 0, y: 520 },
        ],
        cutoutHoles: [],
        enabled: true,
      },
      {
        id: 'fresh-ply-1200x600',
        name: 'Fresh Stock — Half-Sheet 1200×600mm Baltic Birch',
        kind: 'fresh_stock',
        material: '12mm Baltic Birch Plywood',
        thicknessMm: 12,
        width: 1200,
        height: 600,
        costUsd: 56.0,
        outerPolygon: [
          { x: 0, y: 0 },
          { x: 1200, y: 0 },
          { x: 1200, y: 600 },
          { x: 0, y: 600 },
        ],
        cutoutHoles: [],
        enabled: true,
      },
    ],
  },
  {
    id: 'cnc-aluminum-robotics',
    title: '6061 Aluminum Rover Chassis & Gearbox Plates (Waterjet / CNC)',
    subtitle: 'High-value 4mm 6061-T6 aluminum plate nesting onto a workshop remnant slab to save $45+ in alloy stock',
    category: 'CNC / Aluminum',
    kerfMm: 1.5,
    partSpacingMm: 3.0,
    description:
      'Waterjet and CNC router job for a student robotics team: packs 12 structural alloy plates onto a partially-cut 500×380mm 6061-T6 remnant plate.',
    parts: [
      makePart(
        'diff-sideplate',
        'Rocker_Bogie_Sideplate',
        2,
        createChamferPlatePolygon(210, 92, 18),
        'orthogonal_90',
        '4mm 6061-T6 Aluminum',
        '#38BDF8',
        'DXF'
      ),
      makePart(
        'motor-flange',
        'BLDC_Gearbox_Flange',
        4,
        createChamferPlatePolygon(86, 86, 15),
        'orthogonal_90',
        '4mm 6061-T6 Aluminum',
        '#F59E0B',
        'DXF'
      ),
      makePart(
        'servo-horn-bracket',
        'Steering_L_Mount',
        4,
        createLBracketPolygon(88, 74, 26),
        'orthogonal_90',
        '4mm 6061-T6 Aluminum',
        '#10B981',
        'DXF'
      ),
      makePart(
        'battery-tie',
        'LiPo_Hold_Down_Strap',
        2,
        createRectPolygon(145, 38),
        'orthogonal_90',
        '4mm 6061-T6 Aluminum',
        '#F97316',
        'DXF'
      ),
    ],
    sheets: [
      {
        id: 'remnant-alu-500x380',
        name: 'Remnant #M03 — 6061-T6 Aluminum Plate w/ Center Cutout (550×400mm)',
        kind: 'remnant',
        material: '4mm 6061-T6 Aluminum',
        thicknessMm: 4,
        width: 550,
        height: 400,
        costUsd: 68.0,
        outerPolygon: [
          { x: 0, y: 0 },
          { x: 550, y: 0 },
          { x: 550, y: 400 },
          { x: 0, y: 400 },
        ],
        cutoutHoles: [
          {
            id: 'alu-hole-1',
            label: 'Prior Sprocket Cutout (145×135mm)',
            polygon: [
              { x: 380, y: 240 },
              { x: 525, y: 240 },
              { x: 525, y: 375 },
              { x: 380, y: 375 },
            ],
          },
        ],
        enabled: true,
      },
      {
        id: 'fresh-alu-600x450',
        name: 'Fresh Stock — 600×450mm 6061-T6 Mill Plate',
        kind: 'fresh_stock',
        material: '4mm 6061-T6 Aluminum',
        thicknessMm: 4,
        width: 600,
        height: 450,
        costUsd: 89.0,
        outerPolygon: [
          { x: 0, y: 0 },
          { x: 600, y: 0 },
          { x: 600, y: 450 },
          { x: 0, y: 450 },
        ],
        cutoutHoles: [],
        enabled: true,
      },
    ],
  },
];

export const SAMPLE_DXF_SNIPPET = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
SOLAR_BRACKET_A
90
6
70
1
10
0
20
0
10
130
20
0
10
130
20
35
10
40
20
35
10
40
20
95
10
0
20
95
0
LWPOLYLINE
8
SENSOR_PLATE_B
90
4
70
1
10
0
20
0
10
115
20
0
10
115
20
75
10
0
20
75
0
ENDSEC
0
EOF`;

export const SAMPLE_SVG_SNIPPET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <rect id=" Enclosure_Lid " width="140" height="82" data-qty="2" data-grain="locked" />
  <polygon id="Gusset_Corner" points="0,0 85,0 85,28 28,28 28,80 0,80" data-qty="2" />
</svg>`;
