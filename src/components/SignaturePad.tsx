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

/** Crop the signature to its bounding box with padding, returning a trimmed data URL. */
function cropSignatureDataUrl(canvas: HTMLCanvasElement, padding = 16): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // No strokes found — return full canvas
  if (maxX < minX) return canvas.toDataURL('image/png');

  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width, maxX + padding + 1) - cropX;
  const cropH = Math.min(height, maxY + padding + 1) - cropY;

  const offscreen = document.createElement('canvas');
  offscreen.width = cropW;
  offscreen.height = cropH;
  const offCtx = offscreen.getContext('2d')!;
  offCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return offscreen.toDataURL('image/png');
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
  const canvasReady = useRef(false);

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
    const croppedDataUrl = cropSignatureDataUrl(canvasRef.current);
    onConfirm(croppedDataUrl);
  }, [hasStrokes, onConfirm]);

  // Initialize canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 600;
    canvas.height = 200;
    canvasReady.current = true;
  }, []);

  // Restore signature from confirmedDataUrl when canvas is shown (e.g. after page refresh
  // or when the parent re-mounts the component with a previously saved data URL but
  // confirmed=false — "Volver a dibujar" scenario).
  useEffect(() => {
    if (confirmed || !confirmedDataUrl || !canvasReady.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Center the restored signature on the canvas
      const scale = Math.min(
        (canvas.width - 32) / img.width,
        (canvas.height - 16) / img.height,
        1,
      );
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      setHasStrokes(true);
    };
    img.src = confirmedDataUrl;
    // Only run on mount / when confirmedDataUrl changes while not confirmed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, confirmedDataUrl]);

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {confirmed && confirmedDataUrl ? (
        <div className="border border-success/40 rounded-md bg-success/5 p-3 space-y-2">
          <div className="flex items-center gap-3">
            <img src={confirmedDataUrl} alt="Firma" className="h-16 max-w-[200px] object-contain" />
            <span className="text-xs text-success font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Firma confirmada</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Volver a dibujar
          </Button>
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
