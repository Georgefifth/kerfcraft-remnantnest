export interface Point2D {
  x: number;
  y: number;
}

export type RotationConstraint = 'grain_locked' | 'orthogonal_90' | 'free_45';

export interface FabPart {
  id: string;
  name: string;
  quantity: number;
  /** Outer polygon in local millimeter coordinates (0,0 to width,height) */
  polygon: Point2D[];
  /** Optional interior cutout holes in local coordinates */
  holes?: Point2D[][];
  width: number;
  height: number;
  /** True polygon area in mm^2 */
  areaMm2: number;
  rotationConstraint: RotationConstraint;
  materialTag: string;
  color: string;
  sourceFormat: 'SVG' | 'DXF' | 'PARAMETRIC';
}

export interface StockOrRemnantSheet {
  id: string;
  name: string;
  kind: 'remnant' | 'fresh_stock';
  material: string;
  thicknessMm: number;
  width: number;
  height: number;
  /** Cost of this sheet or estimated value of remnant in USD */
  costUsd: number;
  /** Outer usable polygon (for irregular remnants) */
  outerPolygon: Point2D[];
  /** Previously cut-out holes or clamp keep-out zones on a remnant sheet */
  cutoutHoles: Array<{
    id: string;
    label: string;
    polygon: Point2D[];
  }>;
  enabled: boolean;
}

export interface PlacedPartInstance {
  instanceId: string;
  partId: string;
  partName: string;
  sheetId: string;
  sheetKind: 'remnant' | 'fresh_stock';
  x: number;
  y: number;
  rotationDeg: number;
  width: number;
  height: number;
  areaMm2: number;
  /** Transformed polygon in sheet coordinates */
  worldPolygon: Point2D[];
  grainLocked: boolean;
  color: string;
}

export interface SalvageableOffcut {
  id: string;
  sheetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  areaMm2: number;
  estimatedValueUsd: number;
}

export interface SheetNestLayout {
  sheet: StockOrRemnantSheet;
  placements: PlacedPartInstance[];
  salvageableOffcuts: SalvageableOffcut[];
  usableSheetAreaMm2: number;
  placedPartAreaMm2: number;
  utilizationPct: number;
  scrapAreaMm2: number;
}

export interface NestingResult {
  jobId: string;
  timestamp: string;
  kerfMm: number;
  partSpacingMm: number;
  sheetsUsed: SheetNestLayout[];
  unplacedParts: Array<{
    partId: string;
    partName: string;
    instanceIndex: number;
    width: number;
    height: number;
    reason: string;
  }>;
  /** Verification & Waste Impact Metrics */
  totalPartsRequested: number;
  totalPartsPlaced: number;
  zeroOverlapVerified: boolean;
  maxCollisionAreaMm2: number;
  remnantPartsPlaced: number;
  remnantAreaRescuedMm2: number;
  remnantAreaRescuedCm2: number;
  overallYieldPct: number;
  naiveFreshSheetYieldPct: number;
  naiveSheetsRequired: number;
  optimizedFreshSheetsRequired: number;
  scrapReducedCm2: number;
  estimatedCostSavedUsd: number;
  solveDurationMs: number;
  passesCompleted: number;
}

export interface FabricationPreset {
  id: string;
  title: string;
  subtitle: string;
  category: 'Laser / Acrylic' | 'Woodworking / Plywood' | 'CNC / Aluminum' | 'Sheet Metal / Enclosure';
  kerfMm: number;
  partSpacingMm: number;
  description: string;
  parts: FabPart[];
  sheets: StockOrRemnantSheet[];
}
