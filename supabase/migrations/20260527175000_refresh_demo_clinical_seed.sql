-- Refresh deterministic demo seed for clinical dashboard consistency
CREATE OR REPLACE FUNCTION public.seed_demo_clinical_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  case_id uuid;
  prof text;
  demo_lab_id uuid;
  spec RECORD;
BEGIN
  -- Reset clinical seed for demo cohort to keep deterministic behavior
  DELETE FROM public.evolutions e
  USING public.wound_cases wc, public.patients p2
  WHERE e.case_id = wc.id
    AND wc.patient_id = p2.id
    AND p2.user_id = _user_id
    AND (p2.first_name, p2.last_name) IN (
      ('Juan Carlos', 'Pérez'),
      ('Marta', 'Vázquez'),
      ('Ricardo', 'López'),
      ('Lucía', 'Fernández'),
      ('Roberto', 'Méndez')
    );

  DELETE FROM public.wound_cases wc
  USING public.patients p2
  WHERE wc.patient_id = p2.id
    AND p2.user_id = _user_id
    AND (p2.first_name, p2.last_name) IN (
      ('Juan Carlos', 'Pérez'),
      ('Marta', 'Vázquez'),
      ('Ricardo', 'López'),
      ('Lucía', 'Fernández'),
      ('Roberto', 'Méndez')
    );

  FOR spec IN
    SELECT * FROM (VALUES
      -- 4 activos + 1 resuelto
      ('Juan Carlos','Pérez',   'Úlcera por presión',  'Sacro',                                  'Lic. María González', 3, 'activo'::text,     true,  true),
      ('Marta','Vázquez',       'Úlcera venosa',       'Maléolo interno pierna izquierda',       'Lic. Ana Martínez',   7, 'en_mejoria'::text, true,  false),
      ('Ricardo','López',       'Herida quirúrgica',   'Pared abdominal — línea media',          'Dr. Roberto Sánchez', 5, 'activo'::text,     true,  false),
      ('Lucía','Fernández',     'Pie diabético',       'Pie derecho — zona plantar metatarsiana','Dr. Carlos Rodríguez',3, 'critico'::text,    false, true),
      ('Roberto','Méndez',      'Úlcera por presión',  'Talón izquierdo',                         'Lic. María González', 6, 'resuelto'::text,   false, false)
    ) AS t(first_name, last_name, wound_type, location, professional, freq_days, status, has_today_slot, has_overdue)
  LOOP
    SELECT * INTO p FROM public.patients
    WHERE user_id = _user_id
      AND first_name = spec.first_name
      AND last_name  = spec.last_name
    LIMIT 1;

    IF p.id IS NULL THEN
      CONTINUE;
    END IF;

    prof := spec.professional;

    INSERT INTO public.wound_cases (
      user_id, patient_id, wound_type, anatomical_location, start_date, status,
      size, depth, exudate, infection, pain, treatment
    ) VALUES (
      _user_id, p.id, spec.wound_type, spec.location, current_date - 30, spec.status,
      CASE spec.wound_type
        WHEN 'Úlcera por presión' THEN '8 x 6 cm'
        WHEN 'Úlcera venosa' THEN '5 x 4 cm'
        WHEN 'Herida quirúrgica' THEN '12 x 0.5 cm'
        WHEN 'Pie diabético' THEN '3 x 2.5 cm'
        ELSE '4 x 3 cm'
      END,
      CASE spec.wound_type
        WHEN 'Úlcera por presión' THEN 'Estadio III'
        WHEN 'Úlcera venosa' THEN 'Superficial'
        WHEN 'Herida quirúrgica' THEN 'Dehiscencia parcial'
        WHEN 'Pie diabético' THEN 'Profunda — Wagner 2'
        ELSE 'Superficial'
      END,
      CASE WHEN spec.status = 'critico' THEN 'Moderado a abundante' ELSE 'Moderado, seroso' END,
      CASE WHEN spec.status = 'critico' THEN 'Signos de infección local' ELSE 'Sin signos de infección actual' END,
      CASE WHEN spec.status = 'critico' THEN 'EVA 7/10' ELSE 'EVA 4/10' END,
      'Limpieza con solución fisiológica + apósito de espuma. Control programado.'
    ) RETURNING id INTO case_id;

    -- Evolution 1 (reciente, agenda cercana)
    INSERT INTO public.evolutions (
      user_id, case_id, evolution_date, evolution_time, professional,
      description, procedure, materials, healing_frequency, observations, next_control
    ) VALUES (
      _user_id, case_id, current_date - 1, '09:30', prof,
      'Control evolutivo reciente. Lecho con mejor perfusión y menor exudado.',
      'Limpieza con solución fisiológica tibia. Aplicación de apósito avanzado.',
      'Solución fisiológica, apósito de espuma multicapa, gasas estériles',
      'Cada ' || spec.freq_days || ' días',
      'Buena adherencia al plan terapéutico.',
      CASE
        WHEN spec.has_today_slot THEN current_date
        WHEN spec.status = 'resuelto' THEN current_date + 5
        ELSE current_date + 2
      END
    );

    -- Evolution 2 (control previo, puede dejar vencido)
    INSERT INTO public.evolutions (
      user_id, case_id, evolution_date, evolution_time, professional,
      description, procedure, materials, healing_frequency, observations, next_control
    ) VALUES (
      _user_id, case_id, current_date - 4, '10:15', prof,
      'Curación intermedia con seguimiento de bordes y tejido.',
      'Irrigación con solución fisiológica. Desbridamiento autolítico según necesidad.',
      'Solución fisiológica, hidrogel amorfo, apósito secundario absorbente',
      'Cada ' || spec.freq_days || ' días',
      'Evolución estable. Reevaluar en control próximo.',
      CASE
        WHEN spec.has_overdue THEN current_date - 2
        ELSE current_date + 7
      END
    );

    -- Evolution 3 (rango 7-14 días)
    INSERT INTO public.evolutions (
      user_id, case_id, evolution_date, evolution_time, professional,
      description, procedure, materials, healing_frequency, observations, next_control
    ) VALUES (
      _user_id, case_id, current_date - 10, '08:45', prof,
      'Evolución basal del período demo con registro completo.',
      'Evaluación integral del lecho, limpieza y curación protocolizada.',
      'Bisturí estéril, solución fisiológica, gasas, apósito de espuma',
      'Cada ' || spec.freq_days || ' días',
      'Sin eventos adversos. Continuar protocolo.',
      current_date + 10
    );
  END LOOP;

  -- Deterministic supply orders for dashboard KPI consistency
  SELECT id INTO demo_lab_id
  FROM public.labs
  WHERE slug = 'demo'
  LIMIT 1;

  INSERT INTO public.supply_orders (
    order_number, user_id, lab_id, status, professional_name, institution,
    general_wound_type, clinical_recommendation, commercial_notes, estimated_total, currency
  )
  VALUES
    ('DEMO-' || left(_user_id::text, 8) || '-001', _user_id, demo_lab_id, 'borrador', 'Lic. María González', 'CuraTrack Demo', 'Úlcera por presión', 'Mantener apósitos de espuma multicapa', 'Pedido demo pendiente #1', 145000, 'ARS'),
    ('DEMO-' || left(_user_id::text, 8) || '-002', _user_id, demo_lab_id, 'borrador', 'Dr. Carlos Rodríguez', 'CuraTrack Demo', 'Pie diabético', 'Reponer hidrogel y antisépticos', 'Pedido demo pendiente #2', 98000, 'ARS'),
    ('DEMO-' || left(_user_id::text, 8) || '-003', _user_id, demo_lab_id, 'enviado', 'Lic. Ana Martínez', 'CuraTrack Demo', 'Úlcera venosa', 'Continuar terapia compresiva', 'Pedido demo enviado', 76000, 'ARS')
  ON CONFLICT (order_number) DO UPDATE
  SET
    status = EXCLUDED.status,
    clinical_recommendation = EXCLUDED.clinical_recommendation,
    commercial_notes = EXCLUDED.commercial_notes,
    estimated_total = EXCLUDED.estimated_total,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_clinical_for_user(uuid) FROM PUBLIC, anon, authenticated;

