-- Idempotent clinical seed for demo patients
CREATE OR REPLACE FUNCTION public.seed_demo_clinical_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  case_id uuid;
  base_date date;
  prof text;
  spec RECORD;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('Juan Carlos','Pérez',         'Úlcera por presión',  'Sacro',                                  'Lic. María González', 3, 'activo'::text),
      ('Marta','Vázquez',             'Úlcera venosa',       'Maléolo interno pierna izquierda',       'Lic. Ana Martínez',   7, 'en_mejoria'::text),
      ('Ricardo','López',             'Herida quirúrgica',   'Pared abdominal — línea media',          'Dr. Roberto Sánchez', 5, 'activo'::text),
      ('Lucía','Fernández',           'Pie diabético',       'Pie derecho — zona plantar metatarsiana','Dr. Carlos Rodríguez',3, 'critico'::text)
    ) AS t(first_name, last_name, wound_type, location, professional, freq_days, status)
  LOOP
    SELECT * INTO p FROM public.patients
    WHERE user_id = _user_id
      AND first_name = spec.first_name
      AND last_name  = spec.last_name
    LIMIT 1;

    IF p.id IS NULL THEN CONTINUE; END IF;

    -- Skip if patient already has cases (idempotent)
    IF EXISTS (SELECT 1 FROM public.wound_cases WHERE patient_id = p.id) THEN
      CONTINUE;
    END IF;

    base_date := COALESCE(p.admission_date, current_date - INTERVAL '60 days')::date + 5;
    prof := spec.professional;

    -- Create wound case
    INSERT INTO public.wound_cases (
      user_id, patient_id, wound_type, anatomical_location, start_date, status,
      size, depth, exudate, infection, pain, treatment
    ) VALUES (
      _user_id, p.id, spec.wound_type, spec.location, base_date, spec.status,
      CASE spec.wound_type
        WHEN 'Úlcera por presión' THEN '8 x 6 cm'
        WHEN 'Úlcera venosa' THEN '5 x 4 cm'
        WHEN 'Herida quirúrgica' THEN '12 x 0.5 cm'
        WHEN 'Pie diabético' THEN '3 x 2.5 cm'
      END,
      CASE spec.wound_type
        WHEN 'Úlcera por presión' THEN 'Estadio III'
        WHEN 'Úlcera venosa' THEN 'Superficial'
        WHEN 'Herida quirúrgica' THEN 'Dehiscencia parcial'
        WHEN 'Pie diabético' THEN 'Profunda — Wagner 2'
      END,
      'Moderado, seroso',
      CASE WHEN spec.status = 'critico' THEN 'Signos de infección local' ELSE 'Sin signos de infección actual' END,
      'EVA 5/10',
      'Limpieza con solución fisiológica + apósito de espuma. Control programado.'
    ) RETURNING id INTO case_id;

    -- 3 evolutions, most recent first
    INSERT INTO public.evolutions (
      user_id, case_id, evolution_date, evolution_time, professional,
      description, procedure, materials, healing_frequency, observations, next_control
    ) VALUES
    (_user_id, case_id, current_date - 1, '09:30', prof,
      'Lecho de herida con buena perfusión. Tejido de granulación 70%, fibrina 20%, epitelización 10%. Bordes definidos sin maceración.',
      'Limpieza con solución fisiológica tibia. Aplicación de apósito de espuma multicapa. Vendaje secundario.',
      'Solución fisiológica, apósito de espuma Mepilex Border, gasas estériles, cinta microporosa',
      'Cada ' || spec.freq_days || ' días',
      'Paciente refiere menor dolor. Se mantiene protocolo. Buena adherencia familiar a cuidados.',
      current_date + spec.freq_days),
    (_user_id, case_id, current_date - spec.freq_days - 1, '10:00', prof,
      'Reducción del área de fibrina respecto a control previo. Granulación progresando desde los bordes. Sin signos de infección.',
      'Irrigación con solución fisiológica. Desbridamiento autolítico con hidrogel. Apósito secundario absorbente.',
      'Solución fisiológica, hidrogel amorfo, apósito secundario absorbente',
      'Cada ' || spec.freq_days || ' días',
      'Evolución favorable. Continuar protocolo actual. Refuerzo educativo a cuidador.',
      current_date - 1),
    (_user_id, case_id, base_date, '08:45', 'Dr. Carlos Rodríguez',
      'Primera evaluación. ' || spec.wound_type || ' con presencia de fibrina y esfacelo. Bordes irregulares.',
      'Desbridamiento cortante de tejido desvitalizado. Toma de cultivo. Inicio de protocolo de curación avanzada.',
      'Bisturí estéril, hisopo para cultivo, solución fisiológica, gasas, apósito de espuma',
      'Diaria',
      'Se solicita interconsulta con nutrición. Educación sobre signos de alarma al cuidador.',
      current_date - spec.freq_days - 1);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_clinical_for_user(uuid) FROM PUBLIC, anon, authenticated;

