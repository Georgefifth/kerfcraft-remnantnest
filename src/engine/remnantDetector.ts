import { Point2D, StockOrRemnantSheet } from '../types/fabrication';
import { computePolygonArea } from './geometry';

export interface ScrapTraceResult {
  outerPolygon: Point2D[];
  cutoutHoles: Array<{
    id: string;
    label: string;
    polygon: Point2D[];
  }>;
  usableAreaMm2: number;
  usableRatioPct: number;
}

/**
 * Generates synthetic workshop scrap silhouettes or processes a brightness grid
 * into a simplified remnant polygon + interior cutout hole polygons.
 */
export function traceRemnantFromSilhouettePreset(
  presetType: 'laser_skeleton' | 'corner_L_remnant' | 'miter_triangle_offcut',
  sheetWidthMm: number,
  sheetHeightMm: number,
  thresholdPct = 55
): ScrapTraceResult {
  const w = Math.max(100, sheetWidthMm);
  const h = Math.max(100, sheetHeightMm);
  // Subtle geometric dilation adjustment based on optical threshold slider
  const marginShift = Math.round(((thresholdPct - 50) / 50) * 8);

  if (presetType === 'corner_L_remnant') {
    const stepX = Math.round(w * 0.58 + marginShift);
    const stepY = Math.round(h * 0.46 + marginShift);
    const outerPolygon: Point2D[] = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: stepY },
      { x: stepX, y: stepY },
      { x: stepX, y: h },
      { x: 0, y: h },
    ];
    const usableAreaMm2 = Math.round(computePolygonArea(outerPolygon));
    return {
      outerPolygon,
      cutoutHoles: [],
      usableAreaMm2,
      usableRatioPct: Number(((usableAreaMm2 / (w * h)) * 100).toFixed(1)),
    };
  }

  if (presetType === 'miter_triangle_offcut') {
    const topRightX = Math.round(w * 0.88 + marginShift);
    const rightBottomY = Math.round(h * 0.35 + marginShift);
    const outerPolygon: Point2D[] = [
      { x: 0, y: 0 },
      { x: topRightX, y: 0 },
      { x: w, y: rightBottomY },
      { x: w * 0.65, y: h },
      { x: 0, y: h },
    ];
    const usableAreaMm2 = Math.round(computePolygonArea(outerPolygon));
    return {
      outerPolygon,
      cutoutHoles: [],
      usableAreaMm2,
      usableRatioPct: Number(((usableAreaMm2 / (w * h)) * 100).toFixed(1)),
    };
  }

  // Default: 'laser_skeleton' — full sheet with two previously laser-cut window holes
  const outerPolygon: Point2D[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const hole1W = Math.round(w * 0.28 + marginShift);
  const hole1H = Math.round(h * 0.36 + marginShift);
  const hole1X = Math.round(w * 0.56);
  const hole1Y = Math.round(h * 0.52);

  const hole2W = Math.round(w * 0.22);
  const hole2H = Math.round(h * 0.24);
  const hole2X = Math.round(w * 0.64);
  const hole2Y = Math.round(h * 0.12);

  const cutoutHoles = [
    {
      id: `traced-hole-1`,
      label: 'Previous Cutout Window #1',
      polygon: [
        { x: hole1X, y: hole1Y },
        { x: hole1X + hole1W, y: hole1Y },
        { x: hole1X + hole1W, y: hole1Y + hole1H },
        { x: hole1X, y: hole1Y + hole1H },
      ],
    },
    {
      id: `traced-hole-2`,
      label: 'Previous Cutout Window #2',
      polygon: [
        { x: hole2X, y: hole2Y },
        { x: hole2X + hole2W, y: hole2Y },
        { x: hole2X + hole2W, y: hole2Y + hole2H },
        { x: hole2X, y: hole2Y + hole2H },
      ],
    },
  ];

  const outerArea = computePolygonArea(outerPolygon);
  const holesArea = cutoutHoles.reduce(
    (s, hole) => s + computePolygonArea(hole.polygon),
    0
  );
  const usableAreaMm2 = Math.max(1, Math.round(outerArea - holesArea));

  return {
    outerPolygon,
    cutoutHoles,
    usableAreaMm2,
    usableRatioPct: Number(((usableAreaMm2 / (w * h)) * 100).toFixed(1)),
  };
}

export function buildRemnantSheetFromTrace(
  name: string,
  material: string,
  thicknessMm: number,
  width: number,
  height: number,
  costUsd: number,
  trace: ScrapTraceResult
): StockOrRemnantSheet {
  return {
    id: `remnant-traced-${Date.now().toString(36)}`,
    name,
    kind: 'remnant',
    material,
    thicknessMm,
    width,
    height,
    costUsd,
    outerPolygon: trace.outerPolygon,
    cutoutHoles: trace.cutoutHoles,
    enabled: true,
  };
}
