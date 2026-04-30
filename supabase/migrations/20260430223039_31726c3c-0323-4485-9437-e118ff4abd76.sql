-- Function to seed demo patients for a newly registered user
CREATE OR REPLACE FUNCTION public.seed_demo_patients_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patients (user_id, first_name, last_name, age, gender, dni, phone, email, address, diagnosis, assigned_professional, observations, admission_date, control_interval_days)
  VALUES
    (NEW.user_id, 'Juan Carlos', 'Pérez', 72, 'Masculino', '12.345.678', '+54 11 4567-8901', 'jc.perez@email.com', 'Av. Corrientes 1234, CABA',
      'Diabetes mellitus tipo 2 con complicaciones vasculares. HTA. Movilidad reducida tras ACV isquémico (2023).',
      'Lic. María González', 'Paciente con buena adherencia. Vive con su esposa. Riesgo alto de UPP.', '2026-01-15', 3),
    (NEW.user_id, 'Marta', 'Vázquez', 65, 'Femenino', '18.765.432', '+54 11 5678-1234', 'marta.vazquez@email.com', 'Calle Florida 567, CABA',
      'Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares.',
      'Lic. Ana Martínez', 'Paciente ambulatoria. Buena adherencia al tratamiento compresivo.', '2025-12-01', 7),
    (NEW.user_id, 'Ricardo', 'López', 45, 'Masculino', '24.567.890', '+54 11 3456-7890', 'ricardo.lopez@email.com', 'Av. Rivadavia 8901, CABA',
      'Post-operatorio de cirugía abdominal compleja. Tabaquismo activo. Sobrepeso.',
      'Dr. Roberto Sánchez', 'Dehiscencia parcial de herida quirúrgica. Deshabituación tabáquica en curso.', '2026-02-20', 5),
    (NEW.user_id, 'Lucía', 'Fernández', 58, 'Femenino', '20.123.456', '+54 11 6789-2345', 'lucia.fernandez@email.com', 'Av. Santa Fe 2345, CABA',
      'Pie diabético con neuropatía periférica severa. DBT2 mal controlada.',
      'Dr. Carlos Rodríguez', 'Riesgo de amputación. Educación intensiva sobre cuidado de pies.', '2026-02-10', 3),
    (NEW.user_id, 'Roberto', 'Méndez', 70, 'Masculino', '10.987.654', '+54 11 7890-3456', 'roberto.mendez@email.com', 'Av. Cabildo 4567, CABA',
      'Lesión por presión en talón izquierdo. Inmovilidad por fractura de cadera.',
      'Lic. María González', 'En domicilio con cuidador. Colchón antiescaras.', '2026-03-01', 4),
    (NEW.user_id, 'Patricia', 'Gómez', 52, 'Femenino', '22.345.678', '+54 11 8901-4567', 'patricia.gomez@email.com', 'Av. Las Heras 3456, CABA',
      'Quemadura de segundo grado en antebrazo derecho. Accidente doméstico.',
      'Lic. Ana Martínez', 'Buena evolución. Cuidados domiciliarios.', '2026-03-15', 7);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block user registration if seeding fails
  RETURN NEW;
END;
$$;

-- Trigger: after a profile is inserted (which happens after user signup), seed demo patients
DROP TRIGGER IF EXISTS seed_demo_patients_after_profile ON public.profiles;
CREATE TRIGGER seed_demo_patients_after_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_demo_patients_for_user();