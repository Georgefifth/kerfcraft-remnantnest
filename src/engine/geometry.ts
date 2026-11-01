import { Point2D, FabPart, StockOrRemnantSheet } from '../types/fabrication';

/**
 * Signed polygon area via Shoelace formula (returns positive area in mm^2)
 */
export function computePolygonArea(pts: Point2D[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum) / 2;
}

export function getBoundingBox(pts: Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (pts.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/**
 * Normalizes a polygon so its bounding box top-left is at (0,0)
 */
export function normalizePolygon(pts: Point2D[]): {
  polygon: Point2D[];
  width: number;
  height: number;
  areaMm2: number;
} {
  const bb = getBoundingBox(pts);
  const normalized = pts.map((p) => ({
    x: Number((p.x - bb.minX).toFixed(2)),
    y: Number((p.y - bb.minY).toFixed(2)),
  }));
  const area = Math.max(1, Math.round(computePolygonArea(normalized)));
  return {
    polygon: normalized,
    width: Number(bb.width.toFixed(2)),
    height: Number(bb.height.toFixed(2)),
    areaMm2: area,
  };
}

/**
 * Rotates a polygon around (0,0) by angleDeg and re-normalizes top-left to (0,0)
 */
export function rotateAndNormalizePolygon(pts: Point2D[], angleDeg: number): {
  polygon: Point2D[];
  width: number;
  height: number;
} {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotated = pts.map((p) => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
  const norm = normalizePolygon(rotated);
  return {
    polygon: norm.polygon,
    width: norm.width,
    height: norm.height,
  };
}

/**
 * Translates a polygon by (dx, dy)
 */
export function translatePolygon(pts: Point2D[], dx: number, dy: number): Point2D[] {
  return pts.map((p) => ({
    x: Number((p.x + dx).toFixed(2)),
    y: Number((p.y + dy).toFixed(2)),
  }));
}

/**
 * Ray-casting Point-in-Polygon check
 */
export function isPointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if two line segments (p1-p2 and p3-p4) properly intersect
 */
export function doSegmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): boolean {
  const ccw = (A: Point2D, B: Point2D, C: Point2D) =>
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Exact minimum distance from point P to segment AB
 */
export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Checks if two polygons intersect or come closer than minClearanceMm
 */
export function doPolygonsCollide(
  polyA: Point2D[],
  polyB: Point2D[],
  minClearanceMm = 0
): boolean {
  const bbA = getBoundingBox(polyA);
  const bbB = getBoundingBox(polyB);

  if (
    bbA.maxX + minClearanceMm <= bbB.minX ||
    bbB.maxX + minClearanceMm <= bbA.minX ||
    bbA.maxY + minClearanceMm <= bbB.minY ||
    bbB.maxY + minClearanceMm <= bbA.minY
  ) {
    return false;
  }

  // Edge intersection check
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (doSegmentsIntersect(a1, a2, b1, b2)) return true;
      if (minClearanceMm > 0) {
        if (pointToSegmentDistance(a1, b1, b2) < minClearanceMm - 1e-4) return true;
        if (pointToSegmentDistance(b1, a1, a2) < minClearanceMm - 1e-4) return true;
      }
    }
  }

  // Containment check (vertex or centroid inside the other)
  if (isPointInPolygon(polyA[0], polyB)) return true;
  if (isPointInPolygon(polyB[0], polyA)) return true;

  const centroidA = {
    x: polyA.reduce((s, p) => s + p.x, 0) / polyA.length,
    y: polyA.reduce((s, p) => s + p.y, 0) / polyA.length,
  };
  const centroidB = {
    x: polyB.reduce((s, p) => s + p.x, 0) / polyB.length,
    y: polyB.reduce((s, p) => s + p.y, 0) / polyB.length,
  };
  if (isPointInPolygon(centroidA, polyB)) return true;
  if (isPointInPolygon(centroidB, polyA)) return true;

  return false;
}

/**
 * Checks that innerPoly is completely inside outerPoly and outside all cutout holes
 */
export function isPolygonValidOnSheet(
  innerPoly: Point2D[],
  sheet: StockOrRemnantSheet,
  edgeMarginMm: number
): boolean {
  const bb = getBoundingBox(innerPoly);
  if (
    bb.minX < edgeMarginMm - 1e-3 ||
    bb.minY < edgeMarginMm - 1e-3 ||
    bb.maxX > sheet.width - edgeMarginMm + 1e-3 ||
    bb.maxY > sheet.height - edgeMarginMm + 1e-3
  ) {
    return false;
  }

  // Check every vertex and edge midpoint of innerPoly is inside sheet.outerPolygon
  for (let i = 0; i < innerPoly.length; i++) {
    const p1 = innerPoly[i];
    const p2 = innerPoly[(i + 1) % innerPoly.length];
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (!isPointInPolygon(p1, sheet.outerPolygon)) return false;
    if (!isPointInPolygon(mid, sheet.outerPolygon)) return false;

    for (let j = 0; j < sheet.outerPolygon.length; j++) {
      const s1 = sheet.outerPolygon[j];
      const s2 = sheet.outerPolygon[(j + 1) % sheet.outerPolygon.length];
      if (doSegmentsIntersect(p1, p2, s1, s2)) return false;
      if (edgeMarginMm > 0 && pointToSegmentDistance(p1, s1, s2) < edgeMarginMm - 1e-3) {
        return false;
      }
    }
  }

  // Check that innerPoly does not collide with any cutout hole on the remnant sheet
  for (const hole of sheet.cutoutHoles) {
    if (doPolygonsCollide(innerPoly, hole.polygon, edgeMarginMm)) {
      return false;
    }
  }

  return true;
}

export function createRectPolygon(w: number, h: number): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

export function createLBracketPolygon(
  w: number,
  h: number,
  legThickness: number
): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: legThickness },
    { x: legThickness, y: legThickness },
    { x: legThickness, y: h },
    { x: 0, y: h },
  ];
}

export function createChamferPlatePolygon(
  w: number,
  h: number,
  chamfer: number
): Point2D[] {
  return [
    { x: chamfer, y: 0 },
    { x: w - chamfer, y: 0 },
    { x: w, y: chamfer },
    { x: w, y: h - chamfer },
    { x: w - chamfer, y: h },
    { x: chamfer, y: h },
    { x: 0, y: h - chamfer },
    { x: 0, y: chamfer },
  ];
}

export function createDroneArmPolygon(length: number, rootW: number, tipW: number): Point2D[] {
  const midY = rootW / 2;
  const halfTip = tipW / 2;
  return [
    { x: 0, y: 0 },
    { x: length * 0.65, y: midY - halfTip },
    { x: length, y: midY - halfTip * 1.15 },
    { x: length, y: midY + halfTip * 1.15 },
    { x: length * 0.65, y: midY + halfTip },
    { x: 0, y: rootW },
  ];
}
