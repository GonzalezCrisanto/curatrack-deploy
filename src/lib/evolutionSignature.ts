import { supabase } from '@/integrations/supabase/client';
import type { ProfessionalSignatureData } from '@/components/EvolutionConsentSection';

async function uploadSignatureImage(userId: string, dataUrl: string, prefix: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${userId}/${prefix}-${Date.now()}.png`;
    const { error } = await supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png' });
    if (error) { console.error('Signature upload error', error); return null; }
    return path;
  } catch (e) { console.error('Signature upload failed', e); return null; }
}

export interface SaveEvolutionSignatureParams {
  evolutionId: string;
  patientId: string;
  caseId: string;
  userId: string;
  professionalData: ProfessionalSignatureData;
}

export interface SaveEvolutionSignatureResult {
  ok: boolean;
  uploadError: 'professional' | null;
  insertError: string | null;
}

/**
 * Uploads the professional's signature image (if present) and inserts the
 * evolution_signatures row. Shared by the CaseDetail quick-add dialog and the
 * NewCuration wizard so the two flows can't drift out of sync.
 *
 * Patient consent is captured once, at the patient level (PatientConsentCard),
 * not re-collected per evolution — so this only carries the professional's
 * confirmation and signature.
 */
export async function saveEvolutionSignature(params: SaveEvolutionSignatureParams): Promise<SaveEvolutionSignatureResult> {
  const { evolutionId, patientId, caseId, userId, professionalData } = params;

  let profSigUrl: string | null = null;
  let uploadError: 'professional' | null = null;

  if (professionalData.signatureDataUrl) {
    profSigUrl = await uploadSignatureImage(userId, professionalData.signatureDataUrl, 'prof');
    if (!profSigUrl) uploadError = 'professional';
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('evolution_signatures').insert({
    evolution_id: evolutionId,
    patient_id: patientId,
    case_id: caseId,
    user_id: userId,
    professional_confirmation: professionalData.confirmed,
    professional_signature_url: profSigUrl,
    professional_signed_at: professionalData.confirmed ? now : null,
  } as any);

  if (error) console.error('evolution_signatures insert error', error);

  return { ok: !error, uploadError, insertError: error ? error.message : null };
}
