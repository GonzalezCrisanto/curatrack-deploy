import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void;
  onClear?: () => void;
  confirmed?: boolean;
  confirmedDataUrl?: string;
  className?: string;
  label?: string;
}

export function SignaturePad({
  onConfirm,
  onClear,
  confirmed = false,
  confirmedDataUrl,
  className,
  label = 'Firma',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (confirmed) return;
    e.preventDefault();
    setDrawing(true);
    lastPoint.current = getPos(e);
  }, [confirmed, getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || confirmed) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPoint.current = pos;
    setHasStrokes(true);
  }, [drawing, confirmed, getPos]);

  const endDraw = useCallback(() => {
    setDrawing(false);
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
    setHasStrokes(false);
    onClear?.();
  }, [onClear]);

  const handleConfirm = useCallback(() => {
    if (!canvasRef.current || !hasStrokes) return;
    onConfirm(canvasRef.current.toDataURL('image/png'));
  }, [hasStrokes, onConfirm]);

  // Resize canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 600;
    canvas.height = 200;
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {confirmed && confirmedDataUrl ? (
        <div className="border border-success/40 rounded-md bg-success/5 p-2 flex items-center gap-3">
          <img src={confirmedDataUrl} alt="Firma" className="h-16 max-w-[200px] object-contain" />
          <span className="text-xs text-success font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Firma confirmada</span>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className="w-full h-[120px] border border-input rounded-md bg-background cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={!hasStrokes}>
              <Eraser className="h-4 w-4 mr-1" /> Limpiar firma
            </Button>
            <Button type="button" size="sm" onClick={handleConfirm} disabled={!hasStrokes}>
              <Check className="h-4 w-4 mr-1" /> Confirmar firma
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
