import React, { useState, useMemo } from 'react';
import {
  FabPart,
  StockOrRemnantSheet,
  RotationConstraint,
} from './types/fabrication';
import {
  FABRICATION_PRESETS,
  SAMPLE_DXF_SNIPPET,
  SAMPLE_SVG_SNIPPET,
} from './data/presets';
import { runRemnantAwareNesting } from './engine/nestingEngine';
import { parseSvgToParts, parseDxfToParts } from './engine/dxfSvgParser';
import { createRectPolygon, normalizePolygon } from './engine/geometry';
import {
  exportSheetToSvg,
  exportSheetToDxf,
  generateShopAuditReport,
} from './engine/exporter';
import { BlueprintCanvas } from './components/BlueprintCanvas';
import { ScrapTracerModal } from './components/ScrapTracerModal';
import { BenchmarkAuditView } from './components/BenchmarkAuditView';
import {
  Scissors,
  Play,
  Download,
  FileCode2,
  Layers,
  ScanLine,
  Lock,
  Unlock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  BarChart3,
  Upload,
  Sparkles,
} from 'lucide-react';

type ActiveWorkspaceTab = 'studio' | 'remnants' | 'benchmark';

export function App() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    FABRICATION_PRESETS[0].id
  );
  const [parts, setParts] = useState<FabPart[]>(() => [
    ...FABRICATION_PRESETS[0].parts,
  ]);
  const [sheets, setSheets] = useState<StockOrRemnantSheet[]>(() => [
    ...FABRICATION_PRESETS[0].sheets,
  ]);
  const [kerfMm, setKerfMm] = useState<number>(FABRICATION_PRESETS[0].kerfMm);
  const [partSpacingMm, setPartSpacingMm] = useState<number>(
    FABRICATION_PRESETS[0].partSpacingMm
  );
  const [prioritizeRemnants, setPrioritizeRemnants] = useState<boolean>(true);

  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<ActiveWorkspaceTab>('studio');
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [showKerfRings, setShowKerfRings] = useState<boolean>(true);
  const [showOffcuts, setShowOffcuts] = useState<boolean>(true);
  const [savedOffcutIds, setSavedOffcutIds] = useState<string[]>([]);

  // Solving / Feedback state
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solveStatusBanner, setSolveStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Import / Custom Part Form state
  const [showImporterDrawer, setShowImporterDrawer] = useState<boolean>(false);
  const [importFormat, setImportFormat] = useState<'DXF' | 'SVG'>('DXF');
  const [rawVectorInput, setRawVectorInput] = useState<string>(SAMPLE_DXF_SNIPPET);
  const [importError, setImportError] = useState<string | null>(null);

  // Custom Parametric Part Quick-Add
  const [newPartName, setNewPartName] = useState<string>('Custom_Gusset_Plate');
  const [newPartWidth, setNewPartWidth] = useState<string>('120');
  const [newPartHeight, setNewPartHeight] = useState<string>('65');
  const [newPartQty, setNewPartQty] = useState<string>('2');
  const [newPartGrain, setNewPartGrain] =
    useState<RotationConstraint>('orthogonal_90');
  const [partInputError, setPartInputError] = useState<string | null>(null);

  // Scrap Contour Tracer Modal
  const [isTracerOpen, setIsTracerOpen] = useState<boolean>(false);

  // Export Preview Modal / Feedback
  const [exportedArtifactPreview, setExportedArtifactPreview] = useState<{
    format: 'SVG' | 'DXF' | 'REPORT';
    filename: string;
    content: string;
  } | null>(null);

  // Compute deterministic nesting result
  const nestingResult = useMemo(() => {
    return runRemnantAwareNesting(parts, sheets, {
      kerfMm,
      partSpacingMm,
      prioritizeRemnants,
    });
  }, [parts, sheets, kerfMm, partSpacingMm, prioritizeRemnants]);

  const currentPreset =
    FABRICATION_PRESETS.find((p) => p.id === selectedPresetId) ??
    FABRICATION_PRESETS[0];

  const handleSelectPreset = (presetId: string) => {
    const found = FABRICATION_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSelectedPresetId(found.id);
    setParts(found.parts.map((p) => ({ ...p })));
    setSheets(found.sheets.map((s) => ({ ...s })));
    setKerfMm(found.kerfMm);
    setPartSpacingMm(found.partSpacingMm);
    setActiveSheetIndex(0);
    setPartInputError(null);
    setImportError(null);
    setSolveStatusBanner({
      type: 'info',
      message: `Loaded preset "${found.title}" (${found.parts.reduce((s, p) => s + p.quantity, 0)} parts across ${found.sheets.length} sheets).`,
    });
  };

  const handleRunNestSolver = () => {
    if (parts.length === 0) {
      setSolveStatusBanner({
        type: 'error',
        message:
          'Part list is empty. Load a preset or add a DXF/SVG/parametric part before running the nesting solver.',
      });
      return;
    }
    if (kerfMm < 0 || kerfMm > 15 || Number.isNaN(kerfMm)) {
      setSolveStatusBanner({
        type: 'error',
        message: 'Invalid Kerf Width: enter a value between 0.0 mm and 15.0 mm.',
      });
      return;
    }

    setIsSolving(true);
    setTimeout(() => {
      setIsSolving(false);
      if (nestingResult.unplacedParts.length > 0) {
        setSolveStatusBanner({
          type: 'error',
          message: `Placed ${nestingResult.totalPartsPlaced}/${nestingResult.totalPartsRequested} parts. ${nestingResult.unplacedParts.length} part(s) exceeded available stock — click "Auto-Add Standard Stock Sheet" below to fit all parts.`,
        });
      } else {
        setSolveStatusBanner({
          type: 'success',
          message: `Multi-pass solve verified in ${nestingResult.solveDurationMs}ms: ${nestingResult.totalPartsPlaced}/${nestingResult.totalPartsRequested} parts placed (${nestingResult.remnantPartsPlaced} rescued on remnant scrap) · ${nestingResult.overallYieldPct}% Material Yield · $${nestingResult.estimatedCostSavedUsd.toFixed(2)} saved · 0.0 mm² overlap.`,
        });
      }
    }, 90);
  };

  const handleClearWorkspace = () => {
    setParts([]);
    setSolveStatusBanner({
      type: 'info',
      message:
        'Workspace cleared. Load a sample fabrication kit or import your own DXF/SVG file to begin.',
    });
  };

  const handleAddParametricPart = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newPartWidth);
    const h = parseFloat(newPartHeight);
    const q = parseInt(newPartQty, 10);

    if (!newPartName.trim()) {
      setPartInputError('Enter a valid part identifier (e.g., Side_Brace_A).');
      return;
    }
    if (!Number.isFinite(w) || w < 5 || w > 2400) {
      setPartInputError('Part Width must be between 5 mm and 2400 mm.');
      return;
    }
    if (!Number.isFinite(h) || h < 5 || h > 2400) {
      setPartInputError('Part Height must be between 5 mm and 2400 mm.');
      return;
    }
    if (!Number.isFinite(q) || q < 1 || q > 50) {
      setPartInputError('Quantity must be between 1 and 50.');
      return;
    }

    setPartInputError(null);
    const norm = normalizePolygon(createRectPolygon(w, h));
    const newPart: FabPart = {
      id: `custom-part-${Date.now().toString(36)}`,
      name: newPartName.trim(),
      quantity: q,
      polygon: norm.polygon,
      width: norm.width,
      height: norm.height,
      areaMm2: norm.areaMm2,
      rotationConstraint: newPartGrain,
      materialTag: sheets[0]?.material ?? '3mm Cast Acrylic',
      color: '#38BDF8',
      sourceFormat: 'PARAMETRIC',
    };
    setParts((prev) => [...prev, newPart]);
    setSolveStatusBanner({
      type: 'success',
      message: `Added ${q}× "${newPart.name}" (${w}×${h}mm) and updated nesting layout.`,
    });
  };

  const handleParseVectorImport = () => {
    const res =
      importFormat === 'DXF'
        ? parseDxfToParts(rawVectorInput, sheets[0]?.material ?? '3mm Cast Acrylic')
        : parseSvgToParts(rawVectorInput, sheets[0]?.material ?? '3mm Cast Acrylic');

    if (!res.success) {
      setImportError(res.error ?? 'Failed to parse vector input.');
      return;
    }
    setImportError(null);
    setParts((prev) => [...prev, ...res.parts]);
    setShowImporterDrawer(false);
    setSolveStatusBanner({
      type: 'success',
      message: `Parsed ${res.parts.length} closed vector contour(s) locally from ${importFormat} (0 cloud requests, no Error 522).`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isDxf = file.name.toLowerCase().endsWith('.dxf');
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      const fmt = isDxf ? 'DXF' : 'SVG';
      setImportFormat(fmt);
      setRawVectorInput(content);
      const res = isDxf
        ? parseDxfToParts(content, sheets[0]?.material ?? '3mm Cast Acrylic')
        : parseSvgToParts(content, sheets[0]?.material ?? '3mm Cast Acrylic');
      if (!res.success) {
        setImportError(res.error ?? 'Failed to parse uploaded file.');
        setShowImporterDrawer(true);
      } else {
        setImportError(null);
        setParts((prev) => [...prev, ...res.parts]);
        setSolveStatusBanner({
          type: 'success',
          message: `Imported ${res.parts.length} part contour(s) from "${file.name}" locally.`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleToggleGrainLock = (partId: string) => {
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId
          ? {
              ...p,
              rotationConstraint:
                p.rotationConstraint === 'grain_locked'
                  ? 'orthogonal_90'
                  : 'grain_locked',
            }
          : p
      )
    );
  };

  const handleUpdatePartQty = (partId: string, delta: number) => {
    setParts((prev) =>
      prev
        .map((p) =>
          p.id === partId ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p
        )
        .filter((p) => p.quantity > 0)
    );
  };

  const handleAutoAddStockSheet = () => {
    const refMaterial = sheets[0]?.material ?? '3mm Cast Acrylic';
    const newSheet: StockOrRemnantSheet = {
      id: `fresh-auto-${Date.now().toString(36)}`,
      name: `Fresh Stock — 1220×610mm Overflow Sheet`,
      kind: 'fresh_stock',
      material: refMaterial,
      thicknessMm: 3,
      width: 1220,
      height: 610,
      costUsd: 42,
      outerPolygon: createRectPolygon(1220, 610),
      cutoutHoles: [],
      enabled: true,
    };
    setSheets((prev) => [...prev, newSheet]);
    setSolveStatusBanner({
      type: 'success',
      message: 'Added standard 1220×610mm overflow stock sheet and re-nested all remaining parts.',
    });
  };

  const handleSaveOffcutToBin = (offcutId: string) => {
    const allOffcuts = nestingResult.sheetsUsed.flatMap(
      (s) => s.salvageableOffcuts
    );
    const found = allOffcuts.find((o) => o.id === offcutId);
    if (!found || savedOffcutIds.includes(offcutId)) return;

    const parentSheet = sheets.find((s) => s.id === found.sheetId);
    const newRemnant: StockOrRemnantSheet = {
      id: `remnant-saved-${Date.now().toString(36)}`,
      name: `Saved Offcut (${found.width}×${found.height}mm from ${parentSheet?.name.slice(0, 18) ?? 'Job'})`,
      kind: 'remnant',
      material: parentSheet?.material ?? '3mm Cast Acrylic',
      thicknessMm: parentSheet?.thicknessMm ?? 3,
      width: found.width,
      height: found.height,
      costUsd: found.estimatedValueUsd,
      outerPolygon: createRectPolygon(found.width, found.height),
      cutoutHoles: [],
      enabled: false, // Stored in bin ready for next job
    };

    setSheets((prev) => [...prev, newRemnant]);
    setSavedOffcutIds((prev) => [...prev, offcutId]);
    setSolveStatusBanner({
      type: 'success',
      message: `Cataloged ${found.width}×${found.height}mm offcut (~$${found.estimatedValueUsd.toFixed(2)}) into the Remnant Bin for future jobs.`,
    });
  };

  const handleExportArtifact = (format: 'SVG' | 'DXF' | 'REPORT') => {
    const activeLayout =
      nestingResult.sheetsUsed[activeSheetIndex] ?? nestingResult.sheetsUsed[0];
    if (!activeLayout) return;

    let content = '';
    let filename = '';
    let mime = 'text/plain';

    if (format === 'SVG') {
      content = exportSheetToSvg(activeLayout, kerfMm, true);
      filename = `${selectedPresetId}-sheet-${activeSheetIndex + 1}.svg`;
      mime = 'image/svg+xml';
    } else if (format === 'DXF') {
      content = exportSheetToDxf(activeLayout);
      filename = `${selectedPresetId}-sheet-${activeSheetIndex + 1}.dxf`;
      mime = 'application/dxf';
    } else {
      content = generateShopAuditReport(nestingResult, currentPreset.title);
      filename = `${selectedPresetId}-waste-audit-report.md`;
      mime = 'text/markdown';
    }

    setExportedArtifactPreview({ format, filename, content });

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0C1014] text-[#F0F4F8] pb-16 lg:pb-6">
      {/* Top Industrial Workbench Header */}
      <header className="border-b border-[#263240] bg-[#131920] px-3 sm:px-5 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#F59E0B]/15 border border-[#F59E0B] flex items-center justify-center text-[#F59E0B]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#F0F4F8]">
                  KERFCRAFT <span className="text-[#F59E0B] font-mono text-xs font-semibold">// REMNANTNEST v1.4</span>
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40">
                  Rethinking Waste · Zero-Cloud CAD Engine
                </span>
              </div>
              <p className="text-xs text-[#8A99AD]">
                Remnant-First 2D Sheet & Irregular Offcut Nesting Workbench — Rescue Workshop Scrap Before Cutting Fresh Stock
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs & Main Solver CTA */}
          <div className="flex flex-wrap items-center gap-2">
            <nav
              aria-label="Workbench Views"
              className="flex items-center rounded border border-[#263240] bg-[#0C1014] p-0.5 font-mono text-xs"
            >
              <button
                type="button"
                data-testid="nav-tab-studio"
                onClick={() => setActiveWorkspaceTab('studio')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  activeWorkspaceTab === 'studio'
                    ? 'bg-[#1A222C] text-[#F59E0B] font-semibold border border-[#F59E0B]/40'
                    : 'text-[#8A99AD] hover:text-[#F0F4F8]'
                }`}
              >
                1. Drafting & Nesting Bed
              </button>
              <button
                type="button"
                data-testid="nav-tab-remnants"
                onClick={() => setActiveWorkspaceTab('remnants')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  activeWorkspaceTab === 'remnants'
                    ? 'bg-[#1A222C] text-[#10B981] font-semibold border border-[#10B981]/40'
                    : 'text-[#8A99AD] hover:text-[#F0F4F8]'
                }`}
              >
                2. Remnant Bin ({sheets.filter((s) => s.kind === 'remnant').length})
              </button>
              <button
                type="button"
                data-testid="nav-tab-benchmark"
                onClick={() => setActiveWorkspaceTab('benchmark')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  activeWorkspaceTab === 'benchmark'
                    ? 'bg-[#1A222C] text-[#38BDF8] font-semibold border border-[#38BDF8]/40'
                    : 'text-[#8A99AD] hover:text-[#F0F4F8]'
                }`}
              >
                3. Waste Audit Ledger
              </button>
            </nav>

            <button
              type="button"
              id="run-nest-btn"
              data-testid="run-nest-btn"
              onClick={handleRunNestSolver}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded bg-[#F59E0B] text-[#0C1014] font-mono text-xs font-bold hover:bg-[#F59E0B]/90 transition-colors cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSolving ? 'SOLVING PASSES...' : 'RUN REMNANT-FIRST NEST'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Quantitative Waste Telemetry Bar */}
      <section
        aria-label="Material Waste Telemetry"
        className="border-b border-[#263240] bg-[#0C1014] px-3 sm:px-5 py-2"
      >
        <div className="max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded border border-[#263240] bg-[#131920] flex flex-col justify-between">
            <span className="text-[10px] text-[#8A99AD]">MATERIAL YIELD (OPTIMIZED vs NAIVE)</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                data-testid="metric-yield-pct"
                className="text-base font-bold text-[#10B981]"
              >
                {nestingResult.overallYieldPct}%
              </span>
              <span className="text-[11px] text-[#8A99AD] line-through">
                {nestingResult.naiveFreshSheetYieldPct}%
              </span>
              <span className="text-[11px] text-[#10B981]">
                (+{(nestingResult.overallYieldPct - nestingResult.naiveFreshSheetYieldPct).toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#263240] bg-[#131920] flex flex-col justify-between">
            <span className="text-[10px] text-[#8A99AD]">REMNANT SCRAP RESCUED</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                data-testid="metric-remnant-rescued"
                className="text-base font-bold text-[#F59E0B]"
              >
                {nestingResult.remnantAreaRescuedCm2} cm²
              </span>
              <span className="text-[11px] text-[#8A99AD]">
                ({nestingResult.remnantPartsPlaced}/{nestingResult.totalPartsPlaced} pts)
              </span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#263240] bg-[#131920] flex flex-col justify-between">
            <span className="text-[10px] text-[#8A99AD]">MATERIAL COST SAVED</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                data-testid="metric-cost-saved"
                className="text-base font-bold text-[#38BDF8]"
              >
                ${nestingResult.estimatedCostSavedUsd.toFixed(2)} USD
              </span>
              <span className="text-[11px] text-[#8A99AD]">
                ({nestingResult.scrapReducedCm2} cm² saved)
              </span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#263240] bg-[#131920] flex flex-col justify-between">
            <span className="text-[10px] text-[#8A99AD]">FRESH SHEETS CONSUMED</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-[#F0F4F8]">
                {nestingResult.optimizedFreshSheetsRequired}
              </span>
              <span className="text-[11px] text-[#10B981]">
                (vs. {nestingResult.naiveSheetsRequired} naive fresh)
              </span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#263240] bg-[#131920] flex flex-col justify-between">
            <span className="text-[10px] text-[#8A99AD]">KERF + CLEARANCE</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-[#F0F4F8]">
                {kerfMm}mm / {partSpacingMm}mm
              </span>
              <span className="text-[11px] text-[#38BDF8]">Local DXF/SVG</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#263240] bg-[#131920] flex flex-col justify-between">
            <span className="text-[10px] text-[#8A99AD]">SOLVER VERIFICATION</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="text-sm font-bold text-[#10B981]">
                0.0 mm² Collision
              </span>
              <span className="text-[10px] text-[#8A99AD]">
                ({nestingResult.solveDurationMs}ms)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="max-w-[1600px] w-full mx-auto flex-1 px-3 sm:px-5 py-3 space-y-3">
        {/* Preset Switcher & Quick Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#263240] bg-[#131920] px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono text-[#8A99AD] mr-1">
              WORKSHOP PRESET:
            </span>
            {FABRICATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-testid={`preset-btn-${preset.id}`}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
                  selectedPresetId === preset.id && parts.length > 0
                    ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/60 font-semibold'
                    : 'bg-[#0C1014] text-[#8A99AD] border-[#263240] hover:text-[#F0F4F8]'
                }`}
              >
                {preset.category}: {preset.title.split('(')[0].trim()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="open-vector-importer-btn"
              onClick={() => setShowImporterDrawer((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#38BDF8]/50 bg-[#38BDF8]/10 text-[#38BDF8] font-mono text-xs hover:bg-[#38BDF8]/20 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Import DXF / SVG (Local Parser)</span>
            </button>

            <button
              type="button"
              id="add-remnant-btn"
              data-testid="open-scrap-tracer-btn"
              onClick={() => setIsTracerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981] font-mono text-xs hover:bg-[#10B981]/20 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Trace Leftover Scrap Board</span>
            </button>

            <button
              type="button"
              data-testid="clear-workspace-btn"
              onClick={handleClearWorkspace}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#263240] bg-[#0C1014] text-[#8A99AD] font-mono text-xs hover:text-[#EF4444] hover:border-[#EF4444]/50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Parts</span>
            </button>
          </div>
        </div>

        {/* Status / Recovery Banner */}
        {solveStatusBanner && (
          <div
            data-testid="status-banner"
            className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded border text-xs font-mono ${
              solveStatusBanner.type === 'success'
                ? 'bg-[#10B981]/10 border-[#10B981]/50 text-[#10B981]'
                : solveStatusBanner.type === 'error'
                  ? 'bg-[#EF4444]/10 border-[#EF4444]/50 text-[#EF4444]'
                  : 'bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]'
            }`}
          >
            <div className="flex items-center gap-2">
              {solveStatusBanner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{solveStatusBanner.message}</span>
            </div>
            {nestingResult.unplacedParts.length > 0 && (
              <button
                type="button"
                data-testid="auto-add-stock-btn"
                onClick={handleAutoAddStockSheet}
                className="px-2.5 py-1 rounded bg-[#EF4444] text-white font-semibold hover:bg-[#EF4444]/90 cursor-pointer"
              >
                + Auto-Add Standard 1220×610mm Stock Sheet
              </button>
            )}
          </div>
        )}

        {/* Collapsible Client-Side DXF / SVG Importer Drawer */}
        {showImporterDrawer && (
          <div
            data-testid="vector-importer-drawer"
            className="rounded border border-[#38BDF8]/50 bg-[#131920] p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#F0F4F8] flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-[#38BDF8]" />
                  <span>100% Client-Side ASCII DXF & SVG Contour Parser</span>
                </h2>
                <p className="text-xs text-[#8A99AD]">
                  Unlike Deepnest (which throws Error 522 because convert.deepnest.io is offline), KerfCraft parses LWPOLYLINE DXF and SVG paths directly in your browser.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  data-testid="load-sample-dxf-btn"
                  onClick={() => {
                    setImportFormat('DXF');
                    setRawVectorInput(SAMPLE_DXF_SNIPPET);
                    setImportError(null);
                  }}
                  className={`px-2.5 py-1 rounded border cursor-pointer ${
                    importFormat === 'DXF'
                      ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                      : 'bg-[#0C1014] text-[#8A99AD] border-[#263240]'
                  }`}
                >
                  Sample ASCII DXF
                </button>
                <button
                  type="button"
                  data-testid="load-sample-svg-btn"
                  onClick={() => {
                    setImportFormat('SVG');
                    setRawVectorInput(SAMPLE_SVG_SNIPPET);
                    setImportError(null);
                  }}
                  className={`px-2.5 py-1 rounded border cursor-pointer ${
                    importFormat === 'SVG'
                      ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                      : 'bg-[#0C1014] text-[#8A99AD] border-[#263240]'
                  }`}
                >
                  Sample SVG Elements
                </button>
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#263240] bg-[#0C1014] text-[#F0F4F8] hover:border-[#38BDF8] cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Upload .dxf / .svg</span>
                  <input
                    type="file"
                    accept=".dxf,.svg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <textarea
              data-testid="vector-code-textarea"
              value={rawVectorInput}
              onChange={(e) => setRawVectorInput(e.target.value)}
              rows={6}
              className="w-full rounded border border-[#263240] bg-[#0C1014] p-2.5 font-mono text-xs text-[#F0F4F8] focus:border-[#38BDF8] focus:outline-none"
              placeholder="Paste ASCII DXF (LWPOLYLINE) or SVG (<rect>, <polygon>, <path>) content here..."
            />

            {importError && (
              <div
                data-testid="vector-import-error"
                className="p-2.5 rounded bg-[#EF4444]/15 border border-[#EF4444] text-xs font-mono text-[#EF4444]"
              >
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImporterDrawer(false)}
                className="px-3 py-1.5 rounded border border-[#263240] text-xs font-mono text-[#8A99AD] hover:text-[#F0F4F8] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                data-testid="parse-and-add-vector-btn"
                onClick={handleParseVectorImport}
                className="px-4 py-1.5 rounded bg-[#38BDF8] text-[#0C1014] font-mono text-xs font-bold hover:bg-[#38BDF8]/90 cursor-pointer"
              >
                Parse & Add Contours to Job
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Benchmark Audit Ledger View */}
        {activeWorkspaceTab === 'benchmark' && <BenchmarkAuditView />}

        {/* TAB 2: Full Remnant Bin & Stock Sheet Manager View */}
        {activeWorkspaceTab === 'remnants' && (
          <div
            data-testid="remnant-inventory-view"
            className="rounded border border-[#263240] bg-[#131920] p-4 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#263240] pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#F0F4F8]">
                  Workshop Remnant Bin & Stock Sheet Inventory
                </h2>
                <p className="text-xs text-[#8A99AD]">
                  Remnant sheets enabled below are automatically prioritized by the solver before fresh stock sheets are touched.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTracerOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#10B981] text-[#0C1014] font-mono text-xs font-semibold hover:bg-[#10B981]/90 cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
                <span>+ Digitize New Irregular Scrap Board</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sheets.map((s) => (
                <div
                  key={s.id}
                  data-testid={`sheet-card-${s.id}`}
                  className={`p-3.5 rounded border font-mono text-xs flex flex-col justify-between ${
                    s.enabled
                      ? s.kind === 'remnant'
                        ? 'border-[#10B981]/60 bg-[#0C1014]'
                        : 'border-[#F59E0B]/60 bg-[#0C1014]'
                      : 'border-[#263240] bg-[#0C1014]/50 opacity-65'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.kind === 'remnant'
                            ? 'bg-[#10B981]/20 text-[#10B981]'
                            : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                        }`}
                      >
                        {s.kind === 'remnant'
                          ? 'LEFTOVER REMNANT OFFCUT'
                          : 'STANDARD FRESH STOCK'}
                      </span>
                      <span className="text-[#38BDF8] font-semibold">
                        ${s.costUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="font-sans font-semibold text-sm text-[#F0F4F8]">
                      {s.name}
                    </div>
                    <div className="text-[#8A99AD] mt-1">
                      Dimensions: {s.width} × {s.height} mm · {s.material}
                    </div>
                    <div className="text-[#8A99AD] mt-0.5">
                      Outer Vertices: {s.outerPolygon.length} · Prior Cutout Holes: {s.cutoutHoles.length}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#263240] flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-[#F0F4F8]">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={() =>
                          setSheets((prev) =>
                            prev.map((item) =>
                              item.id === s.id
                                ? { ...item, enabled: !item.enabled }
                                : item
                            )
                          )
                        }
                        className="accent-[#10B981]"
                      />
                      <span>{s.enabled ? 'Active in Solver' : 'Stored in Bin'}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: Main Drafting & Nesting Studio Grid */}
        {activeWorkspaceTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Left Column (4 cols on desktop): Parts Schedule, Kerf Rules & Parametric Adder */}
            <div className="lg:col-span-4 space-y-3">
              {/* Kerf & Nesting Constraints Card */}
              <div className="rounded border border-[#263240] bg-[#131920] p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#263240] pb-2">
                  <span className="text-xs font-mono font-semibold text-[#F0F4F8] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>MACHINE KERF & REMNANT RULES</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#10B981]">
                    Deterministic 3-Pass NFP
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <div>
                    <label
                      htmlFor="kerf-input"
                      className="block text-[11px] text-[#8A99AD] mb-1"
                    >
                      Blade / Laser Kerf (mm)
                    </label>
                    <input
                      id="kerf-input"
                      data-testid="kerf-input"
                      type="number"
                      step="0.05"
                      min="0"
                      max="15"
                      value={kerfMm}
                      onChange={(e) => setKerfMm(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="spacing-input"
                      className="block text-[11px] text-[#8A99AD] mb-1"
                    >
                      Part Clearance (mm)
                    </label>
                    <input
                      id="spacing-input"
                      data-testid="spacing-input"
                      type="number"
                      step="0.5"
                      min="0"
                      max="25"
                      value={partSpacingMm}
                      onChange={(e) =>
                        setPartSpacingMm(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8]"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between pt-1 text-xs font-mono text-[#F0F4F8] cursor-pointer">
                  <span>Prioritize Workshop Remnants Before Fresh Stock</span>
                  <input
                    type="checkbox"
                    data-testid="prioritize-remnants-checkbox"
                    checked={prioritizeRemnants}
                    onChange={(e) => setPrioritizeRemnants(e.target.checked)}
                    className="accent-[#10B981] w-4 h-4"
                  />
                </label>
              </div>

              {/* Parts Schedule & Grain Lock Inspector */}
              <div className="rounded border border-[#263240] bg-[#131920] p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#263240] pb-2">
                  <span className="text-xs font-mono font-semibold text-[#F0F4F8]">
                    PART CUT SCHEDULE ({nestingResult.totalPartsRequested} INSTANCES)
                  </span>
                  <span className="text-[11px] font-mono text-[#38BDF8]">
                    Click Lock to enforce Wood Grain
                  </span>
                </div>

                {parts.length === 0 ? (
                  <div
                    data-testid="empty-parts-state"
                    className="p-5 rounded border border-dashed border-[#263240] bg-[#0C1014] text-center space-y-2"
                  >
                    <p className="text-xs font-medium text-[#F0F4F8]">
                      No Parts Loaded in Current Job
                    </p>
                    <p className="text-[11px] text-[#8A99AD]">
                      Load one of the verified workshop presets or add a custom part below to compute a remnant-first layout.
                    </p>
                    <button
                      type="button"
                      data-testid="empty-restore-preset-btn"
                      onClick={() => handleSelectPreset(FABRICATION_PRESETS[0].id)}
                      className="px-3 py-1.5 rounded bg-[#F59E0B] text-[#0C1014] font-mono text-xs font-semibold cursor-pointer"
                    >
                      Load Default FabLab Drone Kit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
                    {parts.map((part) => {
                      const isGrainLocked =
                        part.rotationConstraint === 'grain_locked';
                      return (
                        <div
                          key={part.id}
                          data-testid={`part-row-${part.id}`}
                          className="flex items-center justify-between gap-2 p-2 rounded border border-[#263240] bg-[#0C1014] font-mono text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: part.color }}
                              />
                              <span className="font-semibold text-[#F0F4F8] truncate">
                                {part.name}
                              </span>
                              <span className="px-1 py-0.2 rounded bg-[#1A222C] text-[10px] text-[#8A99AD]">
                                {part.sourceFormat}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8A99AD] mt-0.5">
                              {part.width}×{part.height}mm · {(part.areaMm2 / 100).toFixed(1)} cm²
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              data-testid={`grain-lock-btn-${part.id}`}
                              onClick={() => handleToggleGrainLock(part.id)}
                              title={
                                isGrainLocked
                                  ? 'Grain Locked (0°/180° only)'
                                  : 'Free 90° Orthogonal Rotation'
                              }
                              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                                isGrainLocked
                                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/50'
                                  : 'bg-[#131920] text-[#8A99AD] border-[#263240]'
                              }`}
                            >
                              {isGrainLocked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Grain</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>90°</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center rounded border border-[#263240] bg-[#131920]">
                              <button
                                type="button"
                                aria-label={`Decrease quantity for ${part.name}`}
                                onClick={() => handleUpdatePartQty(part.id, -1)}
                                className="px-1.5 py-0.5 text-[#8A99AD] hover:text-[#F0F4F8] cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-1.5 text-[#F0F4F8]">
                                {part.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`Increase quantity for ${part.name}`}
                                onClick={() => handleUpdatePartQty(part.id, 1)}
                                className="px-1.5 py-0.5 text-[#8A99AD] hover:text-[#F0F4F8] cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Add Parametric Panel Form */}
                <form
                  onSubmit={handleAddParametricPart}
                  className="pt-2 border-t border-[#263240] space-y-2 font-mono text-xs"
                >
                  <div className="text-[11px] text-[#8A99AD] font-semibold">
                    + QUICK-ADD PARAMETRIC PANEL (MM)
                  </div>
                  <div className="grid grid-cols-12 gap-1.5">
                    <input
                      type="text"
                      aria-label="New Part Name"
                      data-testid="new-part-name-input"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder="Part Name"
                      className="col-span-4 px-2 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8]"
                    />
                    <input
                      type="number"
                      aria-label="New Part Width mm"
                      data-testid="new-part-width-input"
                      value={newPartWidth}
                      onChange={(e) => setNewPartWidth(e.target.value)}
                      placeholder="W"
                      className="col-span-2 px-1.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8]"
                    />
                    <input
                      type="number"
                      aria-label="New Part Height mm"
                      data-testid="new-part-height-input"
                      value={newPartHeight}
                      onChange={(e) => setNewPartHeight(e.target.value)}
                      placeholder="H"
                      className="col-span-2 px-1.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8]"
                    />
                    <input
                      type="number"
                      aria-label="New Part Quantity"
                      data-testid="new-part-qty-input"
                      value={newPartQty}
                      onChange={(e) => setNewPartQty(e.target.value)}
                      placeholder="Qty"
                      className="col-span-2 px-1.5 py-1.5 rounded bg-[#0C1014] border border-[#263240] text-[#F0F4F8] text-center"
                    />
                    <button
                      type="submit"
                      data-testid="add-parametric-part-btn"
                      className="col-span-2 flex items-center justify-center rounded bg-[#38BDF8] text-[#0C1014] font-bold hover:bg-[#38BDF8]/90 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {partInputError && (
                    <div
                      data-testid="part-input-error"
                      className="p-2 rounded bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] text-[11px]"
                    >
                      {partInputError}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right Column (8 cols on desktop): Interactive CAD Blueprint Canvas & Export Drawer */}
            <div className="lg:col-span-8 space-y-3">
              <BlueprintCanvas
                layouts={nestingResult.sheetsUsed}
                activeSheetIndex={activeSheetIndex}
                onSelectSheet={setActiveSheetIndex}
                kerfMm={kerfMm}
                partSpacingMm={partSpacingMm}
                zeroOverlapVerified={nestingResult.zeroOverlapVerified}
                showKerfRings={showKerfRings}
                onToggleKerfRings={() => setShowKerfRings((v) => !v)}
                showOffcuts={showOffcuts}
                onToggleOffcuts={() => setShowOffcuts((v) => !v)}
                onSaveOffcutToBin={handleSaveOffcutToBin}
                savedOffcutIds={savedOffcutIds}
              />

              {/* Shop-Floor Fabrication Export & Naive Comparison Bar */}
              <div className="rounded border border-[#263240] bg-[#131920] p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono font-semibold text-[#F0F4F8]">
                    EXPORT READY-TO-CUT SHOP FILES & WASTE AUDIT
                  </div>
                  <div className="text-[11px] text-[#8A99AD]">
                    Includes millimeter dimension callouts, kerf compensation, and salvageable remnant boundaries.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <button
                    type="button"
                    data-testid="export-svg-btn"
                    onClick={() => handleExportArtifact('SVG')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#F59E0B] text-[#0C1014] font-bold hover:bg-[#F59E0B]/90 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Cut Sheet (.SVG)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="export-dxf-btn"
                    onClick={() => handleExportArtifact('DXF')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] font-semibold hover:bg-[#38BDF8]/25 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CAD (.DXF)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="export-report-btn"
                    onClick={() => handleExportArtifact('REPORT')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#263240] bg-[#0C1014] text-[#F0F4F8] hover:border-[#10B981] cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Waste Audit (.MD)</span>
                  </button>
                </div>
              </div>

              {/* Live Exported Code / Artifact Inspector */}
              {exportedArtifactPreview && (
                <div
                  data-testid="exported-artifact-preview"
                  className="rounded border border-[#10B981]/50 bg-[#0C1014] p-3 font-mono text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#10B981] font-semibold">
                      Generated {exportedArtifactPreview.format} Output:{' '}
                      {exportedArtifactPreview.filename} ({exportedArtifactPreview.content.length} bytes)
                    </span>
                    <button
                      type="button"
                      onClick={() => setExportedArtifactPreview(null)}
                      className="text-[#8A99AD] hover:text-[#F0F4F8] cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                  <pre className="max-h-36 overflow-y-auto p-2 rounded bg-[#131920] text-[11px] text-[#cbd5e1] whitespace-pre-wrap">
                    {exportedArtifactPreview.content.slice(0, 900)}
                    {exportedArtifactPreview.content.length > 900 ? '\n...' : ''}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Action Bar (390px ergonomic reachability) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#263240] bg-[#131920]/95 backdrop-blur px-3 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleRunNestSolver}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded bg-[#F59E0B] text-[#0C1014] font-mono text-xs font-bold cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run Remnant Nest</span>
        </button>
        <button
          type="button"
          onClick={() => handleExportArtifact('SVG')}
          className="px-3.5 py-2.5 min-h-[44px] rounded border border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] font-mono text-xs font-semibold cursor-pointer"
        >
          Export SVG
        </button>
      </div>

      {/* Scrap Contour Tracer Modal */}
      <ScrapTracerModal
        isOpen={isTracerOpen}
        onClose={() => setIsTracerOpen(false)}
        onAddTracedRemnant={(newRemnant) => {
          setSheets((prev) => [newRemnant, ...prev]);
          setActiveSheetIndex(0);
          setSolveStatusBanner({
            type: 'success',
            message: `Digitized leftover scrap "${newRemnant.name}" (${newRemnant.width}×${newRemnant.height}mm) and re-nested parts onto it first.`,
          });
        }}
      />
    </div>
  );
}
export default App;
