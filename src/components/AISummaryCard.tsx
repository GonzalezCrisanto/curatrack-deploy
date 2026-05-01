import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, FileText, Loader2, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AISummaryCardProps {
  summary: string | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
  onEmitOrder: () => void;
}

export default function AISummaryCard({ summary, loading, error, onRegenerate, onEmitOrder }: AISummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Resumen copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el resumen');
    }
  };

  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-background shadow-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="heading-display text-base font-bold flex items-center gap-2">
            <span className="text-lg">📋</span> Resumen generado por IA
          </h3>
          <span className="font-body text-[10px] uppercase tracking-wider text-primary/80 font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground font-body text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando resumen clínico...
          </div>
        )}

        {error && !loading && (
          <div className="space-y-2">
            <p className="font-body text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={onRegenerate} className="font-body h-9">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reintentar
            </Button>
          </div>
        )}

        {summary && !loading && (
          <>
            <div className="rounded-md bg-background/70 border border-border/40 p-3 space-y-1">
              <div className="prose prose-sm max-w-none font-body text-sm prose-headings:font-display prose-headings:text-primary prose-h3:text-sm prose-h3:font-bold prose-h2:text-base prose-h2:font-bold prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-foreground/90 prose-code:text-xs">
                <ReactMarkdown
                  // disallow raw HTML; only safe markdown nodes are rendered
                  skipHtml
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={copySummary}
                className="font-body h-11 border-primary/40"
              >
                {copied ? <Check className="mr-1.5 h-4 w-4 text-success" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar resumen'}
              </Button>
              <Button
                type="button"
                onClick={onEmitOrder}
                className="font-body h-11"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Generar orden profesional
              </Button>
            </div>
            <button
              type="button"
              onClick={onRegenerate}
              className="font-body text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Regenerar resumen
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
