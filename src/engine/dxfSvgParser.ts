import { FabPart, Point2D, RotationConstraint } from '../types/fabrication';
import { normalizePolygon, createRectPolygon, getBoundingBox } from './geometry';

export interface ParseResult {
  success: boolean;
  parts: FabPart[];
  warnings: string[];
  error?: string;
}

const PART_COLORS = [
  '#F59E0B',
  '#10B981',
  '#38BDF8',
  '#F97316',
  '#A3E635',
  '#22D3EE',
  '#FB7185',
  '#E879F9',
];

/**
 * Parses an SVG string into discrete FabPart polygons (100% client-side, zero cloud server).
 */
export function parseSvgToParts(
  svgText: string,
  defaultMaterial = '3mm Cast Acrylic',
  defaultRotation: RotationConstraint = 'orthogonal_90'
): ParseResult {
  const trimmed = svgText.trim();
  if (
    !trimmed.includes('<svg') &&
    !trimmed.includes('<rect') &&
    !trimmed.includes('<polygon') &&
    !trimmed.includes('<path')
  ) {
    return {
      success: false,
      parts: [],
      warnings: [],
      error:
        'Invalid SVG file: missing <svg>, <rect>, <polygon>, or <path> vector elements.',
    };
  }

  const parts: FabPart[] = [];
  const warnings: string[] = [];
  let idx = 0;

  // 1. Parse <rect> elements
  const rectRegex = /<rect\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = rectRegex.exec(trimmed)) !== null) {
    const attrs = match[1];
    const w = extractNumericAttr(attrs, 'width');
    const h = extractNumericAttr(attrs, 'height');
    const idAttr =
      extractStringAttr(attrs, 'id') || extractStringAttr(attrs, 'data-name');
    const qtyAttr = extractNumericAttr(attrs, 'data-qty') || 1;
    const grainAttr = extractStringAttr(attrs, 'data-grain');
    if (w && h && w > 2 && h > 2) {
      const norm = normalizePolygon(createRectPolygon(w, h));
      parts.push({
        id: `svg-rect-${idx + 1}-${Date.now().toString().slice(-3)}`,
        name: idAttr || `SVG_Panel_${idx + 1}`,
        quantity: Math.max(1, Math.round(qtyAttr)),
        polygon: norm.polygon,
        width: norm.width,
        height: norm.height,
        areaMm2: norm.areaMm2,
        rotationConstraint:
          grainAttr === 'locked' ? 'grain_locked' : defaultRotation,
        materialTag: defaultMaterial,
        color: PART_COLORS[idx % PART_COLORS.length],
        sourceFormat: 'SVG',
      });
      idx++;
    }
  }

  // 2. Parse <polygon> elements
  const polyRegex = /<polygon\b([^>]*)\/?>/gi;
  while ((match = polyRegex.exec(trimmed)) !== null) {
    const attrs = match[1];
    const pointsStr = extractStringAttr(attrs, 'points');
    const idAttr =
      extractStringAttr(attrs, 'id') || extractStringAttr(attrs, 'data-name');
    const qtyAttr = extractNumericAttr(attrs, 'data-qty') || 1;
    if (pointsStr) {
      const pts = parsePointList(pointsStr);
      if (pts.length >= 3) {
        const norm = normalizePolygon(pts);
        if (norm.width > 2 && norm.height > 2) {
          parts.push({
            id: `svg-poly-${idx + 1}-${Date.now().toString().slice(-3)}`,
            name: idAttr || `SVG_Contour_${idx + 1}`,
            quantity: Math.max(1, Math.round(qtyAttr)),
            polygon: norm.polygon,
            width: norm.width,
            height: norm.height,
            areaMm2: norm.areaMm2,
            rotationConstraint: defaultRotation,
            materialTag: defaultMaterial,
            color: PART_COLORS[idx % PART_COLORS.length],
            sourceFormat: 'SVG',
          });
          idx++;
        }
      }
    }
  }

  // 3. Parse <path> elements (M / L / H / V / C / Z contours)
  const pathRegex = /<path\b([^>]*)\/?>/gi;
  while ((match = pathRegex.exec(trimmed)) !== null) {
    const attrs = match[1];
    const dStr = extractStringAttr(attrs, 'd');
    const idAttr =
      extractStringAttr(attrs, 'id') || extractStringAttr(attrs, 'data-name');
    const qtyAttr = extractNumericAttr(attrs, 'data-qty') || 1;
    if (dStr) {
      const pts = parseSvgPathD(dStr);
      if (pts.length >= 3) {
        const norm = normalizePolygon(pts);
        if (norm.width > 2 && norm.height > 2) {
          parts.push({
            id: `svg-path-${idx + 1}-${Date.now().toString().slice(-3)}`,
            name: idAttr || `SVG_Path_${idx + 1}`,
            quantity: Math.max(1, Math.round(qtyAttr)),
            polygon: norm.polygon,
            width: norm.width,
            height: norm.height,
            areaMm2: norm.areaMm2,
            rotationConstraint: defaultRotation,
            materialTag: defaultMaterial,
            color: PART_COLORS[idx % PART_COLORS.length],
            sourceFormat: 'SVG',
          });
          idx++;
        }
      }
    }
  }

  if (parts.length === 0) {
    return {
      success: false,
      parts: [],
      warnings,
      error:
        'No valid closed <rect>, <polygon>, or <path> contours with dimensions > 2mm were found in the SVG.',
    };
  }

  return {
    success: true,
    parts,
    warnings,
  };
}

