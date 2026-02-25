"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Topbar from "@/components/Topbar";
import {
  Pencil, Square, Circle, Minus, ArrowRight, Type, Hand,
  Eraser, Trash2, Download, Undo, Redo, ZoomIn, ZoomOut,
  Users, Copy, Share2, Palette, ChevronDown, Diamond,
  Triangle, StickyNote, MousePointer2
} from "lucide-react";

// Rough/hand-drawn utility
function roughLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  roughness = 1.5
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(Math.floor(dist / 8), 1);
  ctx.beginPath();
  ctx.moveTo(x1 + (Math.random() - 0.5) * roughness, y1 + (Math.random() - 0.5) * roughness);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = x1 + dx * t + (Math.random() - 0.5) * roughness * 2;
    const ny = y1 + dy * t + (Math.random() - 0.5) * roughness * 2;
    ctx.lineTo(nx, ny);
  }
  ctx.stroke();
}

function roughRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  roughness = 1.5
) {
  roughLine(ctx, x, y, x + w, y, roughness);
  roughLine(ctx, x + w, y, x + w, y + h, roughness);
  roughLine(ctx, x + w, y + h, x, y + h, roughness);
  roughLine(ctx, x, y + h, x, y, roughness);
  // double stroke for hand-drawn feel
  roughLine(ctx, x, y, x + w, y, roughness * 0.5);
  roughLine(ctx, x, y + h, x + w, y + h, roughness * 0.5);
}

function roughEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  roughness = 1.5
) {
  const steps = 60;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * roughness * 2;
    const nx = cx + (rx + jitter) * Math.cos(angle);
    const ny = cy + (ry + jitter) * Math.sin(angle);
    if (i === 0) ctx.moveTo(nx, ny);
    else ctx.lineTo(nx, ny);
  }
  ctx.closePath();
  ctx.stroke();
}

function roughDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number,
  roughness = 1.5
) {
  const pts = [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ];
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 4];
    roughLine(ctx, x1, y1, x2, y2, roughness);
  }
}

function roughArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  roughness = 1.5
) {
  roughLine(ctx, x1, y1, x2, y2, roughness);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 16;
  roughLine(
    ctx,
    x2, y2,
    x2 - headLen * Math.cos(angle - 0.4),
            y2 - headLen * Math.sin(angle - 0.4),
            roughness * 0.7
  );
  roughLine(
    ctx,
    x2, y2,
    x2 - headLen * Math.cos(angle + 0.4),
            y2 - headLen * Math.sin(angle + 0.4),
            roughness * 0.7
  );
}

type Tool = "select" | "pan" | "pencil" | "rect" | "ellipse" | "diamond" | "line" | "arrow" | "text" | "eraser" | "sticky";

type ShapeType = "pencil" | "rect" | "ellipse" | "diamond" | "line" | "arrow" | "text" | "sticky";

interface Shape {
  id: string;
  type: ShapeType;
  x: number; y: number;
  x2?: number; y2?: number;
  points?: [number, number][];
  text?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
  fontSize?: number;
  selected?: boolean;
  seed: number;
}

const COLORS = [
  "#e6edf3", // white/primary
"#00f5a0", // accent green
"#1890ff", // blue
"#ff4d4f", // red
"#faad14", // yellow
"#722ed1", // purple
"#ff7a00", // orange
"#eb2f96", // pink
];

