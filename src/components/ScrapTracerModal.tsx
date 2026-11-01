import React, { useState, useMemo } from 'react';
import {
  traceRemnantFromSilhouettePreset,
  buildRemnantSheetFromTrace,
} from '../engine/remnantDetector';
import { StockOrRemnantSheet } from '../types/fabrication';
import { ScanLine, Plus, Sliders, X } from 'lucide-react';

interface ScrapTracerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTracedRemnant: (sheet: StockOrRemnantSheet) => void;
}

export const ScrapTracerModal: React.FC<ScrapTracerModalProps> = ({
  isOpen,
  onClose,
  onAddTracedRemnant,
}) => {
  const [presetType, setPresetType] = useState<
    'laser_skeleton' | 'corner_L_remnant' | 'miter_triangle_offcut'
  >('corner_L_remnant');
  const [name, setName] = useState('Remnant #R29 — Traced Workshop Offcut');
  const [material, setMaterial] = useState('3mm Matte Black Acrylic');
  const [widthMm, setWidthMm] = useState(520);
  const [heightMm, setHeightMm] = useState(360);
  const [thresholdPct, setThresholdPct] = useState(55);
  const [costUsd, setCostUsd] = useState(18);
  const [validationError, setValidationError] = useState<string | null>(null);

  const traceResult = useMemo(
    () =>
      traceRemnantFromSilhouettePreset(
        presetType,
        widthMm,
        heightMm,
        thresholdPct
      ),
    [presetType, widthMm, heightMm, thresholdPct]
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!name.trim()) {
      setValidationError('Remnant ID / label is required.');
      return;
    }
    if (widthMm < 120 || widthMm > 3000 || heightMm < 120 || heightMm > 3000) {
      setValidationError('Sheet bounding dimensions must be between 120mm and 3000mm.');
      return;
    }
    setValidationError(null);
    const newRemnant = buildRemnantSheetFromTrace(
      name.trim(),
      material.trim() || '3mm Cast Acrylic',
      3,
      widthMm,
      heightMm,
      costUsd,
      traceResult
    );
    onAddTracedRemnant(newRemnant);
    onClose();
  };

  const outerPts = traceResult.outerPolygon.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      data-testid="scrap-tracer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-2xl rounded border border-[#263240] bg-[#131920] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#263240] bg-[#0C1014]">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[#10B981]" />
            <h2 className="text-sm font-semibold text-[#F0F4F8]">
              Optical Scrap Contour Tracer & Remnant Digitizer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Scrap Tracer Modal"
            className="p-1 rounded text-[#8A99AD] hover:text-[#F0F4F8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Controls */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#8A99AD] mb-1 font-mono">
                1. Scrap Board Silhouette Pattern
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: 'corner_L_remnant',
                    label: 'L-Shaped Corner Offcut (Saw / CNC Remnant)',
                  },
                  {
                    id: 'laser_skeleton',
                    label: 'Perforated Laser Skeleton (2 Prior Cutout Windows)',
                  },
                  {
                    id: 'miter_triangle_offcut',
                    label: 'Angled Miter / Trapezoid Offcut Slab',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`trace-preset-${item.id}`}
                    onClick={() => setPresetType(item.id as typeof presetType)}
                    className={`text-left px-2.5 py-2 rounded border font-mono transition-colors cursor-pointer ${
                      presetType === item.id
                        ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                        : 'bg-[#0C1014] border-[#263240] text-[#8A99AD] hover:text-[#F0F4F8]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#8A99AD] mb-1 font-mono">
                2. Remnant Label & Material
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8] font-mono text-xs mb-2"
              />
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8] font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#8A99AD] mb-1 font-mono">Width (mm)</label>
                <input
                  type="number"
                  value={widthMm}
                  onChange={(e) => setWidthMm(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#8A99AD] mb-1 font-mono">Height (mm)</label>
                <input
                  type="number"
                  value={heightMm}
                  onChange={(e) => setHeightMm(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#8A99AD] mb-1 font-mono">Est. Value ($)</label>
                <input
                  type="number"
                  value={costUsd}
                  onChange={(e) => setCostUsd(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8] font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[#8A99AD] mb-1 font-mono">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#38BDF8]" /> Edge Safety Threshold
                </span>
                <span className="text-[#38BDF8]">{thresholdPct}%</span>
              </div>
              <input
                type="range"
                min={25}
                max={85}
                value={thresholdPct}
                onChange={(e) => setThresholdPct(Number(e.target.value))}
                className="w-full accent-[#10B981]"
              />
            </div>

            {validationError && (
              <div className="p-2 rounded bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] font-mono text-xs">
                {validationError}
              </div>
            )}
          </div>

          {/* Right Live Contour Vector Preview */}
          <div className="flex flex-col justify-between rounded border border-[#263240] bg-[#0C1014] p-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#8A99AD] mb-2">
              <span>Extracted Polygon Vector</span>
              <span className="text-[#10B981]">
                Usable: {(traceResult.usableAreaMm2 / 100).toFixed(0)} cm² ({traceResult.usableRatioPct}%)
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center cad-grid-bg rounded border border-[#263240] p-3 min-h-[200px]">
              <svg
                viewBox={`-15 -15 ${widthMm + 30} ${heightMm + 30}`}
                className="w-full h-44"
              >
                <polygon
                  points={outerPts}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10B981"
                  strokeWidth="4"
                />
                {traceResult.cutoutHoles.map((h) => (
                  <polygon
                    key={h.id}
                    points={h.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(239, 68, 68, 0.28)"
                    stroke="#EF4444"
                    strokeWidth="3"
                    strokeDasharray="8,5"
                  />
                ))}
              </svg>
            </div>

            <div className="mt-3 text-[11px] font-mono text-[#8A99AD]">
              Vertices: {traceResult.outerPolygon.length} outer · {traceResult.cutoutHoles.length} interior cutouts · Priority: Remnant-First
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#263240] bg-[#0C1014]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border border-[#263240] text-xs font-mono text-[#8A99AD] hover:text-[#F0F4F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-add-remnant-btn"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#10B981] text-[#0C1014] font-mono text-xs font-semibold hover:bg-[#10B981]/90 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Digitized Remnant to Active Job</span>
          </button>
        </div>
      </div>
    </div>
  );
};