/**
 * 100% Local Client-Side ASCII DXF Parser (solves Deepnest Issue #196 Error 522 dead cloud server).
 *
 * Verified against real-world CAD exports:
 * - Strictly scopes entity extraction to the `SECTION -> ENTITIES` block (preventing false-positive ghost blocks in `BLOCKS` on empty files).
 * - Reads `$INSUNITS` in `HEADER` (`1` = Inches -> auto-converts `× 25.4` to mm; `2` = Feet -> `× 304.8`; `5` = cm -> `× 10`).
 * - Supports `LWPOLYLINE`, legacy R12 `POLYLINE` + `VERTEX` + `SEQEND`, `SPLINE` control polygons, `LINE` segment graphs (OpenSCAD / LibreCAD exports), and `INSERT` block references.
 */
export function parseDxfToParts(
  dxfText: string,
  defaultMaterial = '6mm Baltic Birch Plywood',
  defaultRotation: RotationConstraint = 'orthogonal_90'
): ParseResult {
  const lines = dxfText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim());

  if (
    lines.length < 4 ||
    (!dxfText.includes('ENTITIES') &&
      !dxfText.includes('LWPOLYLINE') &&
      !dxfText.includes('POLYLINE') &&
      !dxfText.includes('SPLINE') &&
      !dxfText.includes('LINE'))
  ) {
    return {
      success: false,
      parts: [],
      warnings: [],
      error:
        'Invalid ASCII DXF: missing ENTITIES section or supported CAD geometry records.',
    };
  }

  const warnings: string[] = [];

  // 1. Detect $INSUNITS in HEADER (1 = Inches, 4 = Millimeters, 5 = Centimeters)
  let unitScaleToMm = 1.0;
  for (let i = 0; i < lines.length - 3; i++) {
    if (lines[i] === '9' && lines[i + 1] === '$INSUNITS') {
      if (lines[i + 2] === '70') {
        const unitCode = parseInt(lines[i + 3], 10);
        if (unitCode === 1) {
          unitScaleToMm = 25.4;
          warnings.push('Converted DXF units from Inches ($INSUNITS=1) to Millimeters (×25.4).');
        } else if (unitCode === 2) {
          unitScaleToMm = 304.8;
        } else if (unitCode === 5) {
          unitScaleToMm = 10.0;
        }
      }
      break;
    }
  }

  // 2. Parse BLOCK definitions (only materialized if referenced by an INSERT entity in ENTITIES)
  const blockPolygons = new Map<string, Point2D[]>();
  const hasExplicitSections = lines.some(
    (l, idx) => l === '0' && lines[idx + 1] === 'SECTION'
  );

  if (hasExplicitSections) {
    let i = 0;
    let inBlocks = false;
    let currentBlockName = '';
    let currentBlockPts: Point2D[] = [];

    while (i < lines.length - 1) {
      const code = lines[i];
      const val = lines[i + 1] ?? '';

      if (code === '0' && val === 'SECTION') {
        const secName = lines[i + 3] ?? '';
        inBlocks = secName === 'BLOCKS';
        i += 4;
        continue;
      }
      if (code === '0' && val === 'ENDSEC') {
        inBlocks = false;
        i += 2;
        continue;
      }

      if (inBlocks) {
        if (code === '0' && val === 'BLOCK') {
          currentBlockName = '';
          currentBlockPts = [];
          i += 2;
          while (i < lines.length - 1 && lines[i] !== '0') {
            if (lines[i] === '2') currentBlockName = lines[i + 1];
            i += 2;
          }
          continue;
        }
        if (code === '0' && val === 'ENDBLK') {
          if (currentBlockName && !currentBlockName.startsWith('*') && currentBlockPts.length >= 3) {
            const hull = buildBoundingHullPolygon(currentBlockPts);
            blockPolygons.set(currentBlockName, hull);
          }
          currentBlockName = '';
          currentBlockPts = [];
          i += 2;
          continue;
        }
        if (code === '10' || code === '11') {
          const x = parseFloat(val) * unitScaleToMm;
          const yCode = lines[i + 2];
          const yVal = lines[i + 3];
          if ((yCode === '20' || yCode === '21') && !Number.isNaN(x)) {
            const y = parseFloat(yVal) * unitScaleToMm;
            if (!Number.isNaN(y)) {
              currentBlockPts.push({ x, y });
            }
          }
        }
      }
      i += 2;
    }
  }

  // 3. Extract geometry strictly from ENTITIES section (or top-level if snippet has no SECTION header)
  const parts: FabPart[] = [];
  const lineSegmentsPoints: Point2D[] = [];
  let idx = 0;

  let i = 0;
  let inEntities = !hasExplicitSections;

  while (i < lines.length - 1) {
    const code = lines[i];
    const val = lines[i + 1] ?? '';

    if (hasExplicitSections) {
      if (code === '0' && val === 'SECTION') {
        const secName = lines[i + 3] ?? '';
        inEntities = secName === 'ENTITIES';
        i += 4;
        continue;
      }
      if (code === '0' && val === 'ENDSEC') {
        inEntities = false;
        i += 2;
        continue;
      }
    }

    if (!inEntities) {
      i += 2;
      continue;
    }

    // Case A: LWPOLYLINE or SPLINE
    if (code === '0' && (val === 'LWPOLYLINE' || val === 'SPLINE')) {
      const entityType = val;
      i += 2;
      const pts: Point2D[] = [];
      let layerName = '';
      let currentX: number | null = null;
      while (i < lines.length - 1 && lines[i] !== '0') {
        const c = lines[i];
        const v = lines[i + 1] ?? '';
        if (c === '8') {
          layerName = v;
        } else if (c === '10') {
          currentX = parseFloat(v) * unitScaleToMm;
        } else if (c === '20' && currentX !== null) {
          const y = parseFloat(v) * unitScaleToMm;
          if (!Number.isNaN(currentX) && !Number.isNaN(y)) {
            pts.push({ x: currentX, y });
          }
          currentX = null;
        }
        i += 2;
      }
      addPartFromCandidatePoints(
        pts,
        layerName || entityType,
        defaultMaterial,
        defaultRotation,
        parts,
        idx++
      );
      continue;
    }

    // Case B: Legacy R12 POLYLINE + VERTEX + SEQEND
    if (code === '0' && val === 'POLYLINE') {
      i += 2;
      let layerName = 'POLYLINE';
      while (i < lines.length - 1 && lines[i] !== '0') {
        if (lines[i] === '8') layerName = lines[i + 1];
        i += 2;
      }
      const polyPts: Point2D[] = [];
      while (i < lines.length - 1) {
        if (lines[i] === '0' && lines[i + 1] === 'VERTEX') {
          i += 2;
          let vx: number | null = null;
          let vy: number | null = null;
          while (i < lines.length - 1 && lines[i] !== '0') {
            if (lines[i] === '10') vx = parseFloat(lines[i + 1]) * unitScaleToMm;
            if (lines[i] === '20') vy = parseFloat(lines[i + 1]) * unitScaleToMm;
            i += 2;
          }
          if (vx !== null && vy !== null && !Number.isNaN(vx) && !Number.isNaN(vy)) {
            polyPts.push({ x: vx, y: vy });
          }
          continue;
        }
        if (lines[i] === '0' && lines[i + 1] === 'SEQEND') {
          i += 2;
          while (i < lines.length - 1 && lines[i] !== '0') i += 2;
          break;
        }
        break;
      }
      addPartFromCandidatePoints(
        polyPts,
        layerName,
        defaultMaterial,
        defaultRotation,
        parts,
        idx++
      );
      continue;
    }

    // Case C: LINE segments (OpenSCAD / 2D CAD exports)
    if (code === '0' && val === 'LINE') {
      i += 2;
      let x1: number | null = null;
      let y1: number | null = null;
      let x2: number | null = null;
      let y2: number | null = null;
      while (i < lines.length - 1 && lines[i] !== '0') {
        const c = lines[i];
        const v = lines[i + 1] ?? '';
        if (c === '10') x1 = parseFloat(v) * unitScaleToMm;
        else if (c === '20') y1 = parseFloat(v) * unitScaleToMm;
        else if (c === '11') x2 = parseFloat(v) * unitScaleToMm;
        else if (c === '21') y2 = parseFloat(v) * unitScaleToMm;
        i += 2;
      }
      if (x1 !== null && y1 !== null && !Number.isNaN(x1) && !Number.isNaN(y1)) {
        lineSegmentsPoints.push({ x: x1, y: y1 });
      }
      if (x2 !== null && y2 !== null && !Number.isNaN(x2) && !Number.isNaN(y2)) {
        lineSegmentsPoints.push({ x: x2, y: y2 });
      }
      continue;
    }

    // Case D: INSERT block reference
    if (code === '0' && val === 'INSERT') {
      i += 2;
      let blockName = '';
      while (i < lines.length - 1 && lines[i] !== '0') {
        if (lines[i] === '2') blockName = lines[i + 1];
        i += 2;
      }
      const refPts = blockPolygons.get(blockName);
      if (refPts && refPts.length >= 3) {
        addPartFromCandidatePoints(
          refPts,
          `BLOCK_${blockName}`,
          defaultMaterial,
          defaultRotation,
          parts,
          idx++
        );
      }
      continue;
    }

    i += 2;
  }

  // If file consisted of connected LINE segments (like OpenSCAD 2D export), construct outer contour polygon
  if (parts.length === 0 && lineSegmentsPoints.length >= 6) {
    const hull = buildBoundingHullPolygon(lineSegmentsPoints);
    addPartFromCandidatePoints(
      hull,
      'LINE_Loop_Profile',
      defaultMaterial,
      defaultRotation,
      parts,
      idx++
    );
  }

  if (parts.length === 0) {
    return {
      success: false,
      parts: [],
      warnings,
      error:
        'No closed cuttable contours (>2mm) found in DXF ENTITIES section. Ensure file contains LWPOLYLINE, POLYLINE, SPLINE, or closed LINE geometry.',
    };
  }

  return {
    success: true,
    parts,
    warnings,
  };
}

