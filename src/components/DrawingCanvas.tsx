import React, { useRef, useState, useEffect } from 'react';
import { Eraser, RotateCcw, PenTool, Check } from 'lucide-react';
import { playPop, playTap } from '../lib/sound.ts';

interface DrawingCanvasProps {
  onComplete: (dataUrl: string) => void;
  disabled?: boolean;
}

const COLORS = [
  { label: 'Black', value: '#1c1917' },
  { label: 'Stone', value: '#78716c' },
  { label: 'Warm Red', value: '#e11d48' },
  { label: 'Navy', value: '#2563eb' },
  { label: 'Forest', value: '#16a34a' }
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onComplete, disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const historyRef = useRef<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    saveState();
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? strokeWidth * 3 : strokeWidth;

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const handleClear = () => {
    playPop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    historyRef.current = [];
    saveState();
  };

  const handleUndo = () => {
    playTap();
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.pop(); // Remove current
    const previous = historyRef.current[historyRef.current.length - 1];
    if (previous) {
      ctx.putImageData(previous, 0, 0);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playPop();
    const dataUrl = canvas.toDataURL('image/png', 0.85);
    onComplete(dataUrl);
  };

  return (
    <div id="drawing-canvas-wrapper" className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.value}
              id={`color-pick-${c.label.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => {
                playTap();
                setColor(c.value);
                setIsEraser(false);
              }}
              aria-label={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                !isEraser && color === c.value
                  ? 'scale-110 ring-2 ring-stone-900 dark:ring-stone-100 border-white'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          <button
            id="canvas-pen-btn"
            type="button"
            onClick={() => {
              playTap();
              setIsEraser(false);
            }}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              !isEraser
                ? 'bg-stone-900 text-stone-50 border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
            }`}
            title="Pen"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>

          <button
            id="canvas-eraser-btn"
            type="button"
            onClick={() => {
              playTap();
              setIsEraser(true);
            }}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              isEraser
                ? 'bg-stone-900 text-stone-50 border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
            }`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            id="canvas-undo-btn"
            type="button"
            onClick={handleUndo}
            disabled={historyRef.current.length <= 1}
            className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-30"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            id="canvas-clear-btn"
            type="button"
            onClick={handleClear}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full h-64 sm:h-72 bg-white rounded-2xl border-2 border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm touch-none">
        <canvas
          ref={canvasRef}
          id="active-drawing-canvas"
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Done Button */}
      <button
        id="canvas-finish-drawing-btn"
        type="button"
        disabled={!hasDrawn || disabled}
        onClick={handleSave}
        className="w-full py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.98]"
      >
        <Check className="w-4 h-4" />
        Finish Drawing
      </button>
    </div>
  );
};
