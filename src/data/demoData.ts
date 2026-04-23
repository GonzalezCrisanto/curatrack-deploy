export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: string;
}

export type OdorLevel = 'sin_olor' | 'leve' | 'moderado' | 'intenso';
export type TissueType = 'epitelizacion' | 'granulacion' | 'fibrina' | 'esfacelo' | 'necrosis' | 'hueso_tendon';
export type EdgeType = 'regular' | 'irregular' | 'macerado' | 'eritematoso' | 'socavado' | 'enrollado' | 'necrosado';
export type ExudateAmount = 'sin_exudado' | 'escaso' | 'moderado' | 'abundante';
export type ExudateType = 'seroso' | 'serosanguinolento' | 'sanguinolento' | 'purulento' | 'fibrinoso';
export type ExudateColor = 'transparente' | 'amarillo' | 'verde' | 'rojo' | 'marron';
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
  healingFrequencyDays?: number;
  observations: string;
  nextControl: string;
  photos: Photo[];
  healingDate?: string;
  painLevel?: number;
  odor?: OdorLevel;
  evolutionStatus?: EvolutionStatus;
  woundLength?: number;
  woundWidth?: number;
  woundDepth?: number;
  tissueTypes?: TissueType[];
  edgeTypes?: EdgeType[];
  exudateAmount?: ExudateAmount;
  exudateType?: ExudateType;
  exudateColor?: ExudateColor;
  hasInfectionSigns?: boolean;
  infMalOlor?: boolean;
  infEritema?: boolean;
  infCalor?: boolean;
  infBiofilm?: boolean;
  infPurulenta?: boolean;
  infDolorAumentado?: boolean;
  bodyTemperature?: number;
  requiresMedicalOrder?: boolean;
  medicalOrder?: string;
  aiSummary?: string;
  closedAt?: string;
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

export const tissueTypeOptions: { value: TissueType; label: string }[] = [
  { value: 'epitelizacion', label: 'Epitelización' },
  { value: 'granulacion', label: 'Granulación' },
  { value: 'fibrina', label: 'Fibrina' },
  { value: 'esfacelo', label: 'Esfacelo' },
  { value: 'necrosis', label: 'Necrosis' },
  { value: 'hueso_tendon', label: 'Hueso o tendón expuesto' },
];

export const edgeTypeOptions: { value: EdgeType; label: string }[] = [
  { value: 'regular', label: 'Regular/Definido' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'macerado', label: 'Macerado' },
  { value: 'eritematoso', label: 'Eritematoso' },
  { value: 'socavado', label: 'Socavado (undermining)' },
  { value: 'enrollado', label: 'Enrollado (epibole)' },
  { value: 'necrosado', label: 'Necrosado' },
];

export const exudateAmountOptions: { value: ExudateAmount; label: string }[] = [
  { value: 'sin_exudado', label: 'Sin exudado' },
  { value: 'escaso', label: 'Escaso' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'abundante', label: 'Abundante' },
];

export const exudateTypeOptions: { value: ExudateType; label: string }[] = [
  { value: 'seroso', label: 'Seroso' },
  { value: 'serosanguinolento', label: 'Serosanguinolento' },
  { value: 'sanguinolento', label: 'Sanguinolento' },
  { value: 'purulento', label: 'Purulento' },
  { value: 'fibrinoso', label: 'Fibrinoso' },
];

export const exudateColorOptions: { value: ExudateColor; label: string; swatch: string }[] = [
  { value: 'transparente', label: 'Transparente', swatch: 'bg-background border-2 border-border' },
  { value: 'amarillo', label: 'Amarillo', swatch: 'bg-yellow-400' },
  { value: 'verde', label: 'Verde', swatch: 'bg-green-500' },
  { value: 'rojo', label: 'Rojo', swatch: 'bg-red-500' },
  { value: 'marron', label: 'Marrón', swatch: 'bg-amber-800' },
];

export const infectionSignFields: { key: 'infMalOlor' | 'infEritema' | 'infCalor' | 'infBiofilm' | 'infPurulenta' | 'infDolorAumentado'; label: string }[] = [
  { key: 'infMalOlor', label: 'Mal olor' },
  { key: 'infEritema', label: 'Eritema perilesional' },
  { key: 'infCalor', label: 'Calor local' },
  { key: 'infBiofilm', label: 'Sospecha de biofilm' },
  { key: 'infPurulenta', label: 'Secreción purulenta' },
  { key: 'infDolorAumentado', label: 'Dolor aumentado' },
];