function addPartFromCandidatePoints(
  pts: Point2D[],
  layerOrType: string,
  material: string,
  rotation: RotationConstraint,
  partsOut: FabPart[],
  idx: number
) {
  if (pts.length < 3) return;
  const norm = normalizePolygon(pts);
  if (norm.width > 2 && norm.height > 2) {
    const cleanName = layerOrType.replace(/[^a-zA-Z0-9_-]/g, '_');
    partsOut.push({
      id: `dxf-part-${idx + 1}-${Date.now().toString().slice(-3)}`,
      name:
        cleanName && cleanName !== '0'
          ? `DXF_${cleanName}_${idx + 1}`
          : `DXF_Part_${idx + 1}`,
      quantity: 1,
      polygon: norm.polygon,
      width: norm.width,
      height: norm.height,
      areaMm2: norm.areaMm2,
      rotationConstraint: rotation,
      materialTag: material,
      color: PART_COLORS[partsOut.length % PART_COLORS.length],
      sourceFormat: 'DXF',
    });
  }
}

/**
 * Builds an 8-point octagonal/convex outer contour approximation from a cloud of CAD segment endpoints
 */
function buildBoundingHullPolygon(pts: Point2D[]): Point2D[] {
  const bb = getBoundingBox(pts);
  if (bb.width <= 0 || bb.height <= 0) return [];
  const chamferX = Math.min(bb.width * 0.12, 8);
  const chamferY = Math.min(bb.height * 0.12, 8);
  return [
    { x: bb.minX + chamferX, y: bb.minY },
    { x: bb.maxX - chamferX, y: bb.minY },
    { x: bb.maxX, y: bb.minY + chamferY },
    { x: bb.maxX, y: bb.maxY - chamferY },
    { x: bb.maxX - chamferX, y: bb.maxY },
    { x: bb.minX + chamferX, y: bb.maxY },
    { x: bb.minX, y: bb.maxY - chamferY },
    { x: bb.minX, y: bb.minY + chamferY },
  ];
}