const STROKE_WIDTHS = [1, 2, 4, 8];
const FILLS = ["transparent", "rgba(0,245,160,0.08)", "rgba(24,144,255,0.08)", "rgba(255,77,79,0.08)", "rgba(250,173,20,0.08)"];

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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);

  const drawingRef = useRef(false);
  const currentShapeRef = useRef<Shape | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const textPosRef = useRef({ x: 0, y: 0 });
  const [editingText, setEditingText] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [textVal, setTextVal] = useState("");

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
                               y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Simulate hand-drawn font
    ctx.font = `${shape.fontSize || 18}px 'DM Mono', 'Caveat', cursive`;

    const roughness = 1.2 + (shape.seed % 10) * 0.08;

    if (shape.selected) {
      ctx.shadowColor = "rgba(0,245,160,0.5)";
      ctx.shadowBlur = 8;
    }

    if (shape.fill && shape.fill !== "transparent" && shape.type !== "pencil" && shape.type !== "line" && shape.type !== "arrow") {
      ctx.fillStyle = shape.fill;
    }

    switch (shape.type) {
      case "pencil":
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0][0], shape.points[0][1]);
          for (let i = 1; i < shape.points.length; i++) {
            const prev = shape.points[i - 1];
            const curr = shape.points[i];
            const mx = (prev[0] + curr[0]) / 2;
            const my = (prev[1] + curr[1]) / 2;
            ctx.quadraticCurveTo(prev[0], prev[1], mx, my);
          }
          ctx.stroke();
        }
        break;

      case "rect": {
        const x = Math.min(shape.x, shape.x2 ?? shape.x);
        const y = Math.min(shape.y, shape.y2 ?? shape.y);
        const w = Math.abs((shape.x2 ?? shape.x) - shape.x);
        const h = Math.abs((shape.y2 ?? shape.y) - shape.y);
        if (shape.fill !== "transparent") {
          ctx.fillRect(x, y, w, h);
        }
        roughRect(ctx, x, y, w, h, roughness);
        break;
      }

      case "ellipse": {
        const cx = (shape.x + (shape.x2 ?? shape.x)) / 2;
        const cy = (shape.y + (shape.y2 ?? shape.y)) / 2;
        const rx = Math.abs((shape.x2 ?? shape.x) - shape.x) / 2;
        const ry = Math.abs((shape.y2 ?? shape.y) - shape.y) / 2;
        if (shape.fill !== "transparent") {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        roughEllipse(ctx, cx, cy, rx, ry, roughness);
        break;
      }

      case "diamond": {
        const cx2 = (shape.x + (shape.x2 ?? shape.x)) / 2;
        const cy2 = (shape.y + (shape.y2 ?? shape.y)) / 2;
        const w2 = Math.abs((shape.x2 ?? shape.x) - shape.x);
        const h2 = Math.abs((shape.y2 ?? shape.y) - shape.y);
        if (shape.fill !== "transparent") {
          ctx.beginPath();
          ctx.moveTo(cx2, shape.y);
          ctx.lineTo(shape.x2 ?? shape.x, cy2);
          ctx.lineTo(cx2, shape.y2 ?? shape.y);
          ctx.lineTo(shape.x, cy2);
          ctx.closePath();
          ctx.fill();
        }
        roughDiamond(ctx, cx2, cy2, w2, h2, roughness);
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
          // Hand-drawn text with slight jitter
          shape.text.split("\n").forEach((line, i) => {
            ctx.fillText(line, shape.x + (Math.random() - 0.5) * 0.3, shape.y + i * (shape.fontSize || 18) * 1.4 + (Math.random() - 0.5) * 0.3);
          });
        }
        break;

      case "sticky": {
        const sw = 180;
        const sh = 140;
        const sColor = (shape.fill && shape.fill !== "transparent") ? shape.fill : "rgba(250,173,20,0.15)";
        ctx.fillStyle = sColor;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        // Slightly rotated sticky
        ctx.save();
        ctx.translate(shape.x + sw / 2, shape.y + sh / 2);
        ctx.rotate(((shape.seed % 5) - 2) * 0.015);
        ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        roughRect(ctx, -sw / 2, -sh / 2, sw, sh, roughness * 0.5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = shape.color;
        ctx.font = `14px 'DM Mono', monospace`;
        const lines = (shape.text || "Note...").split("\n");
        lines.forEach((line, li) => {
          ctx.fillText(line, -sw / 2 + 12, -sh / 2 + 28 + li * 20);
        });
        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.save();
    ctx.translate(pan.x % (20 * zoom), pan.y % (20 * zoom));
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    const gridSize = 20 * zoom;
    for (let x = -gridSize; x < canvas.width + gridSize; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = -gridSize; y < canvas.height + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    shapes.forEach(shape => drawShape(ctx, shape));
    if (currentShapeRef.current) drawShape(ctx, currentShapeRef.current);

    ctx.restore();
  }, [shapes, pan, zoom, drawShape]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  const pushHistory = useCallback((newShapes: Shape[]) => {
    setHistory(prev => {
      const newHist = prev.slice(0, histIdx + 1);
      newHist.push([...newShapes]);
      setHistIdx(newHist.length - 1);
      return newHist;
    });
  }, [histIdx]);

  const undo = useCallback(() => {
    if (histIdx > 0) {
      const newIdx = histIdx - 1;
      setHistIdx(newIdx);
      setShapes([...history[newIdx]]);
    }
  }, [histIdx, history]);

  const redo = useCallback(() => {
    if (histIdx < history.length - 1) {
      const newIdx = histIdx + 1;
      setHistIdx(newIdx);
      setShapes([...history[newIdx]]);
    }
  }, [histIdx, history]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pos = toCanvas(e.clientX, e.clientY);

    if (tool === "pan" || e.altKey) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (tool === "eraser") {
      // Remove shape at pos
      setShapes(prev => {
        const next = prev.filter(s => {
          const dx = (s.x2 ?? s.x) - s.x;
          const dy = (s.y2 ?? s.y) - s.y;
          const dist = Math.sqrt((pos.x - s.x) ** 2 + (pos.y - s.y) ** 2);
          return dist > 20;
        });
        pushHistory(next);
        return next;
      });
      return;
    }

    if (tool === "text" || tool === "sticky") {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      setTextPos({ x: screenX, y: screenY });
      textPosRef.current = pos;
      setTextVal("");
      setEditingText(true);
      return;
    }

    drawingRef.current = true;
    lastPosRef.current = pos;

    const newShape: Shape = {
      id: Math.random().toString(36).slice(2),
                                      type: tool as ShapeType,
                                      x: pos.x, y: pos.y,
                                      x2: pos.x, y2: pos.y,
                                      points: tool === "pencil" ? [[pos.x, pos.y]] : undefined,
                                      color,
                                      strokeWidth,
                                      fill,
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
    const shape = currentShapeRef.current;

    if (shape.type === "pencil") {
      shape.points = [...(shape.points || []), [pos.x, pos.y]];
    } else {
      shape.x2 = pos.x;
      shape.y2 = pos.y;
    }

    redraw();
  }, [toCanvas, redraw]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    if (!drawingRef.current || !currentShapeRef.current) return;
    drawingRef.current = false;

    const shape = currentShapeRef.current;
    currentShapeRef.current = null;

    setShapes(prev => {
      const next = [...prev, shape];
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(prev * factor, 0.2), 5));
  }, []);

  const commitText = useCallback(() => {
    if (!textVal.trim()) { setEditingText(false); return; }
    const pos = textPosRef.current;
    const newShape: Shape = {
      id: Math.random().toString(36).slice(2),
                                 type: tool === "sticky" ? "sticky" : "text",
                                 x: pos.x, y: pos.y,
                                 text: textVal,
                                 color,
                                 strokeWidth,
                                 fill,
                                 fontSize: 18,
                                 seed: Math.floor(Math.random() * 100),
    };
    setShapes(prev => {
      const next = [...prev, newShape];
      pushHistory(next);
      return next;
    });
    setEditingText(false);
    setTextVal("");
  }, [textVal, tool, color, strokeWidth, fill, pushHistory]);

  const clearAll = () => {
    setShapes([]);
    pushHistory([]);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const toolButtons: { id: Tool; icon: React.ComponentType<any>; label: string }[] = [
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
    { id: "eraser", icon: Eraser, label: "Eraser (X)" },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingText) return;
      const map: Record<string, Tool> = {
        v: "select", h: "pan", p: "pencil", l: "line",
        a: "arrow", r: "rect", e: "ellipse", d: "diamond",
        t: "text", x: "eraser",
      };
      if (map[e.key]) setTool(map[e.key] as Tool);
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === "y" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        setShapes(prev => { const next = prev.filter(s => !s.selected); pushHistory(next); return next; });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingText, undo, redo, pushHistory]);

  const cursorStyle = tool === "pan" ? "grab" : tool === "eraser" ? "crosshair" : tool === "text" ? "text" : "crosshair";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
    <Topbar
    title="Whiteboard"
    subtitle="Collaborative hand-drawn sketching"
    />

    <div className="flex flex-1 overflow-hidden relative">
    {/* Canvas */}
    <canvas
    ref={canvasRef}
    className="flex-1 w-full h-full"
    style={{
      background: "var(--bg)",
          cursor: cursorStyle,
          touchAction: "none",
    }}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
    onWheel={handleWheel}
    />

    {/* Text input overlay */}
    {editingText && (
      <div
      style={{
        position: "absolute",
        left: textPos.x,
        top: textPos.y,
        zIndex: 50,
      }}
      >
      <textarea
      autoFocus
      value={textVal}
      onChange={e => setTextVal(e.target.value)}
      onBlur={commitText}
      onKeyDown={e => {
        if (e.key === "Escape") { setEditingText(false); }
        if (e.key === "Enter" && !e.shiftKey && tool === "text") { e.preventDefault(); commitText(); }
      }}
      style={{
        background: "rgba(13,17,23,0.85)",
                     border: "2px dashed var(--accent)",
                     color: color,
                     fontFamily: "'DM Mono', monospace",
                     fontSize: "18px",
                     padding: "6px 10px",
                     borderRadius: "6px",
                     minWidth: "120px",
                     minHeight: tool === "sticky" ? "100px" : "36px",
                     outline: "none",
                     resize: "both",
                     lineHeight: 1.5,
      }}
      placeholder={tool === "sticky" ? "Write note..." : "Type text..."}
      />
      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "monospace" }}>
      {tool === "text" ? "Enter to confirm • Esc to cancel" : "Click away to confirm"}
      </div>
      </div>
    )}

    {/* Left: Tool palette */}
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
      onClick={() => setTool(id)}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "10px",
        border: tool === id ? "1.5px solid var(--accent-border)" : "1.5px solid transparent",
                                                     background: tool === id ? "var(--accent-dim)" : "transparent",
                                                     color: tool === id ? "var(--accent)" : "var(--text-secondary)",
                                                     cursor: "pointer",
                                                     transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (tool !== id) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { if (tool !== id) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
      <Icon size={16} />
      </button>
    ))}

    <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "4px 0" }} />

    {/* Undo / Redo */}
    <button
    title="Undo (Ctrl+Z)"
    onClick={undo}
    disabled={histIdx === 0}
    style={{
      width: 36, height: 36,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "10px", border: "1.5px solid transparent",
      background: "transparent",
      color: histIdx === 0 ? "var(--text-muted)" : "var(--text-secondary)",
          cursor: histIdx === 0 ? "not-allowed" : "pointer",
    }}
    >
    <Undo size={15} />
    </button>
    <button
    title="Redo (Ctrl+Shift+Z)"
    onClick={redo}
    disabled={histIdx >= history.length - 1}
    style={{
      width: 36, height: 36,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "10px", border: "1.5px solid transparent",
      background: "transparent",
      color: histIdx >= history.length - 1 ? "var(--text-muted)" : "var(--text-secondary)",
          cursor: histIdx >= history.length - 1 ? "not-allowed" : "pointer",
    }}
    >
    <Redo size={15} />
    </button>

    <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "4px 0" }} />

    {/* Clear */}
    <button
    title="Clear All"
    onClick={clearAll}
    style={{
      width: 36, height: 36,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "10px", border: "1.5px solid transparent",
      background: "transparent", color: "#ff4d4f", cursor: "pointer",
    }}
    >
    <Trash2 size={15} />
    </button>

    {/* Download */}
    <button
    title="Download PNG"
    onClick={downloadCanvas}
    style={{
      width: 36, height: 36,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "10px", border: "1.5px solid transparent",
      background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
    }}
    >
    <Download size={15} />
    </button>
    </div>

    {/* Top-right: Properties panel */}
    <div
    className="absolute right-4 top-4 flex flex-col gap-3 p-3 rounded-2xl"
    style={{
      background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          zIndex: 40,
          minWidth: 180,
    }}
    >
    {/* Stroke Color */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stroke</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
    {COLORS.map(c => (
      <button
      key={c}
      onClick={() => setColor(c)}
      style={{
        width: 20, height: 20,
        borderRadius: "50%",
        background: c,
        border: color === c ? "2px solid white" : "2px solid transparent",
        cursor: "pointer",
        boxShadow: color === c ? `0 0 8px ${c}` : "none",
        transition: "all 0.15s",
      }}
      />
    ))}
    </div>
    </div>

    {/* Fill Color */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fill</p>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
    {FILLS.map((f, i) => (
      <button
      key={i}
      onClick={() => setFill(f)}
      title={i === 0 ? "None" : "Fill " + i}
      style={{
        width: 20, height: 20,
        borderRadius: 4,
        background: f === "transparent" ? "transparent" : f,
        border: fill === f ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
      }}
      >
      {f === "transparent" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(45deg, #333 0px, #333 2px, transparent 2px, transparent 8px)",
        }} />
      )}
      </button>
    ))}
    </div>
    </div>

    {/* Stroke Width */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Width</p>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
    {STROKE_WIDTHS.map(w => (
      <button
      key={w}
      onClick={() => setStrokeWidth(w)}
      style={{
        width: 28, height: 28,
        borderRadius: 6,
        border: strokeWidth === w ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                             background: strokeWidth === w ? "var(--accent-dim)" : "transparent",
                             display: "flex", alignItems: "center", justifyContent: "center",
                             cursor: "pointer",
      }}
      >
      <div style={{
        width: 14, height: w,
        background: strokeWidth === w ? "var(--accent)" : "var(--text-muted)",
                             borderRadius: 99,
      }} />
      </button>
    ))}
    </div>
    </div>

    {/* Zoom */}
    <div>
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Zoom</p>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <button
    onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))}
    style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
    ><ZoomOut size={12} /></button>
    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", minWidth: 40, textAlign: "center" }}>
    {Math.round(zoom * 100)}%
    </span>
    <button
    onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
    style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
    ><ZoomIn size={12} /></button>
    <button
    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
    style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }}
    >Reset</button>
    </div>
    </div>

    {/* Shapes count */}
    <div style={{
      padding: "6px 8px",
      borderRadius: 8,
      background: "var(--surface-2)",
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "monospace",
          display: "flex",
          justifyContent: "space-between",
    }}>
    <span>Shapes</span>
    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{shapes.length}</span>
    </div>
    </div>

    {/* Bottom center: active tool indicator */}
    <div
    className="absolute bottom-4 left-1/2 -translate-x-1/2"
    style={{
      background: "var(--surface)",
          border: "1px solid var(--accent-border)",
          borderRadius: 99,
          padding: "6px 16px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "var(--accent)",
          zIndex: 40,
          boxShadow: "0 0 20px rgba(0,245,160,0.1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
    }}
    >
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
    {toolButtons.find(t => t.id === tool)?.label?.split(" (")[0] || tool}
    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>• Scroll to zoom • Alt+drag to pan</span>
    </div>

    {/* Online indicator (decorative) */}
    <div
    className="absolute top-4 left-4 flex items-center gap-2"
    style={{
      background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 99,
          padding: "5px 12px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "var(--text-secondary)",
          zIndex: 40,
    }}
    >
    <Users size={12} style={{ color: "var(--accent)" }} />
    <span>You</span>
    <span style={{ color: "var(--text-muted)" }}>• 1 active</span>
    </div>
    </div>
    </div>
  );
}
