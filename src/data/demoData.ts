export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: string;
}

export type OdorLevel = 'sin_olor' | 'leve' | 'moderado' | 'intenso';
export type TissueType = 'epitelizacion' | 'granulacion' | 'fibrina' | 'esfacelo' | 'necrosis' | 'hueso_tendon';
export type EdgeType = 'regular' | 'irregular' | 'macerado' | 'eritematoso' | 'socavado' | 'enrollado' | 'necrosado';
export type EvolutionStatus =
  | 'tratamiento_activo'
  | 'mejoria_progresiva'
  | 'sin_cambios'
  | 'deterioro'
  | 'requiere_evaluacion'
  | 'cicatrizada';

export interface Evolution {
  id: string;
  date: string;
  time: string;
  professional: string;
  description: string;
  procedure: string;
  materials: string;
  healingFrequency: string;
  observations: string;
  nextControl: string;
  photos: Photo[];
  healingDate?: string;
  painLevel?: number;
  odor?: OdorLevel;
  evolutionStatus?: EvolutionStatus;
}

export const healingFrequencies = [
  'Diaria',
  'Cada 48hs',
  'Cada 72hs',
  'Semanal',
  'A demanda',
];

export const odorOptions: { value: OdorLevel; label: string }[] = [
  { value: 'sin_olor', label: 'Sin olor' },
  { value: 'leve', label: 'Leve' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'intenso', label: 'Intenso' },
];

export const evolutionStatuses: { value: EvolutionStatus; label: string; closes?: boolean }[] = [
  { value: 'tratamiento_activo', label: 'En tratamiento activo' },
  { value: 'mejoria_progresiva', label: 'Mejoría progresiva' },
  { value: 'sin_cambios', label: 'Sin cambios' },
  { value: 'deterioro', label: 'Deterioro' },
  { value: 'requiere_evaluacion', label: 'Requiere evaluación médica' },
  { value: 'cicatrizada', label: 'Herida cicatrizada — CERRAR EVOLUCIÓN', closes: true },
];

export interface WoundCase {
  id: string;
  patientId: string;
  woundType: string;
  anatomicalLocation: string;
  startDate: string;
  size: string;
  depth: string;
  exudate: string;
  infection: string;
  pain: string;
  treatment: string;
  status: 'activo' | 'en_mejoria' | 'critico' | 'resuelto';
  evolutions: Evolution[];
  photos: Photo[];
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  diagnosis: string;
  assignedProfessional: string;
  observations: string;
  admissionDate: string;
  controlIntervalDays: number;
  cases: WoundCase[];
}

const woundPhotos: string[] = [
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=300&h=200&fit=crop',
];

export const professionals = [
  'Lic. María González',
  'Dr. Carlos Rodríguez',
  'Lic. Ana Martínez',
  'Dr. Roberto Sánchez',
  'Lic. Laura Fernández',
];

export const woundTypes = [
  'Úlcera por presión',
  'Pie diabético',
  'Herida quirúrgica',
  'Úlcera venosa',
  'Lesión traumática',
  'Quemadura',
];

export const woundStatuses: { value: WoundCase['status']; label: string; color: string }[] = [
  { value: 'activo', label: 'Activo', color: 'info' },
  { value: 'en_mejoria', label: 'En mejoría', color: 'success' },
  { value: 'critico', label: 'Crítico', color: 'destructive' },
  { value: 'resuelto', label: 'Resuelto', color: 'muted' },
];

