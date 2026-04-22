import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Activity, Shield, Users, BarChart3, ArrowRight, ChevronRight, HelpCircle } from 'lucide-react';
import logo from '@/assets/curatrack-logo.png';

const features = [
  {
    icon: Users,
    title: 'Gestión de Pacientes',
    desc: 'Perfiles completos con historial clínico, diagnósticos y seguimiento integral de cada paciente.',
  },
  {
    icon: Activity,
    title: 'Seguimiento de Heridas',
    desc: 'Registro detallado de evoluciones, fotografías comparativas y timeline cronológico por caso.',
  },
  {
    icon: Shield,
    title: 'Seguridad Clínica',
    desc: 'Datos protegidos con estándares de seguridad hospitalaria y trazabilidad completa.',
  },
  {
    icon: BarChart3,
    title: 'Métricas y Reportes',
    desc: 'Dashboard con indicadores clave, alertas automáticas y análisis de evolución.',
  },
];

const faqs = [
  {
    q: '¿Qué es CuraTrack?',
    a: 'CuraTrack es una plataforma clínica para el seguimiento de heridas crónicas y agudas (úlceras por presión, pie diabético, heridas quirúrgicas, quemaduras y más). Permite registrar pacientes, casos, evoluciones con fotografías y generar historias clínicas en PDF.',
  },
  {
    q: '¿Quiénes pueden usar CuraTrack?',
    a: 'Está pensada para equipos de enfermería, médicos, kinesiólogos y profesionales de la salud que realicen curaciones y seguimiento de heridas, tanto en hospitales, centros de salud como en atención domiciliaria.',
  },
  {
    q: '¿Cómo registro una evolución de una herida?',
    a: 'Desde la ficha del paciente, abrí el caso correspondiente y agregá una nueva evolución. Podés cargar la descripción clínica, procedimiento, materiales utilizados, frecuencia de curación, próximo control y adjuntar fotografías comparativas del lecho de la herida.',
  },
  {
    q: '¿Puedo cargar fotografías clínicas de las heridas?',
    a: 'Sí. Cada evolución soporta múltiples fotografías con descripción. Las imágenes se organizan en una galería por caso y en una línea de tiempo cronológica para comparar la evolución visual de la herida.',
  },
  {
    q: '¿Cómo se calculan los próximos controles?',
    a: 'Cada paciente tiene un intervalo de control configurable (por ejemplo, cada 3, 7 o 14 días). El calendario sugiere automáticamente las próximas fechas y el dashboard muestra los turnos próximos y vencidos.',
  },
  {
    q: '¿Puedo exportar la historia clínica en PDF?',
    a: 'Sí. Desde la ficha del paciente podés generar un PDF profesional con todos los datos del paciente, casos, evoluciones y fotografías. Es ideal para auditorías, derivaciones o entregar al paciente.',
  },
  {
    q: '¿Los datos de los pacientes están seguros?',
    a: 'CuraTrack utiliza estándares de seguridad clínica con cifrado en tránsito y en reposo, control de acceso por usuario y trazabilidad de cada cambio. Cada profesional sólo ve los pacientes y casos a los que tiene acceso.',
  },
  {
    q: '¿Necesito instalar algo o funciona en el navegador?',
    a: 'CuraTrack es una aplicación web responsive: funciona desde cualquier navegador moderno en computadora, tablet o teléfono, sin instalación.',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-24 px-6">
          <img src={logo} alt="CuraTrack" className="h-16 md:h-20 w-auto" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')} className="font-body text-sm">
              Iniciar sesión
            </Button>
            <Button onClick={() => navigate('/register')} className="font-body text-sm">
              Registrarse <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <span className="inline-block mb-4 px-4 py-1.5 rounded-full border border-primary-foreground/30 text-primary-foreground/80 text-xs font-body font-medium tracking-wider uppercase">
              CuraTrack — Cuidado clínico inteligente
            </span>
            <h1 className="heading-display text-4xl md:text-6xl lg:text-7xl text-primary-foreground mb-6 leading-tight">
              Seguimiento inteligente<br />
              de heridas complejas
            </h1>
            <p className="font-body text-primary-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Plataforma profesional para el registro, seguimiento y análisis de heridas crónicas y agudas. 
              Diseñada para equipos de enfermería y salud.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/login')} className="font-body text-base px-8 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold">
                Acceder a la plataforma <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="font-body text-base px-8 py-6 border-primary-foreground text-primary-foreground bg-primary-foreground/15 hover:bg-primary-foreground/25">
                Solicitar demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="heading-display text-3xl md:text-4xl mb-4">
              Todo lo que necesitás para el cuidado de heridas
            </h2>
            <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
              Herramientas clínicas diseñadas por profesionales, para profesionales.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-card rounded-xl p-8 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-5">
                  <f.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="heading-display text-xl mb-2">{f.title}</h3>
                <p className="font-body text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-secondary/40">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-body font-medium mb-4">
              <HelpCircle className="h-3.5 w-3.5" /> Preguntas frecuentes
            </div>
            <h2 className="heading-display text-3xl md:text-4xl mb-4">
              Resolvé tus dudas sobre CuraTrack
            </h2>
            <p className="font-body text-muted-foreground text-lg">
              Todo lo que necesitás saber para empezar a hacer seguimiento clínico de heridas.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="glass-card rounded-xl border border-border/60 px-5 data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="font-body font-semibold text-left hover:no-underline py-5 text-base">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-muted-foreground leading-relaxed pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          <div className="text-center mt-10">
            <p className="font-body text-sm text-muted-foreground mb-3">
              ¿Tenés otra pregunta?
            </p>
            <Button variant="outline" onClick={() => navigate('/login')} className="font-body">
              Probá la plataforma <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 bg-secondary/50">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { n: '2,400+', l: 'Pacientes registrados' },
              { n: '8,500+', l: 'Evoluciones clínicas' },
              { n: '15+', l: 'Centros de salud' },
              { n: '98%', l: 'Satisfacción' },
            ].map((s) => (
              <div key={s.l}>
                <div className="heading-display text-3xl md:text-4xl text-primary mb-1">{s.n}</div>
                <div className="font-body text-sm text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logo} alt="CuraTrack" className="h-8 opacity-70" />
          <p className="font-body text-sm text-muted-foreground">
            © 2026 CuraTrack. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
