import { useMemo, useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { getPatientIndicator, indicatorMeta } from '@/lib/patientStatus';

type Msg = { role: 'user' | 'assistant'; content: string };

const PRESET_QUESTIONS = [
  '¿Qué pacientes tengo que controlar hoy?',
  '¿Cómo organizo mi agenda de la semana?',
  'Priorizame los pacientes según gravedad',
  '¿Qué insumos debería tener preparados para mañana?',
  'Sugerime una frecuencia de curación para una úlcera por presión grado III',
  '¿Qué signos de infección tengo que vigilar?',
  '¿Cómo manejo un pie diabético con exudado abundante?',
  'Resumime el estado general de mis pacientes',
];

export default function Assistant() {
  const { patients } = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a compact context summary for the AI
  const context = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      fecha_actual: today,
      total_pacientes: patients.length,
      pacientes: patients.map(p => {
        const status = indicatorMeta[getPatientIndicator(p)].label;
        const upcoming = p.cases.flatMap(c =>
          c.evolutions
            .filter(e => e.nextControl)
            .map(e => ({ caso: c.woundType, proximo_control: e.nextControl, hora: e.time }))
        );
        return {
          nombre: `${p.lastName}, ${p.firstName}`,
          edad: p.age,
          diagnostico: p.diagnosis,
          estado: status,
          heridas: p.cases.map(c => ({
            tipo: c.woundType,
            ubicacion: c.anatomicalLocation,
            estado: c.status,
            ultima_evolucion: c.evolutions[0]
              ? {
                  fecha: c.evolutions[0].date,
                  estado: c.evolutions[0].evolutionStatus,
                  dolor: c.evolutions[0].painLevel,
                  signos_infeccion: c.evolutions[0].hasInfectionSigns,
                }
              : null,
          })),
          proximos_controles: upcoming.slice(0, 3),
        };
      }),
    };
  }, [patients]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nurse-assistant`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
        }),
      });

      if (resp.status === 429) {
        toast.error('Límite de solicitudes alcanzado. Intentá de nuevo en unos minutos.');
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error('Créditos de IA agotados. Recargá tu workspace.');
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error('No se pudo conectar con el asistente.');
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al comunicarse con el asistente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    send(text);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="heading-display text-3xl text-foreground flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />
            Asistente IA
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Tu copiloto clínico para organizar turnos, heridas y pacientes.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Chat */}
          <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
            <CardHeader className="border-b">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Conversación
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12 px-4">
                      <Sparkles className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                      <p className="font-body text-muted-foreground text-sm">
                        Hola, soy tu asistente clínico. Hacé una pregunta o elegí una sugerida →
                      </p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {m.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert font-body text-sm">
                            <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="font-body text-sm whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="font-body text-sm text-muted-foreground">Pensando...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t p-3 flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribí tu pregunta..."
                  className="font-body text-sm min-h-[44px] max-h-32 resize-none"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preset questions */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="font-display text-base">Preguntas sugeridas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => !isLoading && send(q)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-md border border-border hover:bg-accent hover:border-primary/40 transition-colors font-body text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
              <div className="pt-3 border-t mt-3">
                <Badge variant="secondary" className="font-body text-xs">
                  {patients.length} pacientes en contexto
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