export interface WoundCase {
  id: string;
  patientId: string;
  woundType: string;
  anatomicalLocation: string;
  startDate: string;
  status: 'activo' | 'en_mejoria' | 'critico' | 'resuelto';
  evolutions: Evolution[];
  photos: Photo[];

  // Structured baseline (same fields as Evolution)
  woundLength?: number;
  woundWidth?: number;
  woundDepth?: number;
  tissueTypes?: TissueType[];
  edgeTypes?: EdgeType[];
  exudateAmount?: ExudateAmount;
  exudateType?: ExudateType;
  exudateColor?: ExudateColor;
  painLevel?: number;
  odor?: OdorLevel;
  hasInfectionSigns?: boolean;
  infMalOlor?: boolean;
  infEritema?: boolean;
  infCalor?: boolean;
  infBiofilm?: boolean;
  infPurulenta?: boolean;
  infDolorAumentado?: boolean;
  bodyTemperature?: number;
  healingFrequency?: string;
  healingFrequencyDays?: number;
  initialProcedure?: string;
  initialMaterials?: string;
  initialObservations?: string;
  treatment?: string;
  aiSummary?: string;
  aiSummaryUpdatedAt?: string;

  // Legacy text fields (kept optional for backward compat with old PDFs/imports)
  size?: string;
  depth?: string;
  exudate?: string;
  infection?: string;
  pain?: string;
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
  allergies?: string;
  insurance?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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
    diagnosis: 'Diabetes tipo 2 de 15 años de evolución. Hipertensión arterial controlada. Vasculopatía periférica. Tabaquismo previo (ex-fumador hace 3 años).',
    assignedProfessional: 'Lic. María González',
    observations: 'Paciente con movilidad reducida. Vive con su esposa. Cuidados domiciliarios. Buena adherencia al control glucémico aunque inestable.',
    admissionDate: '2025-11-15',
    controlIntervalDays: 3,
    allergies: 'Penicilina (rash cutáneo)',
    insurance: 'PAMI',
    emergencyContactName: 'Susana Ramírez (esposa)',
    emergencyContactPhone: '+54 11 4567-8902',
    cases: [
      {
        id: 'c1',
        patientId: 'p1',
        woundType: 'Úlcera por presión',
        anatomicalLocation: 'Sacro',
        startDate: '2025-11-20',
        status: 'activo',
        woundLength: 8, woundWidth: 6, woundDepth: 1.2,
        tissueTypes: ['granulacion', 'fibrina', 'esfacelo'],
        edgeTypes: ['regular', 'macerado'],
        exudateAmount: 'moderado', exudateType: 'seroso', exudateColor: 'amarillo',
        painLevel: 5, odor: 'leve',
        hasInfectionSigns: false,
        healingFrequency: 'Cada 48hs',
        initialProcedure: 'Limpieza con solución fisiológica. Desbridamiento autolítico con hidrogel. Apósito de espuma multicapa.',
        initialMaterials: 'Solución fisiológica, hidrogel amorfo, apósito de espuma Mepilex Border, gasas estériles',
        initialObservations: 'Estadio III. Cambio de posición cada 2hs. Colchón antiescaras instalado.',
        treatment: 'Desbridamiento autolítico + apósito de espuma. Cambio cada 48-72hs.',
        size: '8 x 6 cm', depth: 'Estadio III', exudate: 'Moderado, seroso',
        infection: 'Sin signos de infección actual', pain: 'EVA 5/10 - Moderado',
        evolutions: [
          {
            id: 'e1-t3', date: '2026-05-03', time: '09:30',
            professional: 'Lic. María González',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-03', photos: [],
          },
          {
            id: 'e1-t2', date: '2026-04-30', time: '09:30',
            professional: 'Lic. María González',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-30', photos: [],
          },
          {
            id: 'e1-t1', date: '2026-04-27', time: '09:30',
            professional: 'Lic. María González',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-27', photos: [],
          },
          {
            id: 'e1', date: '2026-03-18', time: '09:30',
            professional: 'Lic. María González',
            description: 'Lecho de herida con 60% tejido de granulación, 30% fibrina amarilla, 10% esfacelo. Bordes definidos con leve maceración perilesional.',
            procedure: 'Limpieza con solución fisiológica. Desbridamiento autolítico con hidrogel. Aplicación de apósito de espuma multicapa.',
            materials: 'Solución fisiológica, hidrogel amorfo, apósito de espuma multicapa Mepilex Border, gasas estériles',
            healingFrequency: 'Cada 48hs', healingFrequencyDays: 2,
            observations: 'Se indica cambio de posición cada 2 horas. Colchón antiescaras funcionando correctamente.',
            nextControl: '2026-03-21',
            painLevel: 5, odor: 'leve', evolutionStatus: 'mejoria_progresiva',
            woundLength: 7.5, woundWidth: 5.5, woundDepth: 1.0,
            tissueTypes: ['granulacion', 'fibrina', 'esfacelo'],
            edgeTypes: ['regular', 'macerado'],
            exudateAmount: 'moderado', exudateType: 'seroso', exudateColor: 'amarillo',
            hasInfectionSigns: false, bodyTemperature: 36.6,
            photos: [{ id: 'ph1', url: woundPhotos[0], caption: 'Vista general de la úlcera sacra', date: '2026-03-18' }],
          },
          {
            id: 'e2', date: '2026-03-14', time: '10:00',
            professional: 'Lic. María González',
            description: 'Leve reducción del área de fibrina. Granulación progresando desde los bordes. Sin signos de infección.',
            procedure: 'Irrigación con solución fisiológica tibia. Aplicación de colagenasa en zona de fibrina. Apósito secundario.',
            materials: 'Solución fisiológica tibia, colagenasa (Iruxol), apósito secundario absorbente, cinta microporosa',
            healingFrequency: 'Cada 48hs', healingFrequencyDays: 2,
            observations: 'Paciente refiere menor dolor. Buen estado nutricional.',
            nextControl: '2026-03-18',
            painLevel: 4, odor: 'leve', evolutionStatus: 'mejoria_progresiva',
            woundLength: 8, woundWidth: 6, woundDepth: 1.1,
            tissueTypes: ['granulacion', 'fibrina'],
            edgeTypes: ['regular'],
            exudateAmount: 'moderado', exudateType: 'seroso', exudateColor: 'amarillo',
            hasInfectionSigns: false, bodyTemperature: 36.5,
            photos: [{ id: 'ph2', url: woundPhotos[1], caption: 'Evolución favorable', date: '2026-03-14' }],
          },
          {
            id: 'e3', date: '2026-03-10', time: '08:45',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Primera evaluación. Úlcera sacra estadio III con abundante fibrina. Bordes irregulares.',
            procedure: 'Desbridamiento cortante de tejido necrótico. Toma de cultivo. Inicio de protocolo de curación.',
            materials: 'Bisturí estéril, hisopo para cultivo, solución fisiológica, gasas estériles, apósito de espuma',
            healingFrequency: 'Diaria', healingFrequencyDays: 1,
            observations: 'Se solicita interconsulta con nutrición. Se indica colchón antiescaras.',
            nextControl: '2026-03-14',
            painLevel: 6, odor: 'moderado', evolutionStatus: 'tratamiento_activo',
            woundLength: 8.5, woundWidth: 6.5, woundDepth: 1.4,
            tissueTypes: ['fibrina', 'esfacelo', 'necrosis'],
            edgeTypes: ['irregular', 'enrollado'],
            exudateAmount: 'abundante', exudateType: 'serosanguinolento', exudateColor: 'amarillo',
            hasInfectionSigns: true, infMalOlor: true, infBiofilm: true,
            bodyTemperature: 37.2,
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
        status: 'en_mejoria',
        woundLength: 3, woundWidth: 2.5, woundDepth: 0.8,
        tissueTypes: ['granulacion', 'fibrina'],
        edgeTypes: ['regular'],
        exudateAmount: 'escaso', exudateType: 'seroso', exudateColor: 'amarillo',
        painLevel: 3, odor: 'sin_olor',
        hasInfectionSigns: false,
        healingFrequency: 'Cada 72hs',
        initialProcedure: 'Curación con cadexómero iodado. Apósito no adherente. Descarga con bota Walker.',
        initialMaterials: 'Cadexómero iodado (Iodosorb), apósito no adherente Mepitel, venda de fijación, bota Walker',
        initialObservations: 'Wagner grado 2. Control glucémico estricto. HbA1c 7.8%.',
        treatment: 'Descarga con bota Walker. Curación con cadexómero iodado. Control glucémico estricto.',
        size: '3 x 2.5 cm', depth: 'Wagner grado 2', exudate: 'Escaso, seroso',
        infection: 'Colonización bacteriana controlada', pain: 'EVA 3/10 - Neuropatía periférica',
        evolutions: [
          {
            id: 'e4-t2',
            date: '2026-05-01',
            time: '11:00',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-01', photos: [],
          },
          {
            id: 'e4-t1',
            date: '2026-04-28',
            time: '11:00',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-28', photos: [],
          },
          {
            id: 'e4',
            date: '2026-03-19',
            time: '11:00',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Reducción notable del diámetro. Tejido de granulación sano. Sin signos de infección.',
            procedure: 'Curación con cadexómero iodado. Apósito no adherente. Refuerzo de descarga.',
            materials: 'Cadexómero iodado (Iodosorb), apósito no adherente Mepitel, venda de fijación',
            healingFrequency: 'Cada 72hs', healingFrequencyDays: 3,
            observations: 'HbA1c mejoró a 7.2%. Paciente cumple con descarga.',
            nextControl: '2026-03-26',
            painLevel: 3, odor: 'sin_olor', evolutionStatus: 'mejoria_progresiva',
            woundLength: 2.8, woundWidth: 2.2, woundDepth: 0.6,
            tissueTypes: ['granulacion', 'epitelizacion'],
            edgeTypes: ['regular'],
            exudateAmount: 'escaso', exudateType: 'seroso', exudateColor: 'transparente',
            hasInfectionSigns: false, bodyTemperature: 36.7,
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
    diagnosis: 'Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares de safena interna izquierda.',
    assignedProfessional: 'Lic. Ana Martínez',
    observations: 'Paciente ambulatoria. Buena adherencia al tratamiento compresivo. Vive sola, hija con visitas frecuentes.',
    admissionDate: '2025-12-01',
    controlIntervalDays: 7,
    allergies: 'Sin alergias conocidas',
    insurance: 'OSDE 210',
    emergencyContactName: 'Lucía Vázquez (hija)',
    emergencyContactPhone: '+54 11 5678-1235',
    cases: [
      {
        id: 'c3',
        patientId: 'p2',
        woundType: 'Úlcera venosa',
        anatomicalLocation: 'Pierna izquierda - Zona maleolar interna',
        startDate: '2025-12-05',
        status: 'critico',
        woundLength: 12, woundWidth: 8, woundDepth: 0.5,
        tissueTypes: ['fibrina', 'esfacelo'],
        edgeTypes: ['irregular', 'macerado', 'eritematoso'],
        exudateAmount: 'abundante', exudateType: 'serosanguinolento', exudateColor: 'rojo',
        painLevel: 7, odor: 'moderado',
        hasInfectionSigns: true, infMalOlor: true, infBiofilm: true, infPurulenta: false,
        bodyTemperature: 37.4,
        healingFrequency: 'Cada 48hs',
        initialProcedure: 'Desbridamiento con hidrofibra. Apósito de alginato con plata iónica. Vendaje compresivo multicapa.',
        initialMaterials: 'Hidrofibra Aquacel Ag+, alginato con plata, vendaje compresivo Profore, protector cutáneo',
        initialObservations: 'Dermatitis ocre y lipodermatoesclerosis perilesional. Eco Doppler venoso solicitado.',
        treatment: 'Terapia compresiva multicapa. Apósito de alginato + plata. Elevación de MMII.',
        size: '12 x 8 cm', depth: 'Superficial con bordes irregulares',
        exudate: 'Abundante, serohemático', infection: 'Biofilm bacteriano detectado',
        pain: 'EVA 7/10 - Dolor intenso al reposo',
        evolutions: [
          {
            id: 'e5-t3',
            date: '2026-05-08',
            time: '14:30',
            professional: 'Lic. Ana Martínez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-08', photos: [],
          },
          {
            id: 'e5-t2',
            date: '2026-05-01',
            time: '14:30',
            professional: 'Lic. Ana Martínez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-01', photos: [],
          },
          {
            id: 'e5-t1',
            date: '2026-04-24',
            time: '14:30',
            professional: 'Lic. Ana Martínez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-24', photos: [],
          },
          {
            id: 'e5',
            date: '2026-03-20',
            time: '14:30',
            professional: 'Lic. Ana Martínez',
            description: 'Úlcera extensa con lecho predominantemente fibrinoso. Exudado abundante. Piel perilesional con dermatitis ocre y lipodermatoesclerosis.',
            procedure: 'Desbridamiento con fibras de hidrofibra. Aplicación de apósito de alginato con plata iónica. Vendaje compresivo multicapa.',
            materials: 'Hidrofibra Aquacel Ag+, apósito de alginato con plata, vendaje compresivo multicapa (Profore), protector cutáneo',
            healingFrequency: 'Cada 48hs', healingFrequencyDays: 2,
            observations: 'Se solicita eco Doppler venoso de control. Dolor mal controlado, se ajusta analgesia.',
            nextControl: '2026-03-23',
            painLevel: 7, odor: 'moderado', evolutionStatus: 'tratamiento_activo',
            woundLength: 12, woundWidth: 8, woundDepth: 0.5,
            tissueTypes: ['fibrina', 'esfacelo'],
            edgeTypes: ['irregular', 'macerado', 'eritematoso'],
            exudateAmount: 'abundante', exudateType: 'serosanguinolento', exudateColor: 'rojo',
            hasInfectionSigns: true, infMalOlor: true, infBiofilm: true, infEritema: true, infDolorAumentado: true,
            bodyTemperature: 37.4,
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
    diagnosis: 'Post-operatorio de cirugía abdominal compleja (resección intestinal). Tabaquismo activo (20 cig/día). Sobrepeso. Sin otras comorbilidades relevantes.',
    assignedProfessional: 'Dr. Roberto Sánchez',
    observations: 'Paciente con dehiscencia parcial de herida quirúrgica. Vive con su pareja. Se trabaja deshabituación tabáquica.',
    admissionDate: '2026-02-20',
    controlIntervalDays: 5,
    allergies: 'Látex (urticaria leve)',
    insurance: 'Swiss Medical SMG30',
    emergencyContactName: 'Andrea Sosa (pareja)',
    emergencyContactPhone: '+54 11 3456-7891',
    cases: [
      {
        id: 'c4',
        patientId: 'p3',
        woundType: 'Herida quirúrgica',
        anatomicalLocation: 'Abdomen - Línea media infraumbilical',
        startDate: '2026-02-25',
        status: 'activo',
        woundLength: 15, woundWidth: 4, woundDepth: 2.5,
        tissueTypes: ['granulacion', 'fibrina'],
        edgeTypes: ['irregular', 'eritematoso'],
        exudateAmount: 'moderado', exudateType: 'purulento', exudateColor: 'amarillo',
        painLevel: 6, odor: 'leve',
        hasInfectionSigns: true, infEritema: true, infCalor: true, infPurulenta: true,
        bodyTemperature: 37.8,
        healingFrequency: 'Diaria',
        initialProcedure: 'Irrigación con PHMB. Packing con gasa húmeda. Apósito secundario absorbente.',
        initialMaterials: 'PHMB (Prontosan), gasas húmedas estériles, apósito absorbente, cinta hipoalergénica',
        initialObservations: 'Dehiscencia 6cm. ATB sistémico (Cefalotina). Cultivo: S. aureus MSSA. VAC therapy en evaluación.',
        treatment: 'ATB sistémico (Cefalotina). Curación con PHMB. VAC therapy en evaluación.',
        size: '15 x 4 cm (dehiscencia de 6 cm)', depth: 'Hasta fascia muscular visible',
        exudate: 'Moderado, seropurulento',
        infection: 'Infección de sitio quirúrgico superficial - Cultivo: S. aureus MSSA',
        pain: 'EVA 6/10',
        evolutions: [
          {
            id: 'e6-t3',
            date: '2026-05-09',
            time: '16:00',
            professional: 'Dr. Roberto Sánchez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-09', photos: [],
          },
          {
            id: 'e6-t2',
            date: '2026-05-04',
            time: '16:00',
            professional: 'Dr. Roberto Sánchez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-04', photos: [],
          },
          {
            id: 'e6-t1',
            date: '2026-04-29',
            time: '16:00',
            professional: 'Dr. Roberto Sánchez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-29', photos: [],
          },
          {
            id: 'e6',
            date: '2026-03-19',
            time: '16:00',
            professional: 'Dr. Roberto Sánchez',
            description: 'Dehiscencia con signos de infección en resolución. Cultivo de control pendiente. Tejido de granulación incipiente en fondo.',
            procedure: 'Irrigación con PHMB. Packing con gasa húmeda. Apósito secundario absorbente.',
            materials: 'PHMB (Prontosan), gasas húmedas estériles, apósito absorbente secundario, cinta hipoalergénica',
            healingFrequency: 'Diaria', healingFrequencyDays: 1,
            observations: 'Completó 10 días de ATB. Mejoría clínica. Se evalúa VAC therapy para próxima semana.',
            nextControl: '2026-03-22',
            painLevel: 6, odor: 'leve', evolutionStatus: 'mejoria_progresiva',
            woundLength: 14, woundWidth: 3.5, woundDepth: 2.2,
            tissueTypes: ['granulacion', 'fibrina'],
            edgeTypes: ['irregular', 'eritematoso'],
            exudateAmount: 'moderado', exudateType: 'purulento', exudateColor: 'amarillo',
            hasInfectionSigns: true, infEritema: true, infCalor: true, infPurulenta: true,
            bodyTemperature: 37.6,
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
    diagnosis: 'Sin comorbilidades relevantes. No fumadora. Quemadura por accidente doméstico (agua hirviente).',
    assignedProfessional: 'Lic. Laura Fernández',
    observations: 'Paciente activa, ambulatoria. Excelente adherencia. Vive con su familia.',
    admissionDate: '2026-03-01',
    controlIntervalDays: 4,
    allergies: 'Sin alergias conocidas',
    insurance: 'Galeno Plata',
    emergencyContactName: 'Pablo Gutiérrez (esposo)',
    emergencyContactPhone: '+54 11 6789-0124',
    cases: [
      {
        id: 'c5',
        patientId: 'p4',
        woundType: 'Quemadura',
        anatomicalLocation: 'Antebrazo derecho - Cara anterior',
        startDate: '2026-03-01',
        status: 'en_mejoria',
        woundLength: 10, woundWidth: 7, woundDepth: 0.3,
        tissueTypes: ['epitelizacion', 'granulacion'],
        edgeTypes: ['regular'],
        exudateAmount: 'moderado', exudateType: 'seroso', exudateColor: 'transparente',
        painLevel: 8, odor: 'sin_olor',
        hasInfectionSigns: false,
        healingFrequency: 'Cada 72hs',
        initialProcedure: 'Limpieza con SF tibia. Sulfadiazina de plata + apósito de silicona no adherente.',
        initialMaterials: 'Solución fisiológica tibia, sulfadiazina de plata, apósito de silicona Mepitel One, gasas',
        initialObservations: 'Quemadura por agua hirviente. Analgesia pautada (paracetamol + tramadol). Sin ampollas residuales.',
        treatment: 'Sulfadiazina de plata. Apósito de silicona no adherente. Analgesia pautada.',
        size: '10 x 7 cm', depth: 'Segundo grado superficial (ABA)',
        exudate: 'Seroso, moderado', infection: 'Sin signos de infección',
        pain: 'EVA 8/10 - Muy doloroso',
        evolutions: [
          {
            id: 'e7-t3',
            date: '2026-05-06',
            time: '09:00',
            professional: 'Lic. Laura Fernández',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-06', photos: [],
          },
          {
            id: 'e7-t2',
            date: '2026-05-02',
            time: '09:00',
            professional: 'Lic. Laura Fernández',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-02', photos: [],
          },
          {
            id: 'e7-t1',
            date: '2026-04-28',
            time: '09:00',
            professional: 'Lic. Laura Fernández',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-28', photos: [],
          },
          {
            id: 'e7',
            date: '2026-03-20',
            time: '09:00',
            professional: 'Lic. Laura Fernández',
            description: 'Reepitelización del 70%. Bordes de la quemadura con piel rosada nueva. Sin ampollas residuales.',
            procedure: 'Limpieza suave. Aplicación de crema hidratante + protector solar. Apósito de silicona.',
            materials: 'Solución fisiológica, crema hidratante con aloe vera, protector solar SPF50, apósito de silicona Mepiform',
            healingFrequency: 'Cada 72hs', healingFrequencyDays: 3,
            observations: 'Excelente evolución. Se inicia prevención de cicatriz hipertrófica con silicona.',
            nextControl: '2026-03-27',
            painLevel: 4, odor: 'sin_olor', evolutionStatus: 'mejoria_progresiva',
            woundLength: 7, woundWidth: 5, woundDepth: 0.1,
            tissueTypes: ['epitelizacion', 'granulacion'],
            edgeTypes: ['regular'],
            exudateAmount: 'escaso', exudateType: 'seroso', exudateColor: 'transparente',
            hasInfectionSigns: false, bodyTemperature: 36.5,
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
    diagnosis: 'Politraumatismo por accidente de tránsito en moto. Sin comorbilidades de base. Joven previamente sano.',
    assignedProfessional: 'Dr. Carlos Rodríguez',
    observations: 'Paciente joven con buena capacidad de cicatrización. Convive con familia. En licencia laboral durante recuperación.',
    admissionDate: '2026-02-15',
    controlIntervalDays: 5,
    allergies: 'Iodopovidona (irritación local)',
    insurance: 'Particular',
    emergencyContactName: 'Mariana Domínguez (madre)',
    emergencyContactPhone: '+54 11 7890-1235',
    cases: [
      {
        id: 'c6',
        patientId: 'p5',
        woundType: 'Lesión traumática',
        anatomicalLocation: 'Muslo izquierdo - Cara lateral',
        startDate: '2026-02-15',
        status: 'en_mejoria',
        woundLength: 18, woundWidth: 12, woundDepth: 1.5,
        tissueTypes: ['granulacion'],
        edgeTypes: ['regular'],
        exudateAmount: 'moderado', exudateType: 'seroso', exudateColor: 'transparente',
        painLevel: 4, odor: 'sin_olor',
        hasInfectionSigns: false,
        healingFrequency: 'Cada 48hs',
        initialProcedure: 'Terapia de presión negativa (VAC). Cambio de esponja según protocolo.',
        initialMaterials: 'Sistema VAC, esponja de polivinilo, film adhesivo, canister de drenaje',
        initialObservations: 'Politraumatismo en moto. Injerto de piel parcial planificado para 25/03. Excelente evolución.',
        treatment: 'Terapia de presión negativa (VAC) + injerto de piel parcial planificado.',
        size: '18 x 12 cm', depth: 'Pérdida parcial de espesor con exposición de tejido subcutáneo',
        exudate: 'Abundante los primeros días, actualmente moderado seroso',
        infection: 'Infección controlada tras tratamiento con ATB',
        pain: 'EVA 4/10 - En descenso',
        evolutions: [
          {
            id: 'e8-t3',
            date: '2026-05-08',
            time: '15:30',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-08', photos: [],
          },
          {
            id: 'e8-t2',
            date: '2026-05-03',
            time: '15:30',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-05-03', photos: [],
          },
          {
            id: 'e8-t1',
            date: '2026-04-26',
            time: '15:30',
            professional: 'Dr. Carlos Rodríguez',
            description: 'Turno programado',
            procedure: '', materials: '', healingFrequency: '', observations: '',
            nextControl: '2026-04-26', photos: [],
          },
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
    diagnosis: 'Paciente geriátrica encamada. Deterioro cognitivo leve (demencia mixta). Hipertensión arterial. Insuficiencia cardíaca clase II. Múltiples úlceras por presión.',
    assignedProfessional: 'Lic. María González',
    observations: 'Cuidadora principal: hija. Requiere seguimiento domiciliario intensivo. Cama articulada y colchón antiescaras instalados.',
    admissionDate: '2025-10-10',
    controlIntervalDays: 2,
    allergies: 'AINEs (intolerancia gástrica)',
    insurance: 'PAMI',
    emergencyContactName: 'Mónica Pellegrini (hija)',
    emergencyContactPhone: '+54 221 234-5678',
    cases: [
      {
        id: 'c7',
        patientId: 'p6',
        woundType: 'Úlcera por presión',
        anatomicalLocation: 'Talón derecho',
        startDate: '2025-10-15',
        status: 'resuelto',
        woundLength: 4, woundWidth: 3, woundDepth: 0.2,
        tissueTypes: ['epitelizacion'],
        edgeTypes: ['regular'],
        exudateAmount: 'sin_exudado',
        painLevel: 2, odor: 'sin_olor',
        hasInfectionSigns: false,
        healingFrequency: 'Semanal',
        initialProcedure: 'Apósito hidrocoloide. Protección de talones con taloneras.',
        initialMaterials: 'Hidrocoloide fino, talonera preventiva, crema hidratante',
        initialObservations: 'Estadio II. Caso resuelto el 28/02/2026. Continúa con medidas preventivas.',
        treatment: 'Apósito hidrocoloide. Protección de talones con taloneras.',
        size: '4 x 3 cm', depth: 'Estadio II', exudate: 'Escaso',
        infection: 'Sin infección', pain: 'EVA 2/10',
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