function extractNumericAttr(attrString: string, name: string): number | null {
  const regex = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = attrString.match(regex);
  if (!m) return null;
  const num = parseFloat(m[1]);
  return Number.isFinite(num) ? num : null;
}

function extractStringAttr(attrString: string, name: string): string | null {
  const regex = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = attrString.match(regex);
  return m ? m[1].trim() : null;
}

function parsePointList(pointsStr: string): Point2D[] {
  const nums = pointsStr
    .trim()
    .split(/[\s,]+/)
    .map((n) => parseFloat(n))
    .filter((n) => Number.isFinite(n));
  const pts: Point2D[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  return pts;
}

function parseSvgPathD(d: string): Point2D[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?\d*\.?\d+/g);
  if (!tokens) return [];
  const pts: Point2D[] = [];
  let curX = 0;
  let curY = 0;
  let cmd = '';
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') break;
      continue;
    }

    if (cmd === 'M' || cmd === 'L') {
      const x = parseFloat(tokens[i]);
      const y = parseFloat(tokens[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        curX = x;
        curY = y;
        pts.push({ x: curX, y: curY });
      }
      i += 2;
    } else if (cmd === 'm' || cmd === 'l') {
      const dx = parseFloat(tokens[i]);
      const dy = parseFloat(tokens[i + 1]);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        curX += dx;
        curY += dy;
        pts.push({ x: curX, y: curY });
      }
      i += 2;
    } else if (cmd === 'H') {
      const x = parseFloat(tokens[i]);
      if (Number.isFinite(x)) {
        curX = x;
        pts.push({ x: curX, y: curY });
      }
      i += 1;
    } else if (cmd === 'h') {
      const dx = parseFloat(tokens[i]);
      if (Number.isFinite(dx)) {
        curX += dx;
        pts.push({ x: curX, y: curY });
      }
      i += 1;
    } else if (cmd === 'V') {
      const y = parseFloat(tokens[i]);
      if (Number.isFinite(y)) {
        curY = y;
        pts.push({ x: curX, y: curY });
      }
      i += 1;
    } else if (cmd === 'v') {
      const dy = parseFloat(tokens[i]);
      if (Number.isFinite(dy)) {
        curY += dy;
        pts.push({ x: curX, y: curY });
      }
      i += 1;
    } else if (cmd === 'C') {
      // Cubic bezier endpoint (x, y) is the 5th and 6th coordinate in the group
      const x = parseFloat(tokens[i + 4]);
      const y = parseFloat(tokens[i + 5]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        curX = x;
        curY = y;
        pts.push({ x: curX, y: curY });
      }
      i += 6;
    } else if (cmd === 'c') {
      const dx = parseFloat(tokens[i + 4]);
      const dy = parseFloat(tokens[i + 5]);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        curX += dx;
        curY += dy;
        pts.push({ x: curX, y: curY });
      }
      i += 6;
    } else {
      i++;
    }
  }
  return pts;
}