export const demoPatients: Patient[] = [
  {
    id: 'p1',
    firstName: 'Jorge',
    lastName: 'Ramírez',
    age: 72,
    gender: 'Masculino',
    dni: '12.345.678',
    phone: '+54 11 4567-8901',
    email: 'jorge.ramirez@email.com',
    address: 'Av. Corrientes 1234, CABA',
    diagnosis: 'Diabetes tipo 2 con complicaciones vasculares periféricas',
    assignedProfessional: 'Lic. María González',
    observations: 'Paciente con movilidad reducida. Requiere cuidados domiciliarios. Control glucémico inestable.',
    admissionDate: '2025-11-15',
    controlIntervalDays: 3,
    cases: [
      {
        id: 'c1',
        patientId: 'p1',
        woundType: 'Úlcera por presión',
        anatomicalLocation: 'Sacro',
        startDate: '2025-11-20',
        size: '8 x 6 cm',
        depth: 'Estadio III - Pérdida total del espesor de la piel',
        exudate: 'Moderado, seroso',
        infection: 'Sin signos de infección actual',
        pain: 'EVA 5/10 - Moderado',
        treatment: 'Desbridamiento autolítico con hidrogel + apósito de espuma multicapa. Cambio cada 48-72hs.',
        status: 'activo',
        evolutions: [
          {
            id: 'e1',
            date: '2026-03-18',
            time: '09:30',
            professional: 'Lic. María González',
            description: 'Lecho de herida con 60% tejido de granulación, 30% fibrina amarilla, 10% esfacelo. Bordes definidos con leve maceración perilesional.',
            procedure: 'Limpieza con solución fisiológica. Desbridamiento autolítico con hidrogel. Aplicación de apósito de espuma multicapa.',
            materials: 'Solución fisiológica, hidrogel amorfo, apósito de espuma multicapa Mepilex Border, gasas estériles',
            healingFrequency: 'Cada 48-72 horas',
            observations: 'Se indica cambio de posición cada 2 horas. Colchón antiescaras funcionando correctamente.',
            nextControl: '2026-03-21',
            photos: [{ id: 'ph1', url: woundPhotos[0], caption: 'Vista general de la úlcera sacra', date: '2026-03-18' }],
          },
          {
            id: 'e2',
            date: '2026-03-14',
            time: '10:00',
            professional: 'Lic. María González',
            description: 'Leve reducción del área de fibrina. Granulación progresando desde los bordes. Sin signos de infección.',
            procedure: 'Irrigación con solución fisiológica tibia. Aplicación de colagenasa en zona de fibrina. Apósito secundario.',
            materials: 'Solución fisiológica tibia, colagenasa (Iruxol), apósito secundario absorbente, cinta microporosa',
            healingFrequency: 'Cada 48 horas',
            observations: 'Paciente refiere menor dolor. Buen estado nutricional.',
            nextControl: '2026-03-18',
            photos: [{ id: 'ph2', url: woundPhotos[1], caption: 'Evolución favorable', date: '2026-03-14' }],
          },
          {
            id: 'e3',
            date: '2026-03-10',
            time: '08:45',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Primera evaluación. Úlcera sacra estadio III con abundante fibrina. Bordes irregulares.',
            procedure: 'Desbridamiento cortante de tejido necrótico. Toma de cultivo. Inicio de protocolo de curación.',
            materials: 'Bisturí estéril, hisopo para cultivo, solución fisiológica, gasas estériles, apósito de espuma',
            healingFrequency: 'Cada 24-48 horas (fase inicial)',
            observations: 'Se solicita interconsulta con nutrición. Se indica colchón antiescaras.',
            nextControl: '2026-03-14',
            photos: [{ id: 'ph3', url: woundPhotos[2], caption: 'Evaluación inicial', date: '2026-03-10' }],
          },
        ],
        photos: [
          { id: 'ph1', url: woundPhotos[0], caption: 'Vista general', date: '2026-03-18' },
          { id: 'ph2', url: woundPhotos[1], caption: 'Evolución', date: '2026-03-14' },
          { id: 'ph3', url: woundPhotos[2], caption: 'Evaluación inicial', date: '2026-03-10' },
        ],
      },
      {
        id: 'c2',
        patientId: 'p1',
        woundType: 'Pie diabético',
        anatomicalLocation: 'Pie derecho - Zona plantar metatarsiana',
        startDate: '2026-01-10',
        size: '3 x 2.5 cm',
        depth: 'Wagner grado 2',
        exudate: 'Escaso, seroso',
        infection: 'Colonización bacteriana controlada',
        pain: 'EVA 3/10 - Neuropatía periférica',
        treatment: 'Descarga con bota Walker. Curación con cadexómero iodado. Control glucémico estricto.',
        status: 'en_mejoria',
        evolutions: [
          {
            id: 'e4',
            date: '2026-03-19',
            time: '11:00',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Reducción notable del diámetro. Tejido de granulación sano. Sin signos de infección.',
            procedure: 'Curación con cadexómero iodado. Apósito no adherente. Refuerzo de descarga.',
            materials: 'Cadexómero iodado (Iodosorb), apósito no adherente Mepitel, venda de fijación',
            healingFrequency: 'Cada 72 horas',
            observations: 'HbA1c mejoró a 7.2%. Paciente cumple con descarga.',
            nextControl: '2026-03-26',
            photos: [{ id: 'ph4', url: woundPhotos[3], caption: 'Mejoría notable', date: '2026-03-19' }],
          },
        ],
        photos: [
          { id: 'ph4', url: woundPhotos[3], caption: 'Mejoría notable', date: '2026-03-19' },
        ],
      },
    ],
  },
  {
    id: 'p2',
    firstName: 'Marta',
    lastName: 'Vázquez',
    age: 65,
    gender: 'Femenino',
    dni: '18.765.432',
    phone: '+54 11 5678-1234',
    email: 'marta.vazquez@email.com',
    address: 'Calle Florida 567, CABA',
    diagnosis: 'Insuficiencia venosa crónica bilateral',
    assignedProfessional: 'Lic. Ana Martínez',
    observations: 'Paciente ambulatoria. Buena adherencia al tratamiento compresivo.',
    admissionDate: '2025-12-01',
    controlIntervalDays: 7,
    cases: [
      {
        id: 'c3',
        patientId: 'p2',
        woundType: 'Úlcera venosa',
        anatomicalLocation: 'Pierna izquierda - Zona maleolar interna',
        startDate: '2025-12-05',
        size: '12 x 8 cm',
        depth: 'Superficial con bordes irregulares',
        exudate: 'Abundante, serohemático',
        infection: 'Biofilm bacteriano detectado',
        pain: 'EVA 7/10 - Dolor intenso al reposo',
        treatment: 'Terapia compresiva multicapa. Apósito de alginato + plata. Elevación de MMII.',
        status: 'critico',
        evolutions: [
          {
            id: 'e5',
            date: '2026-03-20',
            time: '14:30',
            professional: 'Lic. Ana Martínez',
            description: 'Úlcera extensa con lecho predominantemente fibrinoso. Exudado abundante. Piel perilesional con dermatitis ocre y lipodermatoesclerosis.',
            procedure: 'Desbridamiento con fibras de hidrofibra. Aplicación de apósito de alginato con plata iónica. Vendaje compresivo multicapa.',
            materials: 'Hidrofibra Aquacel Ag+, apósito de alginato con plata, vendaje compresivo multicapa (Profore), protector cutáneo',
            healingFrequency: 'Cada 48-72 horas',
            observations: 'Se solicita eco Doppler venoso de control. Dolor mal controlado, se ajusta analgesia.',
            nextControl: '2026-03-23',
            photos: [{ id: 'ph5', url: woundPhotos[0], caption: 'Úlcera venosa extensa', date: '2026-03-20' }],
          },
        ],
        photos: [
          { id: 'ph5', url: woundPhotos[0], caption: 'Úlcera venosa extensa', date: '2026-03-20' },
        ],
      },
    ],
  },
  {
    id: 'p3',
    firstName: 'Ricardo',
    lastName: 'López',
    age: 45,
    gender: 'Masculino',
    dni: '24.567.890',
    phone: '+54 11 3456-7890',
    email: 'ricardo.lopez@email.com',
    address: 'Av. Rivadavia 8901, CABA',
    diagnosis: 'Post-operatorio de cirugía abdominal compleja',
    assignedProfessional: 'Dr. Roberto Sánchez',
    observations: 'Paciente con antecedentes de tabaquismo. Dehiscencia parcial de herida quirúrgica.',
    admissionDate: '2026-02-20',
    controlIntervalDays: 5,
    cases: [
      {
        id: 'c4',
        patientId: 'p3',
        woundType: 'Herida quirúrgica',
        anatomicalLocation: 'Abdomen - Línea media infraumbilical',
        startDate: '2026-02-25',
        size: '15 x 4 cm (dehiscencia de 6 cm)',
        depth: 'Hasta fascia muscular visible',
        exudate: 'Moderado, seropurulento',
        infection: 'Infección de sitio quirúrgico superficial - Cultivo: S. aureus MSSA',
        pain: 'EVA 6/10',
        treatment: 'ATB sistémico (Cefalotina). Curación con PHMB. VAC therapy en evaluación.',
        status: 'activo',
        evolutions: [
          {
            id: 'e6',
            date: '2026-03-19',
            time: '16:00',
            professional: 'Dr. Roberto Sánchez',
            description: 'Dehiscencia con signos de infección en resolución. Cultivo de control pendiente. Tejido de granulación incipiente en fondo.',
            procedure: 'Irrigación con PHMB. Packing con gasa húmeda. Apósito secundario absorbente.',
            materials: 'PHMB (Prontosan), gasas húmedas estériles, apósito absorbente secundario, cinta hipoalergénica',
            healingFrequency: 'Cada 24 horas',
            observations: 'Completó 10 días de ATB. Mejoría clínica. Se evalúa VAC therapy para próxima semana.',
            nextControl: '2026-03-22',
            photos: [{ id: 'ph6', url: woundPhotos[1], caption: 'Dehiscencia en resolución', date: '2026-03-19' }],
          },
        ],
        photos: [
          { id: 'ph6', url: woundPhotos[1], caption: 'Dehiscencia en resolución', date: '2026-03-19' },
        ],
      },
    ],
  },
  {
    id: 'p4',
    firstName: 'Elena',
    lastName: 'Gutiérrez',
    age: 58,
    gender: 'Femenino',
    dni: '20.123.456',
    phone: '+54 11 6789-0123',
    email: 'elena.gutierrez@email.com',
    address: 'Calle Lavalle 345, CABA',
    diagnosis: 'Quemadura por accidente doméstico',
    assignedProfessional: 'Lic. Laura Fernández',
    observations: 'Quemadura por agua hirviente. Evolución favorable.',
    admissionDate: '2026-03-01',
    controlIntervalDays: 4,
    cases: [
      {
        id: 'c5',
        patientId: 'p4',
        woundType: 'Quemadura',
        anatomicalLocation: 'Antebrazo derecho - Cara anterior',
        startDate: '2026-03-01',
        size: '10 x 7 cm',
        depth: 'Segundo grado superficial (ABA)',
        exudate: 'Seroso, moderado',
        infection: 'Sin signos de infección',
        pain: 'EVA 8/10 - Muy doloroso',
        treatment: 'Sulfadiazina de plata. Apósito de silicona no adherente. Analgesia pautada.',
        status: 'en_mejoria',
        evolutions: [
          {
            id: 'e7',
            date: '2026-03-20',
            time: '09:00',
            professional: 'Lic. Laura Fernández',
            description: 'Reepitelización del 70%. Bordes de la quemadura con piel rosada nueva. Sin ampollas residuales.',
            procedure: 'Limpieza suave. Aplicación de crema hidratante + protector solar. Apósito de silicona.',
            materials: 'Solución fisiológica, crema hidratante con aloe vera, protector solar SPF50, apósito de silicona Mepiform',
            healingFrequency: 'Cada 72 horas',
            observations: 'Excelente evolución. Se inicia prevención de cicatriz hipertrófica con silicona.',
            nextControl: '2026-03-27',
            photos: [{ id: 'ph7', url: woundPhotos[2], caption: 'Reepitelización avanzada', date: '2026-03-20' }],
          },
        ],
        photos: [
          { id: 'ph7', url: woundPhotos[2], caption: 'Reepitelización avanzada', date: '2026-03-20' },
        ],
      },
    ],
  },
  {
    id: 'p5',
    firstName: 'Héctor',
    lastName: 'Domínguez',
    age: 34,
    gender: 'Masculino',
    dni: '30.987.654',
    phone: '+54 11 7890-1234',
    email: 'hector.dominguez@email.com',
    address: 'Av. Libertador 5678, CABA',
    diagnosis: 'Traumatismo por accidente de tránsito',
    assignedProfessional: 'Dr. Carlos Rodríguez',
    observations: 'Lesión traumática con pérdida de sustancia. Paciente joven con buena capacidad de cicatrización.',
    admissionDate: '2026-02-15',
    controlIntervalDays: 5,
    cases: [
      {
        id: 'c6',
        patientId: 'p5',
        woundType: 'Lesión traumática',
        anatomicalLocation: 'Muslo izquierdo - Cara lateral',
        startDate: '2026-02-15',
        size: '18 x 12 cm',
        depth: 'Pérdida parcial de espesor con exposición de tejido subcutáneo',
        exudate: 'Abundante los primeros días, actualmente moderado seroso',
        infection: 'Infección controlada tras tratamiento con ATB',
        pain: 'EVA 4/10 - En descenso',
        treatment: 'Terapia de presión negativa (VAC) + injerto de piel parcial planificado.',
        status: 'en_mejoria',
        evolutions: [
          {
            id: 'e8',
            date: '2026-03-18',
            time: '15:30',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Lecho con excelente tejido de granulación (90%). Listo para injerto de piel parcial.',
            procedure: 'Retiro de VAC. Evaluación prequirúrgica para injerto. Apósito húmedo transitorio.',
            materials: 'Equipo de retiro VAC, solución fisiológica, apósito húmedo Adaptic, apósito secundario, venda elástica',
            healingFrequency: 'Cada 48 horas (pre-injerto)',
            observations: 'Cirugía de injerto programada para el 25/03. Pre-quirúrgicos completos.',
            nextControl: '2026-03-25',
            photos: [{ id: 'ph8', url: woundPhotos[3], caption: 'Preparado para injerto', date: '2026-03-18' }],
          },
        ],
        photos: [
          { id: 'ph8', url: woundPhotos[3], caption: 'Preparado para injerto', date: '2026-03-18' },
        ],
      },
    ],
  },
  {
    id: 'p6',
    firstName: 'Carmen',
    lastName: 'Pellegrini',
    age: 81,
    gender: 'Femenino',
    dni: '10.234.567',
    phone: '+54 11 2345-6789',
    email: 'carmen.pellegrini@email.com',
    address: 'Calle Belgrano 890, La Plata',
    diagnosis: 'Múltiples úlceras por presión. Paciente encamada.',
    assignedProfessional: 'Lic. María González',
    observations: 'Paciente geriátrica con deterioro cognitivo leve. Cuidadora principal: hija. Requiere seguimiento domiciliario intensivo.',
    admissionDate: '2025-10-10',
    controlIntervalDays: 2,
    cases: [
      {
        id: 'c7',
        patientId: 'p6',
        woundType: 'Úlcera por presión',
        anatomicalLocation: 'Talón derecho',
        startDate: '2025-10-15',
        size: '4 x 3 cm',
        depth: 'Estadio II',
        exudate: 'Escaso',
        infection: 'Sin infección',
        pain: 'EVA 2/10',
        treatment: 'Apósito hidrocoloide. Protección de talones con taloneras.',
        status: 'resuelto',
        evolutions: [
          {
            id: 'e9',
            date: '2026-02-28',
            time: '10:00',
            professional: 'Lic. María González',
            description: 'Herida completamente epitelizada. Piel íntegra con coloración rosada. Alta del caso.',
            procedure: 'Evaluación final. Aplicación de crema hidratante. Indicaciones de prevención.',
            materials: 'Crema hidratante, apósito hidrocoloide fino de protección, talonera preventiva',
            healingFrequency: 'Control mensual preventivo',
            observations: 'Caso resuelto. Continuar con medidas preventivas. Control en 30 días.',
            nextControl: '2026-03-30',
            photos: [{ id: 'ph9', url: woundPhotos[0], caption: 'Caso resuelto', date: '2026-02-28' }],
          },
        ],
        photos: [
          { id: 'ph9', url: woundPhotos[0], caption: 'Caso resuelto', date: '2026-02-28' },
        ],
      },
    ],
  },
];

export function getStatusBadgeVariant(status: WoundCase['status']): string {
  switch (status) {
    case 'activo': return 'info';
    case 'en_mejoria': return 'success';
    case 'critico': return 'destructive';
    case 'resuelto': return 'muted';
    default: return 'muted';
  }
}

export function getStatusLabel(status: WoundCase['status']): string {
  const found = woundStatuses.find(s => s.value === status);
  return found ? found.label : status;
}
