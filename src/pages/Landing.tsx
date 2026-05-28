import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Activity, Shield, Users, BarChart3, ArrowRight, ChevronRight, HelpCircle,
  ShoppingBag, Truck, Briefcase, Sparkles, ShieldCheck, TrendingUp, Stethoscope,
} from 'lucide-react';
import { useSponsor } from '@/context/SponsorContext';
import { SponsorLogo } from '@/components/SponsorLogo';
import { useApp } from '@/context/AppContext';
import { useAppRole } from '@/hooks/useAppRole';

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sponsor, setSponsorBySlug, sponsors } = useSponsor();
  const { isLoggedIn, authReady } = useApp();
  const { role, ready: roleReady } = useAppRole();

  useEffect(() => {
    const slug = searchParams.get('sponsor');
    if (slug && sponsors.find(s => s.slug === slug)) {
      setSponsorBySlug(slug, false);
    }
  }, [searchParams, sponsors, setSponsorBySlug]);

  // If a logged-in user lands on "/", send them to their role home.
  useEffect(() => {
    if (!authReady || !isLoggedIn || !roleReady) return;
    navigate(role === 'sponsor' ? '/panel-sponsor' : '/dashboard', { replace: true });
  }, [authReady, isLoggedIn, roleReady, role, navigate]);

  const appName = sponsor?.app_name ?? 'CuraTrack';
  const sponsorName = sponsor?.sponsor_name ?? 'Laboratorio sponsor';
  const catalogName = sponsor?.catalog_name ?? 'Catálogo clínico';

  const valueProps = [
    { icon: Activity, title: 'Seguimiento clínico de heridas', desc: 'Pacientes, casos, evoluciones, fotos comparativas y firmas digitales.' },
    { icon: Sparkles, title: 'Asistencia clínica con IA', desc: 'Resumen de evoluciones, agenda inteligente y soporte en decisiones de curación.' },
    { icon: ShoppingBag, title: 'Catálogo clínico sponsor', desc: 'Productos del laboratorio asociados al tipo de herida y al protocolo de tratamiento.' },
    { icon: Truck, title: 'Reposición inteligente', desc: 'Solicitudes de insumos directamente desde el flujo clínico, con trazabilidad.' },
  ];

  const forLab = [
    'Financiá suscripciones para enfermeros y profesionales clínicos.',
    'Visibilidad real del uso de tus productos en el flujo de curación.',
    'Métricas agregadas de adopción, demanda y conversión, sin información identificable de pacientes.',
    'Embudo comercial: recomendación → reposición → pedido confirmado.',
    'Reportes mensuales listos para tu equipo comercial y de marketing.',
  ];

  const forNurse = [
    'Registro rápido de curaciones y evoluciones con fotos.',
    'Agenda automática con próximos controles y alertas clínicas.',
    'Historia clínica en PDF con firma del profesional y consentimiento.',
    'Asistente clínico para resumir evoluciones y organizar el día.',
    'Catálogo y reposición sin salir del flujo de trabajo.',
  ];

  const faqs = [
    { q: `¿Qué es ${appName}?`, a: `${appName} es una plataforma clínica-comercial para el seguimiento de heridas complejas, asistencia clínica con IA y reposición inteligente de insumos médicos. Está adaptada al programa de acompañamiento de ${sponsorName}.` },
    { q: '¿Quiénes usan la plataforma?', a: 'Profesionales de enfermería, médicos y kinesiólogos que realizan seguimiento de heridas crónicas y agudas en hospitales, centros de salud o atención domiciliaria.' },
    { q: '¿Qué obtiene el laboratorio sponsor?', a: 'Métricas agregadas y anónimas de adopción, demanda y conversión de productos. El laboratorio nunca accede a información identificable de pacientes ni a su historia clínica.' },
    { q: '¿Cómo se protegen los datos clínicos?', a: 'La información clínica del paciente está protegida con cifrado, control de acceso por usuario y separación lógica entre datos clínicos y métricas comerciales.' },
    { q: '¿Puedo exportar reportes?', a: 'Sí. La plataforma genera historias clínicas en PDF para uso profesional y reportes ejecutivos agregados para el laboratorio sponsor.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-20 px-6">
          <SponsorLogo />
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')} className="font-body text-sm">
              Iniciar sesión
            </Button>
            <Button onClick={() => navigate('/register')} className="font-body text-sm">
              Solicitar demo <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero + acceso demo (mismo gradiente; botones fuera del bloque de copy del hero) */}
      <div
        className={`relative overflow-hidden ${!sponsor ? 'gradient-hero' : ''}`}
        style={
          sponsor
            ? {
                background: `linear-gradient(135deg, ${sponsor.secondary_color} 0%, ${sponsor.primary_color} 70%, ${sponsor.accent_color} 100%)`,
              }
            : undefined
        }
      >
        <section className="pt-32 pb-8 px-6">
          <div className="container mx-auto max-w-5xl relative">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center">
              <span className="inline-flex items-center gap-1.5 mb-5 px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-xs font-body font-medium tracking-wider uppercase backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" /> Programa {sponsorName}
              </span>
              <h1 className="heading-display text-4xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.05]">
                Seguimiento clínico de heridas,<br />
                <span className="opacity-80">IA y reposición inteligente</span>
              </h1>
              <p className="font-body text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                {appName} acompaña al equipo clínico en cada curación y le da al laboratorio visibilidad real
                sobre adopción, demanda y oportunidades comerciales — sin comprometer la información sensible del paciente.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="pb-24 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="p-2 text-left rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  size="lg"
                  onClick={() => navigate('/login?demo=pro')}
                  className="font-body text-base px-8 py-6 bg-white text-foreground hover:bg-white/90 shadow-sm"
                >
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Ingresar como demo profesional
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login?demo=sponsor')}
                  className="font-body text-base px-8 py-6 border-white/40 text-white bg-transparent hover:bg-white/15"
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Ingresar como demo laboratorio
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Problema */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="heading-display text-3xl md:text-4xl mb-3">El problema actual</h2>
            <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
              Seguimiento manual, baja trazabilidad clínica, poca visibilidad del uso real de insumos
              y dificultad para medir el impacto de los programas de acompañamiento.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { t: 'Para el equipo clínico', d: 'Registro disperso en papel, planillas y mensajería. Tiempo perdido y errores de seguimiento.' },
              { t: 'Para el laboratorio', d: 'Sin datos sobre cómo se usan los productos en el campo ni qué oportunidades se pierden.' },
              { t: 'Para la institución', d: 'Auditoría compleja, poca trazabilidad y baja capacidad de medir resultados clínicos.' },
            ].map(p => (
              <div key={p.t} className="p-6 rounded-xl border border-border bg-card">
                <p className="font-display font-semibold text-base mb-2">{p.t}</p>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solución */}
      <section className="py-20 px-6 bg-secondary/40">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="heading-display text-3xl md:text-4xl mb-3">Una sola plataforma. Dos audiencias.</h2>
            <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
              {appName} unifica el flujo clínico del enfermero con la inteligencia comercial del laboratorio sponsor.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {valueProps.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-card rounded-xl p-6 border border-border/60 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="heading-display text-base mb-1.5">{f.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Para laboratorios + Para enfermeros */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl border border-primary/30 bg-primary/5">
            <Briefcase className="h-7 w-7 text-primary mb-3" />
            <h3 className="heading-display text-2xl mb-2">Para {sponsorName}</h3>
            <p className="font-body text-muted-foreground mb-5 text-sm">
              Una plataforma white-label adaptada a la identidad y al programa comercial del laboratorio.
            </p>
            <ul className="space-y-2.5">
              {forLab.map(t => (
                <li key={t} className="flex gap-2.5 font-body text-sm">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 rounded-2xl border border-border bg-card">
            <Users className="h-7 w-7 text-foreground mb-3" />
            <h3 className="heading-display text-2xl mb-2">Para el equipo clínico</h3>
            <p className="font-body text-muted-foreground mb-5 text-sm">
              Una herramienta clínica premium financiada por el laboratorio sponsor.
            </p>
            <ul className="space-y-2.5">
              {forNurse.map(t => (
                <li key={t} className="flex gap-2.5 font-body text-sm">
                  <Activity className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="py-16 px-6 bg-secondary/40">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { n: '120+', l: 'Enfermeros activos' },
              { n: '8.500+', l: 'Curaciones registradas' },
              { n: '340+', l: 'Productos recomendados' },
              { n: '210+', l: 'Solicitudes de reposición' },
            ].map(s => (
              <div key={s.l}>
                <div className="heading-display text-3xl md:text-4xl text-primary mb-1">{s.n}</div>
                <div className="font-body text-sm text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seguridad */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="heading-display text-3xl md:text-4xl mb-3">Seguridad clínica y separación de datos</h2>
          <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            La información clínica del paciente está protegida y nunca se comparte con el laboratorio.
            El sponsor accede únicamente a métricas agregadas, anónimas y orientadas al programa comercial.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            {[
              { t: 'Datos clínicos protegidos', d: 'Cifrado en tránsito y reposo. Control de acceso por usuario.' },
              { t: 'Métricas agregadas para sponsor', d: 'Sin nombre, DNI, fotos ni historia clínica individual.' },
              { t: 'Trazabilidad y auditoría', d: 'Firmas digitales del profesional y consentimiento del paciente.' },
            ].map(s => (
              <div key={s.t} className="p-5 rounded-lg border border-border bg-card">
                <p className="font-display font-semibold mb-1.5 text-sm">{s.t}</p>
                <p className="font-body text-xs text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-secondary/40">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-body font-medium mb-3">
              <HelpCircle className="h-3.5 w-3.5" /> Preguntas frecuentes
            </div>
            <h2 className="heading-display text-3xl md:text-4xl">Sobre {appName}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-card rounded-xl border border-border/60 px-5">
                <AccordionTrigger className="font-body font-semibold text-left hover:no-underline py-4 text-sm">{faq.q}</AccordionTrigger>
                <AccordionContent className="font-body text-muted-foreground leading-relaxed pb-4 text-sm">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="heading-display text-3xl md:text-4xl mb-4">¿Querés ver {appName} en acción?</h2>
          <p className="font-body text-muted-foreground text-lg mb-8">
            Coordinamos una demo personalizada con tu equipo comercial y clínico.
          </p>
          <Button size="lg" onClick={() => navigate('/register')} className="font-body text-base px-8 py-6">
            Solicitar demo <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border bg-card">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <SponsorLogo />
          <p className="font-body text-xs text-muted-foreground text-center max-w-2xl">
            {sponsor?.legal_footer ?? `© ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.`}
          </p>
        </div>
      </footer>
    </div>
  );
}
