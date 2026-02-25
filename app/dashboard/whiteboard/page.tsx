"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Topbar from "@/components/Topbar";
import {
  Pencil, Square, Circle, Minus, ArrowRight, Type, Hand,
  Eraser, Trash2, Download, Undo, Redo, ZoomIn, ZoomOut,
  Users, Diamond, StickyNote, MousePointer2, ImagePlus,
  Save, FolderOpen, CheckCircle2,
} from "lucide-react";

// ─── Rough drawing helpers ────────────────────────────────────────────────────
function roughLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, r = 1.5) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(Math.floor(dist / 8), 1);
  ctx.beginPath();
  ctx.moveTo(x1 + (Math.random() - 0.5) * r, y1 + (Math.random() - 0.5) * r);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(x1 + dx * t + (Math.random() - 0.5) * r * 2, y1 + dy * t + (Math.random() - 0.5) * r * 2);
  }
  ctx.stroke();
}

function roughRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 1.5) {
  roughLine(ctx, x, y, x + w, y, r);
  roughLine(ctx, x + w, y, x + w, y + h, r);
  roughLine(ctx, x + w, y + h, x, y + h, r);
  roughLine(ctx, x, y + h, x, y, r);
  roughLine(ctx, x, y, x + w, y, r * 0.5);
  roughLine(ctx, x, y + h, x + w, y + h, r * 0.5);
}

function roughEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, r = 1.5) {
  const steps = 64;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const j = (Math.random() - 0.5) * r * 2;
    const nx = cx + (rx + j) * Math.cos(a);
    const ny = cy + (ry + j) * Math.sin(a);
    i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny);
  }
  ctx.closePath();
  ctx.stroke();
}

function roughDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r = 1.5) {
  const pts: [number, number][] = [[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]];
  for (let i = 0; i < 4; i++) roughLine(ctx, pts[i][0], pts[i][1], pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], r);
}

function roughArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, r = 1.5) {
  roughLine(ctx, x1, y1, x2, y2, r);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hl = 16;
  roughLine(ctx, x2, y2, x2 - hl * Math.cos(angle - 0.4), y2 - hl * Math.sin(angle - 0.4), r * 0.7);
  roughLine(ctx, x2, y2, x2 - hl * Math.cos(angle + 0.4), y2 - hl * Math.sin(angle + 0.4), r * 0.7);
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Tool = "select" | "pan" | "pencil" | "rect" | "ellipse" | "diamond" | "line" | "arrow" | "text" | "eraser" | "sticky" | "image";
type ShapeType = "pencil" | "rect" | "ellipse" | "diamond" | "line" | "arrow" | "text" | "sticky" | "image";

interface Shape {
  id: string;
  type: ShapeType;
  x: number; y: number;
  x2?: number; y2?: number;
  points?: [number, number][];
  text?: string;
  imageDataUrl?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
  fontSize?: number;
  seed: number;
}

// Image cache — prevents creating new Image() on every redraw frame
const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) return imageCache.get(src)!;
  const img = new Image();
  img.onload = () => imageCache.set(src, img);
  img.src = src;
  return null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = ["#e6edf3", "#00f5a0", "#1890ff", "#ff4d4f", "#faad14", "#722ed1", "#ff7a00", "#eb2f96"];
const STROKE_WIDTHS = [1, 2, 4, 8];
const FILLS = ["transparent", "rgba(0,245,160,0.08)", "rgba(24,144,255,0.08)", "rgba(255,77,79,0.08)", "rgba(250,173,20,0.08)"];
const STORAGE_KEY = "rvd_whiteboard_v1";