-- Update existing patient seeder to also seed clinical data
CREATE OR REPLACE FUNCTION public.seed_demo_patients_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patients (user_id, first_name, last_name, age, gender, dni, phone, email, address, diagnosis, assigned_professional, observations, admission_date, control_interval_days)
  VALUES
    (NEW.user_id, 'Juan Carlos', 'Pérez', 72, 'Masculino', '12.345.678', '+54 11 4567-8901', 'jc.perez@email.com', 'Av. Corrientes 1234, CABA',
      'Diabetes mellitus tipo 2 con complicaciones vasculares. HTA. Movilidad reducida tras ACV isquémico (2023).',
      'Lic. María González', 'Paciente con buena adherencia. Vive con su esposa. Riesgo alto de UPP.', current_date - 90, 3),
    (NEW.user_id, 'Marta', 'Vázquez', 65, 'Femenino', '18.765.432', '+54 11 5678-1234', 'marta.vazquez@email.com', 'Calle Florida 567, CABA',
      'Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares.',
      'Lic. Ana Martínez', 'Paciente ambulatoria. Buena adherencia al tratamiento compresivo.', current_date - 120, 7),
    (NEW.user_id, 'Ricardo', 'López', 45, 'Masculino', '24.567.890', '+54 11 3456-7890', 'ricardo.lopez@email.com', 'Av. Rivadavia 8901, CABA',
      'Post-operatorio de cirugía abdominal compleja. Tabaquismo activo. Sobrepeso.',
      'Dr. Roberto Sánchez', 'Dehiscencia parcial de herida quirúrgica. Deshabituación tabáquica en curso.', current_date - 45, 5),
    (NEW.user_id, 'Lucía', 'Fernández', 58, 'Femenino', '20.123.456', '+54 11 6789-2345', 'lucia.fernandez@email.com', 'Av. Santa Fe 2345, CABA',
      'Pie diabético con neuropatía periférica severa. DBT2 mal controlada.',
      'Dr. Carlos Rodríguez', 'Riesgo de amputación. Educación intensiva sobre cuidado de pies.', current_date - 60, 3),
    (NEW.user_id, 'Roberto', 'Méndez', 70, 'Masculino', '10.987.654', '+54 11 7890-3456', 'roberto.mendez@email.com', 'Av. Cabildo 4567, CABA',
      'Lesión por presión en talón izquierdo. Inmovilidad por fractura de cadera.',
      'Lic. María González', 'En domicilio con cuidador. Colchón antiescaras.', current_date - 30, 4),
    (NEW.user_id, 'Patricia', 'Gómez', 52, 'Femenino', '22.345.678', '+54 11 8901-4567', 'patricia.gomez@email.com', 'Av. Las Heras 3456, CABA',
      'Quemadura de segundo grado en antebrazo derecho. Accidente doméstico.',
      'Lic. Ana Martínez', 'Buena evolución. Cuidados domiciliarios.', current_date - 20, 7);

  -- Seed clinical data (cases + evolutions) for 4 of those patients
  PERFORM public.seed_demo_clinical_for_user(NEW.user_id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;