-- Keep trigger-based patient seeding aligned with 10 deterministic demo patients
CREATE OR REPLACE FUNCTION public.seed_demo_patients_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patients (user_id, first_name, last_name, age, gender, dni, phone, email, address, diagnosis, assigned_professional, observations, admission_date, control_interval_days)
  VALUES
    (NEW.user_id, 'Juan Carlos', 'Pérez', 72, 'Masculino', '12.345.678', '+54 11 4567-8901', 'jc.perez@email.com', 'Av. Corrientes 1234, CABA', 'Diabetes mellitus tipo 2 con complicaciones vasculares. HTA. Movilidad reducida tras ACV isquémico (2023).', 'Lic. María González', 'Paciente con buena adherencia. Vive con su esposa. Riesgo alto de UPP.', current_date - 90, 3),
    (NEW.user_id, 'Marta', 'Vázquez', 65, 'Femenino', '18.765.432', '+54 11 5678-1234', 'marta.vazquez@email.com', 'Calle Florida 567, CABA', 'Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares.', 'Lic. Ana Martínez', 'Paciente ambulatoria. Buena adherencia al tratamiento compresivo.', current_date - 120, 7),
    (NEW.user_id, 'Ricardo', 'López', 45, 'Masculino', '24.567.890', '+54 11 3456-7890', 'ricardo.lopez@email.com', 'Av. Rivadavia 8901, CABA', 'Post-operatorio de cirugía abdominal compleja. Tabaquismo activo. Sobrepeso.', 'Dr. Roberto Sánchez', 'Dehiscencia parcial de herida quirúrgica. Deshabituación tabáquica en curso.', current_date - 45, 5),
    (NEW.user_id, 'Lucía', 'Fernández', 58, 'Femenino', '20.123.456', '+54 11 6789-2345', 'lucia.fernandez@email.com', 'Av. Santa Fe 2345, CABA', 'Pie diabético con neuropatía periférica severa. DBT2 mal controlada.', 'Dr. Carlos Rodríguez', 'Riesgo de amputación. Educación intensiva sobre cuidado de pies.', current_date - 60, 3),
    (NEW.user_id, 'Roberto', 'Méndez', 70, 'Masculino', '10.987.654', '+54 11 7890-3456', 'roberto.mendez@email.com', 'Av. Cabildo 4567, CABA', 'Lesión por presión en talón izquierdo. Inmovilidad por fractura de cadera.', 'Lic. María González', 'En domicilio con cuidador. Colchón antiescaras.', current_date - 30, 4),
    (NEW.user_id, 'Patricia', 'Gómez', 52, 'Femenino', '22.345.678', '+54 11 8901-4567', 'patricia.gomez@email.com', 'Av. Las Heras 3456, CABA', 'Quemadura de segundo grado en antebrazo derecho. Accidente doméstico.', 'Lic. Ana Martínez', 'Buena evolución. Cuidados domiciliarios.', current_date - 20, 7),
    (NEW.user_id, 'Silvia', 'Acosta', 67, 'Femenino', '16.778.901', '+54 11 4788-3321', 'silvia.acosta@email.com', 'Belgrano 1550, CABA', 'Insuficiencia arterial periférica en seguimiento.', 'Lic. Laura Fernández', 'Control ambulatorio mensual.', current_date - 18, 10),
    (NEW.user_id, 'Gabriel', 'Suárez', 49, 'Masculino', '26.554.219', '+54 11 4366-8812', 'gabriel.suarez@email.com', 'Boedo 944, CABA', 'Herida traumática en evolución favorable.', 'Dr. Roberto Sánchez', 'Cumple indicaciones domiciliarias.', current_date - 26, 6),
    (NEW.user_id, 'Nora', 'Benítez', 74, 'Femenino', '11.908.445', '+54 11 4992-7301', 'nora.benitez@email.com', 'San Cristóbal 220, CABA', 'Paciente frágil con riesgo de UPP.', 'Lic. María González', 'Seguimiento preventivo.', current_date - 34, 5),
    (NEW.user_id, 'Eduardo', 'Paredes', 61, 'Masculino', '14.772.630', '+54 11 4123-1004', 'eduardo.paredes@email.com', 'Parque Chacabuco 842, CABA', 'Postquirúrgico sin complicaciones activas.', 'Dr. Carlos Rodríguez', 'Controles periódicos.', current_date - 12, 8);

  PERFORM public.seed_demo_clinical_for_user(NEW.user_id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