// ─── Component ────────────────────────────────────────────────────────────────
export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#e6edf3");
  const [fill, setFill] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [histIdx, setHistIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  // Text editing
  const [textActive, setTextActive] = useState(false);
  const [textScreenPos, setTextScreenPos] = useState({ x: 0, y: 0 });
  const [textCanvasPos, setTextCanvasPos] = useState({ x: 0, y: 0 });
  const [textVal, setTextVal] = useState("");
  const [textTool, setTextTool] = useState<"text" | "sticky">("text");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drawing refs
  const drawingRef = useRef(false);
  const currentShapeRef = useRef<Shape | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePosRef = useRef({ x: 0, y: 0 });

  // Sync history refs to avoid stale closures
  const histIdxRef = useRef(0);
  const historyRef = useRef<Shape[][]>([[]]);

  // Focus textarea when text editing activates
  useEffect(() => {
    if (textActive) {
      // Small delay to ensure the textarea is mounted
      const t = setTimeout(() => textareaRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [textActive]);

  // ── Coordinate conversion ──────────────────────────────────────────────────
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
                               y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Draw one shape ─────────────────────────────────────────────────────────
  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const roughness = 1.2 + (shape.seed % 10) * 0.08;

    switch (shape.type) {
      case "pencil":
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0][0], shape.points[0][1]);
          for (let i = 1; i < shape.points.length; i++) {
            const prev = shape.points[i - 1];
            const curr = shape.points[i];
            ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2);
          }
          ctx.stroke();
        }
        break;

      case "rect": {
        const rx = Math.min(shape.x, shape.x2 ?? shape.x);
        const ry = Math.min(shape.y, shape.y2 ?? shape.y);
        const rw = Math.abs((shape.x2 ?? shape.x) - shape.x);
        const rh = Math.abs((shape.y2 ?? shape.y) - shape.y);
        if (shape.fill && shape.fill !== "transparent") { ctx.fillStyle = shape.fill; ctx.fillRect(rx, ry, rw, rh); }
        roughRect(ctx, rx, ry, rw, rh, roughness);
        break;
      }

      case "ellipse": {
        const ecx = (shape.x + (shape.x2 ?? shape.x)) / 2;
        const ecy = (shape.y + (shape.y2 ?? shape.y)) / 2;
        const erx = Math.abs((shape.x2 ?? shape.x) - shape.x) / 2;
        const ery = Math.abs((shape.y2 ?? shape.y) - shape.y) / 2;
        if (shape.fill && shape.fill !== "transparent") {
          ctx.fillStyle = shape.fill;
          ctx.beginPath(); ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI * 2); ctx.fill();
        }
        roughEllipse(ctx, ecx, ecy, erx, ery, roughness);
        break;
      }

      case "diamond": {
        const dcx = (shape.x + (shape.x2 ?? shape.x)) / 2;
        const dcy = (shape.y + (shape.y2 ?? shape.y)) / 2;
        const dw = Math.abs((shape.x2 ?? shape.x) - shape.x);
        const dh = Math.abs((shape.y2 ?? shape.y) - shape.y);
        if (shape.fill && shape.fill !== "transparent") {
          ctx.fillStyle = shape.fill;
          ctx.beginPath();
          ctx.moveTo(dcx, shape.y); ctx.lineTo(shape.x2 ?? shape.x, dcy);
          ctx.lineTo(dcx, shape.y2 ?? shape.y); ctx.lineTo(shape.x, dcy);
          ctx.closePath(); ctx.fill();
        }
        roughDiamond(ctx, dcx, dcy, dw, dh, roughness);
        break;
      }

      case "line":
        roughLine(ctx, shape.x, shape.y, shape.x2 ?? shape.x, shape.y2 ?? shape.y, roughness);
        break;

      case "arrow":
        roughArrow(ctx, shape.x, shape.y, shape.x2 ?? shape.x, shape.y2 ?? shape.y, roughness);
        break;

      case "text":
        if (shape.text) {
          ctx.fillStyle = shape.color;
          ctx.font = `${shape.fontSize || 18}px 'DM Mono', monospace`;
          ctx.textBaseline = "top";
          shape.text.split("\n").forEach((line, i) => {
            ctx.fillText(line, shape.x, shape.y + i * (shape.fontSize || 18) * 1.5);
          });
        }
        break;

      case "sticky": {
        const sw = 200, sh = 150;
        ctx.save();
        ctx.translate(shape.x + sw / 2, shape.y + sh / 2);
        ctx.rotate(((shape.seed % 5) - 2) * 0.015);
        ctx.fillStyle = (shape.fill && shape.fill !== "transparent") ? shape.fill : "rgba(250,173,20,0.18)";
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
        ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        ctx.shadowBlur = 0;
        roughRect(ctx, -sw / 2, -sh / 2, sw, sh, roughness * 0.5);
        ctx.fillStyle = shape.color;
        ctx.font = `14px 'DM Mono', monospace`;
        ctx.textBaseline = "top";
        (shape.text || "Note...").split("\n").forEach((line, li) => {
          ctx.fillText(line, -sw / 2 + 12, -sh / 2 + 16 + li * 20);
        });
        ctx.restore();
        break;
      }

      case "image": {
        if (shape.imageDataUrl) {
          const img = getCachedImage(shape.imageDataUrl);
          if (img && img.complete && img.naturalWidth > 0) {
            const iw = Math.abs((shape.x2 ?? shape.x) - shape.x) || img.naturalWidth;
            const ih = Math.abs((shape.y2 ?? shape.y) - shape.y) || img.naturalHeight;
            const ix = Math.min(shape.x, shape.x2 ?? shape.x);
            const iy = Math.min(shape.y, shape.y2 ?? shape.y);
            ctx.drawImage(img, ix, iy, iw, ih);
            roughRect(ctx, ix, iy, iw, ih, roughness * 0.6);
          }
        }
        break;
      }
    }
    ctx.restore();
  }, []);

  // ── Redraw full canvas ─────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid background
    ctx.save();
    const gs = 20 * zoom;
    const ox = ((pan.x % gs) + gs) % gs;
    const oy = ((pan.y % gs) + gs) % gs;
    ctx.translate(ox, oy);
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    for (let x = -gs; x < canvas.width + gs; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = -gs; y < canvas.height + gs; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    ctx.restore();

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    shapes.forEach(s => drawShape(ctx, s));
    if (currentShapeRef.current) drawShape(ctx, currentShapeRef.current);
    ctx.restore();
  }, [shapes, pan, zoom, drawShape]);

  useEffect(() => { redraw(); }, [redraw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; redraw(); };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  // ── History management ─────────────────────────────────────────────────────
  const pushHistory = useCallback((next: Shape[]) => {
    const newHist = historyRef.current.slice(0, histIdxRef.current + 1);
    newHist.push([...next]);
    historyRef.current = newHist;
    histIdxRef.current = newHist.length - 1;
    setHistory([...newHist]);
    setHistIdx(histIdxRef.current);
  }, []);

  const undo = useCallback(() => {
    if (histIdxRef.current > 0) {
      histIdxRef.current--;
      setHistIdx(histIdxRef.current);
      setShapes([...historyRef.current[histIdxRef.current]]);
    }
  }, []);

  const redo = useCallback(() => {
    if (histIdxRef.current < historyRef.current.length - 1) {
      histIdxRef.current++;
      setHistIdx(histIdxRef.current);
      setShapes([...historyRef.current[histIdxRef.current]]);
    }
  }, []);

  // ── Text commit ────────────────────────────────────────────────────────────
  const commitText = useCallback(() => {
    setTextActive(false);
    const val = textVal.trim();
    if (!val) { setTextVal(""); return; }
    const newShape: Shape = {
      id: Math.random().toString(36).slice(2),
                                 type: textTool === "sticky" ? "sticky" : "text",
                                 x: textCanvasPos.x,
                                 y: textCanvasPos.y,
                                 text: val,
                                 color,
                                 strokeWidth,
                                 fill,
                                 fontSize: 18,
                                 seed: Math.floor(Math.random() * 100),
    };
    setShapes(prev => { const next = [...prev, newShape]; pushHistory(next); return next; });
    setTextVal("");
  }, [textVal, textTool, textCanvasPos, color, strokeWidth, fill, pushHistory]);

  // ── Image insert ───────────────────────────────────────────────────────────
  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        imageCache.set(dataUrl, img);
        const maxW = 400, maxH = 300;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        const pos = pendingImagePosRef.current;
        const newShape: Shape = {
          id: Math.random().toString(36).slice(2),
                                            type: "image",
                                            x: pos.x, y: pos.y,
                                            x2: pos.x + w, y2: pos.y + h,
                                            imageDataUrl: dataUrl,
                                            color: "#e6edf3",
                                            strokeWidth: 1,
                                            fill: "transparent",
                                            seed: Math.floor(Math.random() * 100),
        };
        setShapes(prev => { const next = [...prev, newShape]; pushHistory(next); return next; });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [pushHistory]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pos = toCanvas(e.clientX, e.clientY);

    if (tool === "pan" || e.altKey) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (tool === "eraser") {
      setShapes(prev => {
        const next = prev.filter(s => Math.sqrt((pos.x - s.x) ** 2 + (pos.y - s.y) ** 2) > 24);
        pushHistory(next);
        return next;
      });
      return;
    }

    if (tool === "text" || tool === "sticky") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setTextScreenPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTextCanvasPos(pos);
      setTextTool(tool as "text" | "sticky");
      setTextVal("");
      setTextActive(true);
      return;
    }

    if (tool === "image") {
      pendingImagePosRef.current = pos;
      imageInputRef.current?.click();
      return;
    }

    drawingRef.current = true;
    const newShape: Shape = {
      id: Math.random().toString(36).slice(2),
                                      type: tool as ShapeType,
                                      x: pos.x, y: pos.y,
                                      x2: pos.x, y2: pos.y,
                                      points: tool === "pencil" ? [[pos.x, pos.y]] : undefined,
                                      color, strokeWidth, fill,
                                      fontSize: 18,
                                      seed: Math.floor(Math.random() * 100),
    };
    currentShapeRef.current = newShape;
  }, [tool, toCanvas, pan, color, strokeWidth, fill, pushHistory]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
      return;
    }
    if (!drawingRef.current || !currentShapeRef.current) return;
    const pos = toCanvas(e.clientX, e.clientY);
    const s = currentShapeRef.current;
    if (s.type === "pencil") s.points = [...(s.points || []), [pos.x, pos.y]];
    else { s.x2 = pos.x; s.y2 = pos.y; }
    redraw();
  }, [toCanvas, redraw]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    if (!drawingRef.current || !currentShapeRef.current) return;
    drawingRef.current = false;
    const shape = currentShapeRef.current;
    currentShapeRef.current = null;
    setShapes(prev => { const next = [...prev, shape]; pushHistory(next); return next; });
  }, [pushHistory]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.min(Math.max(prev * (e.deltaY < 0 ? 1.1 : 0.9), 0.2), 5));
  }, []);

  // ── Save / Load ────────────────────────────────────────────────────────────
  const saveBoard = useCallback(() => {
    try {
      // Don't store imageDataUrl in localStorage if too large — store everything else
      const shapesToSave = shapes.map(s => ({ ...s }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shapes: shapesToSave, pan, zoom }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      console.error("Save failed", err);
    }
  }, [shapes, pan, zoom]);

  const loadBoard = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.shapes)) {
        // Re-cache images
        data.shapes.forEach((s: Shape) => {
          if (s.imageDataUrl && !imageCache.has(s.imageDataUrl)) {
            const img = new Image();
            img.onload = () => imageCache.set(s.imageDataUrl!, img);
            img.src = s.imageDataUrl;
          }
        });
        setShapes(data.shapes);
        pushHistory(data.shapes);
      }
      if (data.pan) setPan(data.pan);
      if (typeof data.zoom === "number") setZoom(data.zoom);
    } catch (err) {
      console.error("Load failed", err);
    }
  }, [pushHistory]);

  // Auto-load on mount
  useEffect(() => { loadBoard(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const clearAll = useCallback(() => { setShapes([]); pushHistory([]); }, [pushHistory]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (textActive) return;
      const map: Record<string, Tool> = {
        v: "select", h: "pan", p: "pencil", l: "line",
        a: "arrow", r: "rect", e: "ellipse", d: "diamond",
        t: "text", x: "eraser", i: "image",
      };
      if (!e.ctrlKey && !e.metaKey && map[e.key]) setTool(map[e.key] as Tool);
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveBoard(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [textActive, undo, redo, saveBoard]);

  // ── Tool buttons ───────────────────────────────────────────────────────────
  const toolButtons: { id: Tool; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select (V)" },
    { id: "pan", icon: Hand, label: "Pan (H)" },
    { id: "pencil", icon: Pencil, label: "Draw (P)" },
    { id: "line", icon: Minus, label: "Line (L)" },
    { id: "arrow", icon: ArrowRight, label: "Arrow (A)" },
    { id: "rect", icon: Square, label: "Rectangle (R)" },
    { id: "ellipse", icon: Circle, label: "Ellipse (E)" },
    { id: "diamond", icon: Diamond, label: "Diamond (D)" },
    { id: "text", icon: Type, label: "Text (T)" },
    { id: "sticky", icon: StickyNote, label: "Sticky Note" },
    { id: "image", icon: ImagePlus, label: "Image (I)" },
    { id: "eraser", icon: Eraser, label: "Eraser (X)" },
  ];

  const cursor =
  tool === "pan" ? "grab" :
  tool === "eraser" ? "cell" :
  tool === "text" || tool === "sticky" ? "text" :
  tool === "image" ? "copy" : "crosshair";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
    <Topbar title="Whiteboard" subtitle="Collaborative hand-drawn sketching" />

    {/* Hidden image file input */}
    <input
    ref={imageInputRef}
    type="file"
    accept="image/*"
    style={{ display: "none" }}
    onChange={handleImageFileChange}
    />

    <div className="flex flex-1 overflow-hidden relative">
    {/* Canvas */}
    <canvas
    ref={canvasRef}
    className="flex-1 w-full h-full"
    style={{ background: "var(--bg)", cursor, touchAction: "none" }}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
    onWheel={handleWheel}
    />

    {/* ── Text / Sticky textarea overlay ── */}
    {textActive && (
      <div
      style={{
        position: "absolute",
        left: textScreenPos.x,
        top: textScreenPos.y,
        zIndex: 60,
        pointerEvents: "auto",
      }}
      >
      <textarea
      ref={textareaRef}
      value={textVal}
      onChange={e => setTextVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Escape") { setTextActive(false); setTextVal(""); }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitText(); }
        if (e.key === "Enter" && !e.shiftKey && textTool === "text") { e.preventDefault(); commitText(); }
      }}
      style={{
        background: textTool === "sticky" ? "rgba(250,173,20,0.18)" : "rgba(13,17,23,0.92)",
                    border: "2px dashed var(--accent)",
                    color: color,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: textTool === "sticky" ? "14px" : "18px",
                    padding: "8px 12px",
                    borderRadius: textTool === "sticky" ? "4px" : "6px",
                    minWidth: textTool === "sticky" ? "200px" : "140px",
                    minHeight: textTool === "sticky" ? "150px" : "44px",
                    outline: "none",
                    resize: "both",
                    lineHeight: 1.5,
                    display: "block",
      }}
      placeholder={textTool === "sticky" ? "Write note..." : "Type text..."}
      />
      <div style={{
        fontSize: "10px", color: "var(--text-muted)", marginTop: "4px",
                    fontFamily: "monospace", userSelect: "none",
                    background: "rgba(13,17,23,0.85)", padding: "2px 8px", borderRadius: 4,
      }}>
      {textTool === "text"
        ? "Enter = confirm • Shift+Enter = new line • Esc = cancel"
        : "Ctrl+Enter = confirm • Shift+Enter = new line • Esc = cancel"}
        </div>
        <button
        onClick={commitText}
        style={{
          marginTop: 6, padding: "5px 16px", borderRadius: 6,
          background: "var(--accent)", color: "black",
                    fontSize: 12, fontFamily: "monospace", fontWeight: 700,
                    border: "none", cursor: "pointer", display: "block",
        }}
        >
        ✓ Insert
        </button>
        </div>
    )}

    {/* ── Left: Tool palette ── */}
    <div
    className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 rounded-2xl"
    style={{
      background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          zIndex: 40,
    }}
    >
    {toolButtons.map(({ id, icon: Icon, label }) => (
      <button
      key={id}
      title={label}
      onClick={() => { setTool(id); if (textActive) { setTextActive(false); setTextVal(""); } }}
      style={{
        width: 36, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "10px",
        border: tool === id ? "1.5px solid var(--accent-border)" : "1.5px solid transparent",
                                                     background: tool === id ? "var(--accent-dim)" : "transparent",
                                                     color: tool === id ? "var(--accent)" : "var(--text-secondary)",
                                                     cursor: "pointer", transition: "all 0.15s",
      }}
      >
      <Icon size={16} />
      </button>
    ))}

    <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "4px 0" }} />

    <button title="Undo (Ctrl+Z)" onClick={undo} disabled={histIdx === 0}
    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1.5px solid transparent", background: "transparent", color: histIdx === 0 ? "var(--text-muted)" : "var(--text-secondary)", cursor: histIdx === 0 ? "not-allowed" : "pointer" }}
    ><Undo size={15} /></button>

    <button title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={histIdx >= history.length - 1}
    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1.5px solid transparent", background: "transparent", color: histIdx >= history.length - 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: histIdx >= history.length - 1 ? "not-allowed" : "pointer" }}
    ><Redo size={15} /></button>

    <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "4px 0" }} />

    <button title="Save to browser (Ctrl+S)" onClick={saveBoard}
    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1.5px solid transparent", background: saveStatus === "saved" ? "var(--accent-dim)" : "transparent", color: saveStatus === "saved" ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", transition: "all 0.3s" }}
    >{saveStatus === "saved" ? <CheckCircle2 size={15} /> : <Save size={15} />}</button>

    <button title="Load saved board" onClick={loadBoard}
    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1.5px solid transparent", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
    ><FolderOpen size={15} /></button>

    <button title="Export as PNG" onClick={exportPNG}
    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1.5px solid transparent", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
    ><Download size={15} /></button>

    <button title="Clear All" onClick={clearAll}
    style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1.5px solid transparent", background: "transparent", color: "#ff4d4f", cursor: "pointer" }}
    ><Trash2 size={15} /></button>
    </div>

    {/* ── Right: Properties panel ── */}
    <div
    className="absolute right-4 top-4 flex flex-col gap-3 p-3 rounded-2xl"
    style={{
      background: "var(--surface)", border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)", zIndex: 40, minWidth: 186,
    }}
    >
    {/* Stroke color */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stroke</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
    {COLORS.map(c => (
      <button key={c} onClick={() => setColor(c)} style={{
        width: 20, height: 20, borderRadius: "50%", background: c,
        border: color === c ? "2px solid white" : "2px solid transparent",
        cursor: "pointer", boxShadow: color === c ? `0 0 8px ${c}` : "none", transition: "all 0.15s",
      }} />
    ))}
    </div>
    </div>

    {/* Fill */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fill</p>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
    {FILLS.map((f, i) => (
      <button key={i} onClick={() => setFill(f)} title={i === 0 ? "None" : "Fill"} style={{
        width: 20, height: 20, borderRadius: 4,
        background: f === "transparent" ? "transparent" : f,
        border: fill === f ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                          cursor: "pointer", position: "relative", overflow: "hidden",
      }}>
      {f === "transparent" && (
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, #333 0px, #333 2px, transparent 2px, transparent 8px)" }} />
      )}
      </button>
    ))}
    </div>
    </div>

    {/* Stroke width */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Width</p>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
    {STROKE_WIDTHS.map(w => (
      <button key={w} onClick={() => setStrokeWidth(w)} style={{
        width: 28, height: 28, borderRadius: 6,
        border: strokeWidth === w ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                             background: strokeWidth === w ? "var(--accent-dim)" : "transparent",
                             display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}>
      <div style={{ width: 14, height: w, background: strokeWidth === w ? "var(--accent)" : "var(--text-muted)", borderRadius: 99 }} />
      </button>
    ))}
    </div>
    </div>

    {/* Zoom */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Zoom</p>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ZoomOut size={12} /></button>
    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
    <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ZoomIn size={12} /></button>
    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }}>Reset</button>
    </div>
    </div>

    {/* Object count */}
    <div style={{ padding: "6px 8px", borderRadius: 8, background: "var(--surface-2)", fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", display: "flex", justifyContent: "space-between" }}>
    <span>Objects</span>
    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{shapes.length}</span>
    </div>
    </div>

    {/* ── Bottom status bar ── */}
    <div
    className="absolute bottom-4 left-1/2 -translate-x-1/2"
    style={{
      background: "var(--surface)", border: "1px solid var(--accent-border)",
          borderRadius: 99, padding: "6px 16px",
          fontSize: 11, fontFamily: "monospace", color: "var(--accent)",
          zIndex: 40, boxShadow: "0 0 20px rgba(0,245,160,0.1)",
          display: "flex", alignItems: "center", gap: 8,
    }}
    >
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
    {toolButtons.find(t => t.id === tool)?.label?.split(" (")[0] || tool}
    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>• Scroll to zoom • Alt+drag to pan • Ctrl+S to save</span>
    </div>

    {/* ── Top-left status badge ── */}
    <div
    className="absolute top-4 left-20 flex items-center gap-2"
    style={{
      background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 99, padding: "5px 12px",
          fontSize: 11, fontFamily: "monospace", color: "var(--text-secondary)", zIndex: 40,
    }}
    >
    <Users size={12} style={{ color: "var(--accent)" }} />
    <span>You • 1 active</span>
    {saveStatus === "saved" && (
      <span style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
      <CheckCircle2 size={11} /> Saved
      </span>
    )}
    </div>
    </div>
    </div>
  );
}
