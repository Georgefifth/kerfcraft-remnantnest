import { FabPart, Point2D, RotationConstraint } from '../types/fabrication';
import { normalizePolygon, createRectPolygon } from './geometry';

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
  if (!trimmed.includes('<svg') && !trimmed.includes('<rect') && !trimmed.includes('<polygon') && !trimmed.includes('<path')) {
    return {
      success: false,
      parts: [],
      warnings: [],
      error: 'Invalid SVG file: missing <svg>, <rect>, <polygon>, or <path> vector elements.',
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
    const idAttr = extractStringAttr(attrs, 'id') || extractStringAttr(attrs, 'data-name');
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
        rotationConstraint: grainAttr === 'locked' ? 'grain_locked' : defaultRotation,
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
    const idAttr = extractStringAttr(attrs, 'id') || extractStringAttr(attrs, 'data-name');
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

  // 3. Parse <path> elements (M / L / H / V / Z linear contours)
  const pathRegex = /<path\b([^>]*)\/?>/gi;
  while ((match = pathRegex.exec(trimmed)) !== null) {
    const attrs = match[1];
    const dStr = extractStringAttr(attrs, 'd');
    const idAttr = extractStringAttr(attrs, 'id') || extractStringAttr(attrs, 'data-name');
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
      error: 'No valid closed <rect>, <polygon>, or <path> contours with dimensions > 2mm were found in the SVG.',
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
 * Supports LWPOLYLINE, POLYLINE, and closed LINE loops.
 */
export function parseDxfToParts(
  dxfText: string,
  defaultMaterial = '6mm Baltic Birch Plywood',
  defaultRotation: RotationConstraint = 'orthogonal_90'
): ParseResult {
  const lines = dxfText.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim());
  if (lines.length < 4 || (!dxfText.includes('ENTITIES') && !dxfText.includes('LWPOLYLINE') && !dxfText.includes('LINE'))) {
    return {
      success: false,
      parts: [],
      warnings: [],
      error: 'Invalid ASCII DXF: missing ENTITIES section or LWPOLYLINE/LINE geometry records.',
    };
  }

  const parts: FabPart[] = [];
  const warnings: string[] = [];
  let idx = 0;

  let i = 0;
  while (i < lines.length) {
    const code = lines[i];
    const val = lines[i + 1] ?? '';

    if (code === '0' && val === 'LWPOLYLINE') {
      i += 2;
      const pts: Point2D[] = [];
      let layerName = '';
      let currentX: number | null = null;
      while (i < lines.length && !(lines[i] === '0')) {
        const c = lines[i];
        const v = lines[i + 1] ?? '';
        if (c === '8') {
          layerName = v;
        } else if (c === '10') {
          currentX = parseFloat(v);
        } else if (c === '20' && currentX !== null) {
          const y = parseFloat(v);
          if (!Number.isNaN(currentX) && !Number.isNaN(y)) {
            pts.push({ x: currentX, y });
          }
          currentX = null;
        }
        i += 2;
      }
      if (pts.length >= 3) {
        const norm = normalizePolygon(pts);
        if (norm.width > 2 && norm.height > 2) {
          parts.push({
            id: `dxf-lw-${idx + 1}-${Date.now().toString().slice(-3)}`,
            name: layerName && layerName !== '0' ? `DXF_${layerName}_${idx + 1}` : `DXF_Part_${idx + 1}`,
            quantity: 1,
            polygon: norm.polygon,
            width: norm.width,
            height: norm.height,
            areaMm2: norm.areaMm2,
            rotationConstraint: defaultRotation,
            materialTag: defaultMaterial,
            color: PART_COLORS[idx % PART_COLORS.length],
            sourceFormat: 'DXF',
          });
          idx++;
        }
      }
      continue;
    }
    i += 2;
  }

  if (parts.length === 0) {
    return {
      success: false,
      parts: [],
      warnings,
      error: 'No closed LWPOLYLINE contours (>2mm) found in DXF file. Ensure shapes are exported as LWPOLYLINE in mm.',
    };
  }

  return {
    success: true,
    parts,
    warnings,
  };
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
    } else {
      i++;
    }
  }
  return pts;
}
