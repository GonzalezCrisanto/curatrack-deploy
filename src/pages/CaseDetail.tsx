import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Plus, Edit, Trash2, Clock, Camera, FileText,
  Stethoscope, Ruler, Droplets, ShieldAlert, Thermometer, Pill, X, Image, Upload, ImagePlus, Package, RefreshCw
} from 'lucide-react';
import { Evolution, Photo, professionals, getStatusLabel, woundStatuses } from '@/data/demoData';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const statusBadgeClass: Record<string, string> = {
  activo: 'bg-info/10 text-info border-info/30',
  en_mejoria: 'bg-success/10 text-success border-success/30',
  critico: 'bg-destructive/10 text-destructive border-destructive/30',
  resuelto: 'bg-muted text-muted-foreground border-border',
};

const emptyEvolution = {
  date: '', time: '', professional: '', description: '', procedure: '', materials: '', healingFrequency: '', observations: '', nextControl: '',
};

export default function CaseDetail() {
  const { patientId, caseId } = useParams();
  const navigate = useNavigate();
  const { patients, updateCase, addEvolution, updateEvolution, deleteEvolution } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const woundCase = patient?.cases.find(c => c.id === caseId);

  const [evoDialogOpen, setEvoDialogOpen] = useState(false);
  const [editingEvo, setEditingEvo] = useState<Evolution | null>(null);
  const [evoForm, setEvoForm] = useState(emptyEvolution);
  const [evoPhotos, setEvoPhotos] = useState<Photo[]>([]);
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);

  const casePhotoInput = useRef<HTMLInputElement>(null);
  const caseCameraInput = useRef<HTMLInputElement>(null);
  const evoPhotoInput = useRef<HTMLInputElement>(null);
  const evoCameraInput = useRef<HTMLInputElement>(null);

  if (!patient || !woundCase) {
    return <AppLayout><div className="p-8 text-center font-body text-muted-foreground">Caso no encontrado</div></AppLayout>;
  }

  const handleFileUpload = (
    files: FileList | null,
    target: 'case' | 'evolution'
  ) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" no es una imagen válida`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const photo: Photo = {
          id: `ph${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: reader.result as string,
          caption: file.name.replace(/\.[^.]+$/, ''),
          date: new Date().toISOString().split('T')[0],
        };
        if (target === 'case') {
          const updated = { ...woundCase, photos: [...woundCase.photos, photo] };
          updateCase(patient.id, updated);
          toast.success('Foto agregada al caso');
        } else {
          setEvoPhotos(prev => [...prev, photo]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeCasePhoto = (photoId: string) => {
    const updated = { ...woundCase, photos: woundCase.photos.filter(p => p.id !== photoId) };
    updateCase(patient.id, updated);
    toast.success('Foto eliminada');
  };

  const openNewEvo = () => {
    setEditingEvo(null);
    const now = new Date();
    setEvoForm({
      ...emptyEvolution,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      professional: 'Lic. María González',
    });
    setEvoPhotos([]);
    setEvoDialogOpen(true);
  };

  const openEditEvo = (ev: Evolution) => {
    setEditingEvo(ev);
    const { id, photos, ...rest } = ev;
    setEvoForm(rest);
    setEvoPhotos([...photos]);
    setEvoDialogOpen(true);
  };

  const handleSaveEvo = () => {
    if (editingEvo) {
      updateEvolution(patient.id, woundCase.id, { ...editingEvo, ...evoForm, photos: evoPhotos });
    } else {
      addEvolution(patient.id, woundCase.id, {
        ...evoForm, id: `e${Date.now()}`, photos: evoPhotos,
      } as Evolution);
    }
    setEvoDialogOpen(false);
  };

  const setEField = (key: string, value: string) => setEvoForm(prev => ({ ...prev, [key]: value }));

  const caseDetails = [
    { icon: Stethoscope, label: 'Tipo de herida', value: woundCase.woundType },
    { icon: FileText, label: 'Ubicación', value: woundCase.anatomicalLocation },
    { icon: Clock, label: 'Inicio', value: woundCase.startDate },
    { icon: Ruler, label: 'Tamaño', value: woundCase.size },
    { icon: FileText, label: 'Profundidad', value: woundCase.depth },
    { icon: Droplets, label: 'Exudado', value: woundCase.exudate },
    { icon: ShieldAlert, label: 'Infección', value: woundCase.infection },
    { icon: Thermometer, label: 'Dolor', value: woundCase.pain },
    { icon: Pill, label: 'Tratamiento', value: woundCase.treatment },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate(`/patients/${patient.id}`)} className="font-body text-sm -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a {patient.lastName}, {patient.firstName}
        </Button>

        {/* Case Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="heading-display text-2xl">{woundCase.woundType}</h1>
              <Badge className={`font-body text-xs ${statusBadgeClass[woundCase.status]}`}>
                {getStatusLabel(woundCase.status)}
              </Badge>
            </div>
            <p className="font-body text-sm text-muted-foreground">{woundCase.anatomicalLocation} · {patient.firstName} {patient.lastName}</p>
          </div>
        </div>

        {/* Case Info Grid */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="heading-display text-lg">Información del Caso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseDetails.map(d => (
                <div key={d.label} className="flex items-start gap-2">
                  <d.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-body text-xs text-muted-foreground">{d.label}</p>
                    <p className="font-body text-sm">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery with upload */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="heading-display text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Galería de Fotos
            </CardTitle>
            <div className="flex gap-2">
              <input
                ref={caseCameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { handleFileUpload(e.target.files, 'case'); e.target.value = ''; }}
              />
              <input
                ref={casePhotoInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { handleFileUpload(e.target.files, 'case'); e.target.value = ''; }}
              />
              <Button variant="outline" size="sm" className="font-body" onClick={() => caseCameraInput.current?.click()}>
                <Camera className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Cámara</span>
              </Button>
              <Button variant="outline" size="sm" className="font-body" onClick={() => casePhotoInput.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Subir</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {woundCase.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {woundCase.photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative group rounded-lg overflow-hidden border border-border/50 cursor-pointer aspect-[4/3]"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setPhotoViewer(photo.url)}
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-end pointer-events-none">
                      <div className="p-2 w-full bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="font-body text-xs text-primary-foreground">{photo.caption}</p>
                        <p className="font-body text-xs text-primary-foreground/70">{photo.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCasePhoto(photo.id); }}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-body text-sm text-muted-foreground">No hay fotos aún</p>
                <div className="flex justify-center gap-2 mt-3">
                  <Button variant="outline" size="sm" className="font-body" onClick={() => caseCameraInput.current?.click()}>
                    <Camera className="mr-2 h-4 w-4" /> Cámara
                  </Button>
                  <Button variant="outline" size="sm" className="font-body" onClick={() => casePhotoInput.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Subir foto
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Timeline de Evoluciones
          </h2>
          <Button onClick={openNewEvo} className="font-body" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nueva Evolución
          </Button>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {woundCase.evolutions.map((ev, idx) => (
              <div key={ev.id} className="relative pl-12 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-sm font-semibold">{ev.date}</span>
                          <span className="font-body text-xs text-muted-foreground">{ev.time} hs</span>
                          <Badge variant="outline" className="font-body text-xs">{ev.professional}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEvo(ev)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="heading-display">¿Eliminar evolución?</AlertDialogTitle>
                              <AlertDialogDescription className="font-body">Esta acción no se puede deshacer.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-body">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteEvolution(patient.id, woundCase.id, ev.id)} className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="font-body text-xs text-muted-foreground mb-0.5">Descripción clínica</p>
                        <p className="font-body text-sm">{ev.description}</p>
                      </div>
                      <div>
                        <p className="font-body text-xs text-muted-foreground mb-0.5">Procedimiento</p>
                        <p className="font-body text-sm">{ev.procedure}</p>
                      </div>
                      {ev.materials && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Package className="h-3 w-3" /> Material de curación</p>
                          <p className="font-body text-sm">{ev.materials}</p>
                        </div>
                      )}
                      {ev.healingFrequency && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Frecuencia de curación</p>
                          <p className="font-body text-sm">{ev.healingFrequency}</p>
                        </div>
                      )}
                      {ev.observations && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground mb-0.5">Observaciones</p>
                          <p className="font-body text-sm">{ev.observations}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Próximo control: {ev.nextControl}
                      </div>

                      {ev.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {ev.photos.map(ph => (
                            <div
                              key={ph.id}
                              className="w-20 h-16 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                              onClick={() => setPhotoViewer(ph.url)}
                            >
                              <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {woundCase.evolutions.length === 0 && (
            <div className="pl-12 text-center py-12 border border-dashed border-border rounded-lg">
              <p className="font-body text-muted-foreground">No hay evoluciones registradas</p>
              <Button variant="outline" className="font-body mt-3" onClick={openNewEvo}>
                <Plus className="mr-2 h-4 w-4" /> Registrar primera evolución
              </Button>
            </div>
          )}
        </div>

        {/* Evolution Form Dialog */}
        <Dialog open={evoDialogOpen} onOpenChange={setEvoDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="heading-display text-xl">
                {editingEvo ? 'Editar Evolución' : 'Nueva Evolución'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="font-body text-sm">Fecha</Label>
                <Input type="date" value={evoForm.date} onChange={e => setEField('date', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Hora</Label>
                <Input type="time" value={evoForm.time} onChange={e => setEField('time', e.target.value)} className="font-body" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Profesional</Label>
                <Select value={evoForm.professional} onValueChange={v => setEField('professional', v)}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Descripción clínica</Label>
                <Textarea value={evoForm.description} onChange={e => setEField('description', e.target.value)} className="font-body" rows={3} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Procedimiento realizado</Label>
                <Textarea value={evoForm.procedure} onChange={e => setEField('procedure', e.target.value)} className="font-body" rows={2} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Material de curación utilizado</Label>
                <Textarea value={evoForm.materials} onChange={e => setEField('materials', e.target.value)} className="font-body" rows={2} placeholder="Ej: Solución fisiológica, hidrogel, apósito de espuma..." />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Frecuencia de curación</Label>
                <Input value={evoForm.healingFrequency} onChange={e => setEField('healingFrequency', e.target.value)} className="font-body" placeholder="Ej: Cada 48 horas" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Observaciones</Label>
                <Textarea value={evoForm.observations} onChange={e => setEField('observations', e.target.value)} className="font-body" rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Próximo control</Label>
                <Input type="date" value={evoForm.nextControl} onChange={e => setEField('nextControl', e.target.value)} className="font-body" />
              </div>

              {/* Photo upload in evolution */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-body text-sm">Fotos de la evolución</Label>
                <div className="flex gap-2">
                  <input
                    ref={evoCameraInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { handleFileUpload(e.target.files, 'evolution'); e.target.value = ''; }}
                  />
                  <input
                    ref={evoPhotoInput}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => { handleFileUpload(e.target.files, 'evolution'); e.target.value = ''; }}
                  />
                  <Button type="button" variant="outline" size="sm" className="font-body" onClick={() => evoCameraInput.current?.click()}>
                    <Camera className="mr-1.5 h-4 w-4" /> Cámara
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="font-body" onClick={() => evoPhotoInput.current?.click()}>
                    <Upload className="mr-1.5 h-4 w-4" /> Subir
                  </Button>
                </div>
                {evoPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {evoPhotos.map(ph => (
                      <div key={ph.id} className="relative w-20 h-16 rounded-md overflow-hidden border border-border/50 group">
                        <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEvoPhotos(prev => prev.filter(p => p.id !== ph.id))}
                          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEvoDialogOpen(false)} className="font-body">Cancelar</Button>
              <Button onClick={handleSaveEvo} className="font-body">{editingEvo ? 'Guardar cambios' : 'Registrar evolución'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photo viewer */}
        <Dialog open={!!photoViewer} onOpenChange={() => setPhotoViewer(null)}>
          <DialogContent className="max-w-3xl p-2">
            <img src={photoViewer || ''} alt="Foto clínica" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}