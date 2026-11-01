import React, { useState } from 'react';
import { SheetNestLayout, PlacedPartInstance } from '../types/fabrication';
import {
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Layers,
  Lock,
  Sparkles,
  Grid,
  Compass,
} from 'lucide-react';

interface BlueprintCanvasProps {
  layouts: SheetNestLayout[];
  activeSheetIndex: number;
  onSelectSheet: (idx: number) => void;
  kerfMm: number;
  partSpacingMm: number;
  zeroOverlapVerified: boolean;
  showKerfRings: boolean;
  onToggleKerfRings: () => void;
  showOffcuts: boolean;
  onToggleOffcuts: () => void;
  onSaveOffcutToBin: (offcutId: string) => void;
  savedOffcutIds: string[];
}

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  layouts,
  activeSheetIndex,
  onSelectSheet,
  kerfMm,
  partSpacingMm,
  zeroOverlapVerified,
  showKerfRings,
  onToggleKerfRings,
  showOffcuts,
  onToggleOffcuts,
  onSaveOffcutToBin,
  savedOffcutIds,
}) => {
  const [hoveredPart, setHoveredPart] = useState<PlacedPartInstance | null>(null);

  const currentLayout = layouts[activeSheetIndex] ?? layouts[0];

  if (!currentLayout) {
    return (
      <div
        data-testid="empty-canvas-state"
        className="flex flex-col items-center justify-center h-[420px] rounded border border-[#263240] bg-[#0C1014] p-6 text-center"
      >
        <Grid className="w-10 h-10 text-[#8A99AD] mb-3" />
        <p className="text-sm font-medium text-[#F0F4F8]">
          No Active Stock or Remnant Sheet Selected
        </p>
        <p className="text-xs text-[#8A99AD] mt-1 max-w-md">
          Enable at least one Remnant Offcut or Fresh Stock Sheet in the Remnant Inventory tab, or load a Fabrication Preset above.
        </p>
      </div>
    );
  }

  const { sheet, placements, salvageableOffcuts, utilizationPct } = currentLayout;
  const pad = 34;
  const vbWidth = sheet.width + pad * 2;
  const vbHeight = sheet.height + pad * 2;

  const outerPointsStr = sheet.outerPolygon
    .map((p) => `${p.x + pad},${p.y + pad}`)
    .join(' ');

  // Generate ruler ticks every 50mm or 100mm
  const xStep = sheet.width > 700 ? 100 : 50;
  const yStep = sheet.height > 500 ? 100 : 50;
  const xTicks: number[] = [];
  for (let x = 0; x <= sheet.width; x += xStep) xTicks.push(x);
  const yTicks: number[] = [];
  for (let y = 0; y <= sheet.height; y += yStep) yTicks.push(y);

  return (
    <div className="flex flex-col rounded border border-[#263240] bg-[#131920] overflow-hidden">
      {/* Top Sheet Switcher & CAD Layer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#263240] bg-[#0C1014]">
        <div className="flex flex-wrap items-center gap-1.5">
          {layouts.map((lay, idx) => {
            const isRemnant = lay.sheet.kind === 'remnant';
            const isActive = idx === activeSheetIndex;
            return (
              <button
                key={lay.sheet.id}
                type="button"
                data-testid={`sheet-tab-${idx}`}
                onClick={() => onSelectSheet(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                  isActive
                    ? isRemnant
                      ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/60 font-semibold'
                      : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/60 font-semibold'
                    : 'bg-[#131920] text-[#8A99AD] border border-[#263240] hover:text-[#F0F4F8]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRemnant ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                  }`}
                />
                <span>
                  {isRemnant ? 'REMNANT' : 'STOCK'} #{idx + 1} ({lay.sheet.width}×{lay.sheet.height}mm)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#0C1014]/70 text-[11px]">
                  {lay.placements.length} pts · {lay.utilizationPct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Layer Toggles & Verification Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleKerfRings}
            className={`px-2 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              showKerfRings
                ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/50'
                : 'bg-[#131920] text-[#8A99AD] border-[#263240]'
            }`}
          >
            Kerf + Spacing ({kerfMm + partSpacingMm}mm)
          </button>
          <button
            type="button"
            onClick={onToggleOffcuts}
            className={`px-2 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
              showOffcuts
                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50'
                : 'bg-[#131920] text-[#8A99AD] border-[#263240]'
            }`}
          >
            Salvageable Offcuts ({salvageableOffcuts.length})
          </button>
          <div
            data-testid="collision-verification-badge"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border ${
              zeroOverlapVerified
                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
            }`}
          >
            {zeroOverlapVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>0.0 mm² OVERLAP VERIFIED</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>COLLISION DETECTED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main SVG Machine Bed Viewport */}
      <div className="relative cad-grid-bg w-full overflow-hidden flex items-center justify-center p-2 sm:p-4 min-h-[340px] sm:min-h-[450px]">
        <svg
          data-testid="nesting-svg-canvas"
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          className="w-full h-auto max-h-[500px] select-none"
          role="img"
          aria-label={`CAD Nesting Bed for ${sheet.name}`}
        >
          <defs>
            {/* Diagonal crimson hatch pattern for already-cut remnant holes */}
            <pattern
              id="remnant-hole-hatch"
              width="10"
              height="10"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke="#EF4444"
                strokeWidth="2.2"
                strokeOpacity="0.45"
              />
            </pattern>

            {/* Emerald hatch for new salvageable offcut rectangles */}
            <pattern
              id="salvage-offcut-hatch"
              width="12"
              height="12"
              patternTransform="rotate(-45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeOpacity="0.25"
              />
            </pattern>
          </defs>

          {/* Top X Coordinate Ruler */}
          <g className="text-[#8A99AD]" fontFamily="JetBrains Mono, monospace" fontSize="9">
            <line
              x1={pad}
              y1={pad - 8}
              x2={pad + sheet.width}
              y2={pad - 8}
              stroke="#263240"
              strokeWidth="1"
            />
            {xTicks.map((x) => (
              <g key={`xtick-${x}`} transform={`translate(${pad + x}, ${pad - 8})`}>
                <line x1="0" y1="-4" x2="0" y2="4" stroke="#38BDF8" strokeOpacity="0.5" strokeWidth="1" />
                <text x="0" y="-7" textAnchor="middle" fill="#8A99AD">
                  {x}
                </text>
              </g>
            ))}
          </g>

          {/* Left Y Coordinate Ruler */}
          <g className="text-[#8A99AD]" fontFamily="JetBrains Mono, monospace" fontSize="9">
            <line
              x1={pad - 8}
              y1={pad}
              x2={pad - 8}
              y2={pad + sheet.height}
              stroke="#263240"
              strokeWidth="1"
            />
            {yTicks.map((y) => (
              <g key={`ytick-${y}`} transform={`translate(${pad - 8}, ${pad + y})`}>
                <line x1="-4" y1="0" x2="4" y2="0" stroke="#38BDF8" strokeOpacity="0.5" strokeWidth="1" />
                <text x="-6" y="3" textAnchor="end" fill="#8A99AD">
                  {y}
                </text>
              </g>
            ))}
          </g>

          {/* Wood Grain Direction Background Lines (if plywood/wood material) */}
          {sheet.material.toLowerCase().includes('plywood') ||
          sheet.material.toLowerCase().includes('birch') ||
          sheet.material.toLowerCase().includes('wood') ? (
            <g opacity="0.14">
              {Array.from({ length: Math.floor(sheet.height / 28) }).map((_, i) => (
                <line
                  key={`grain-line-${i}`}
                  x1={pad + 4}
                  y1={pad + (i + 1) * 28}
                  x2={pad + sheet.width - 4}
                  y2={pad + (i + 1) * 28}
                  stroke="#F59E0B"
                  strokeWidth="0.8"
                  strokeDasharray="16,6,8,6"
                />
              ))}
            </g>
          ) : null}

          {/* Sheet Outer Polygon Boundary */}
          <polygon
            points={outerPointsStr}
            fill={sheet.kind === 'remnant' ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.03)'}
            stroke={sheet.kind === 'remnant' ? '#10B981' : '#F59E0B'}
            strokeWidth="2"
          />

          {/* Remnant Interior Cutout Holes (Forbidden Prior Cutouts) */}
          {sheet.cutoutHoles.map((hole) => {
            const holePts = hole.polygon
              .map((p) => `${p.x + pad},${p.y + pad}`)
              .join(' ');
            const hx =
              hole.polygon.reduce((s, p) => s + p.x, 0) / hole.polygon.length + pad;
            const hy =
              hole.polygon.reduce((s, p) => s + p.y, 0) / hole.polygon.length + pad;
            return (
              <g key={hole.id} data-testid={`remnant-hole-${hole.id}`}>
                <polygon
                  points={holePts}
                  fill="url(#remnant-hole-hatch)"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeDasharray="5,3"
                />
                <rect
                  x={hx - 62}
                  y={hy - 9}
                  width="124"
                  height="18"
                  rx="2"
                  fill="#0C1014"
                  fillOpacity="0.88"
                  stroke="#EF4444"
                  strokeWidth="0.8"
                />
                <text
                  x={hx}
                  y={hy + 3}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="7.5"
                  fill="#EF4444"
                >
                  PRIOR CUTOUT (KEEP-OUT)
                </text>
              </g>
            );
          })}

          {/* Salvageable New Offcut Zones */}
          {showOffcuts &&
            salvageableOffcuts.map((offcut) => (
              <g key={offcut.id} data-testid={`salvage-offcut-${offcut.id}`}>
                <rect
                  x={pad + offcut.x}
                  y={pad + offcut.y}
                  width={offcut.width}
                  height={offcut.height}
                  fill="url(#salvage-offcut-hatch)"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />
                <rect
                  x={pad + offcut.x + offcut.width / 2 - 68}
                  y={pad + offcut.y + offcut.height / 2 - 14}
                  width="136"
                  height="28"
                  rx="3"
                  fill="#0C1014"
                  fillOpacity="0.9"
                  stroke="#10B981"
                  strokeWidth="1"
                />
                <text
                  x={pad + offcut.x + offcut.width / 2}
                  y={pad + offcut.y + offcut.height / 2 - 2}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="8"
                  fontWeight="600"
                  fill="#10B981"
                >
                  NEW REMNANT: {offcut.width}×{offcut.height}mm
                </text>
                <text
                  x={pad + offcut.x + offcut.width / 2}
                  y={pad + offcut.y + offcut.height / 2 + 9}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="7.5"
                  fill="#8A99AD"
                >
                  {(offcut.areaMm2 / 100).toFixed(0)} cm² · Save ~${offcut.estimatedValueUsd.toFixed(2)}
                </text>
              </g>
            ))}

          {/* Placed Fabrication Parts */}
          {placements.map((p) => {
            const ptsStr = p.worldPolygon
              .map((pt) => `${pt.x + pad},${pt.y + pad}`)
              .join(' ');
            const cx = pad + p.x + p.width / 2;
            const cy = pad + p.y + p.height / 2;
            const isHovered = hoveredPart?.instanceId === p.instanceId;

            return (
              <g
                key={p.instanceId}
                data-testid={`placed-part-${p.instanceId}`}
                onMouseEnter={() => setHoveredPart(p)}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Optional Kerf + Spacing Clearance Ring */}
                {showKerfRings && (
                  <polygon
                    points={ptsStr}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={Math.max(2.5, (kerfMm + partSpacingMm) * 1.4)}
                    strokeOpacity="0.32"
                    strokeLinejoin="round"
                  />
                )}

                {/* Actual Part Polygon */}
                <polygon
                  points={ptsStr}
                  fill={p.color}
                  fillOpacity={isHovered ? 0.42 : 0.24}
                  stroke={isHovered ? '#F0F4F8' : p.color}
                  strokeWidth={isHovered ? '2.2' : '1.5'}
                />

                {/* Grain Direction Vector Arrow if Grain-Locked */}
                {p.grainLocked && p.width >= 60 && (
                  <g opacity="0.85">
                    <line
                      x1={cx - Math.min(28, p.width * 0.28)}
                      y1={cy + 9}
                      x2={cx + Math.min(28, p.width * 0.28)}
                      y2={cy + 9}
                      stroke="#38BDF8"
                      strokeWidth="1.2"
                    />
                    <polygon
                      points={`${cx + Math.min(28, p.width * 0.28)},${cy + 9} ${
                        cx + Math.min(28, p.width * 0.28) - 5
                      },${cy + 6.5} ${cx + Math.min(28, p.width * 0.28) - 5},${cy + 11.5}`}
                      fill="#38BDF8"
                    />
                  </g>
                )}

                {/* Part Label & Millimeter Dimensions */}
                {p.width >= 48 && p.height >= 26 && (
                  <>
                    <text
                      x={cx}
                      y={cy - 2}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize={p.width > 110 ? '8.5' : '7'}
                      fontWeight="600"
                      fill="#F0F4F8"
                    >
                      {p.partName.slice(0, 18)}
                    </text>
                    <text
                      x={cx}
                      y={cy + (p.grainLocked ? 6 : 8)}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="6.8"
                      fill="#cbd5e1"
                    >
                      {p.width}×{p.height}mm · {p.rotationDeg}°
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Telemetry Overlay for Hovered Part */}
        {hoveredPart && (
          <div className="absolute bottom-3 left-3 bg-[#0C1014]/95 border border-[#38BDF8]/60 rounded px-3 py-2 text-xs font-mono shadow-lg pointer-events-none">
            <div className="flex items-center gap-2 text-[#F0F4F8] font-semibold">
              <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{hoveredPart.partName}</span>
              {hoveredPart.grainLocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#38BDF8]/20 text-[#38BDF8] text-[10px]">
                  <Lock className="w-2.5 h-2.5" /> GRAIN LOCKED
                </span>
              )}
            </div>
            <div className="text-[#8A99AD] mt-1">
              Origin: X={hoveredPart.x}mm, Y={hoveredPart.y}mm | Size: {hoveredPart.width}×{hoveredPart.height}mm | Area: {(hoveredPart.areaMm2 / 100).toFixed(1)} cm² | Rot: {hoveredPart.rotationDeg}°
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Status & Salvageable Offcut Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-[#263240] bg-[#0C1014] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 text-[#8A99AD]">
          <span>
            Sheet: <strong className="text-[#F0F4F8]">{sheet.name}</strong>
          </span>
          <span>
            Material: <strong className="text-[#F0F4F8]">{sheet.material}</strong>
          </span>
          <span>
            Sheet Yield: <strong className="text-[#10B981]">{utilizationPct}%</strong>
          </span>
        </div>

        {salvageableOffcuts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {salvageableOffcuts.map((offcut) => {
              const alreadySaved = savedOffcutIds.includes(offcut.id);
              return (
                <button
                  key={offcut.id}
                  type="button"
                  data-testid={`save-offcut-btn-${offcut.id}`}
                  disabled={alreadySaved}
                  onClick={() => onSaveOffcutToBin(offcut.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                    alreadySaved
                      ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 cursor-default'
                      : 'bg-[#10B981] text-[#0C1014] font-semibold border-[#10B981] hover:bg-[#10B981]/90'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {alreadySaved
                      ? `Saved ${offcut.width}×${offcut.height}mm Offcut to Bin`
                      : `+ Save ${offcut.width}×${offcut.height}mm New Offcut to Remnant Bin`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
