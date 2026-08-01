'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// FECHA Y HORA FIJA DE LA ÚLTIMA ACTUALIZACIÓN
const ULTIMA_ACTUALIZACION_APP = '1/8/2026';

// ESTILOS REUTILIZABLES PREMIUM
const INPUT_CLS = "w-full min-w-0 box-border bg-slate-950/80 border border-slate-800/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 transition-all duration-200 placeholder:text-slate-600 outline-none hover:border-slate-700 font-medium [color-scheme:dark]";
const BTN_PRIMARY = "w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2";
const CARD_CLS = "bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 shadow-2xl transition-all duration-300 hover:border-slate-700/80 hover:shadow-indigo-500/5";

// LISTA DE SECCIONES
const SECCIONES = [
  { id: 'general', label: 'General', icon: '📊' },
  { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
  { id: 'habitos', label: 'Hábitos', icon: '⚡' },
  { id: 'nutricion', label: 'Nutrición / Entreno', icon: '🔥' },
  { id: 'extra', label: 'Extra', icon: '✨' },
  { id: 'actualizaciones', label: 'Actualizaciones', icon: '🚀' },
];

// INTERFACES
interface PerfilUsuario {
  nombre: string;
  fecha_nacimiento: string;
  peso: number;
  altura: number;
  sexo: 'masculino' | 'femenino';
  objetivo: 'bajar' | 'subir' | 'mantener';
  kilos_objetivo: number;
  tiempo_objetivo_meses: number;
  porcentaje_probabilidad: number;
}

interface Habito {
  id: number;
  texto: string;
  hora_objetivo: string;
}

interface RegistroHabito {
  habito_id: number;
  completado: boolean;
  hora_completado?: string;
  fecha?: string;
}

interface ItemComida {
  id: string;
  nombre: string;
  calorias: number;
}

type TipoEjercicio = '' | 'fuerza' | 'running' | 'ciclismo' | 'boxeo' | 'futbol' | 'natacion' | 'caminata' | 'funcional' | 'otro';

interface EjercicioGimnasio {
  id: string;
  tipo: TipoEjercicio;
  calorias: number;
}

interface RegistroSueno {
  id?: number;
  fecha: string;
  hora_acostarse: string;
  hora_levantarse: string;
  horas_totales: number;
  calidad: number;
}

const COMIDAS_POR_DEFECTO: ItemComida[] = [
  { id: '1', nombre: '🍳 Desayuno', calorias: 0 },
  { id: '2', nombre: '🥗 Almuerzo', calorias: 0 },
  { id: '3', nombre: '🍎 Merienda', calorias: 0 },
  { id: '4', nombre: '🍗 Cena', calorias: 0 },
  { id: '5', nombre: '🥑 Snacks / Extra', calorias: 0 },
];

const obtenerFechaLogica = () => {
  const ahora = new Date();
  const fechaAjustada = new Date(ahora.getTime() - 4 * 60 * 60 * 1000);
  return fechaAjustada.toISOString().split('T')[0];
};

// COMPONENTE PARA INPUTS NUMÉRICOS LIMPIOS
const CleanNumberInput = ({ value, onChange, className, placeholder, min, step }: any) => {
  const [val, setVal] = useState<string>(value === 0 || value === null || value === undefined ? '' : String(value));

  useEffect(() => {
    setVal(value === 0 || value === null || value === undefined ? '' : String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      step={step}
      placeholder={placeholder || '0'}
      value={val}
      onChange={(e) => {
        const inputVal = e.target.value;
        setVal(inputVal);
        onChange(inputVal === '' ? 0 : Number(inputVal));
      }}
      className={className}
    />
  );
};

export default function Home() {
  // AUTENTICACIÓN
  const [session, setSession] = useState<any>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [esRegistro, setEsRegistro] = useState(false);
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [confirmPasswordAuth, setConfirmPasswordAuth] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [pasoOTP, setPasoOTP] = useState(false);
  const [codigoOTP, setCodigoOTP] = useState('');
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');

  // NAVEGACIÓN Y APPS
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'perfil' | 'habitos' | 'nutricion' | 'extra' | 'actualizaciones'>('general');
  const [subSeccionPerfil, setSubSeccionPerfil] = useState<'perfil' | 'objetivo'>('perfil');
  const [subSeccionNutricion, setSubSeccionNutricion] = useState<'nutricion' | 'entrenamiento'>('nutricion');
  const [subSeccionExtra, setSubSeccionExtra] = useState<'agua' | 'sueno'>('agua');
  const [subSeccionActualizaciones, setSubSeccionActualizaciones] = useState<'novedades' | 'soporte'>('novedades');

  // SOPORTE
  const [tipoSoporte, setTipoSoporte] = useState('');
  const [mensajeSoporte, setMensajeSoporte] = useState('');

  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [fechaSeleccionada] = useState<string>(obtenerFechaLogica());

  // PERFIL
  const [perfil, setPerfil] = useState<PerfilUsuario>({
    nombre: '',
    fecha_nacimiento: '2000-01-01',
    peso: 75,
    altura: 175,
    sexo: 'masculino',
    objetivo: 'bajar',
    kilos_objetivo: 5,
    tiempo_objetivo_meses: 3,
    porcentaje_probabilidad: 85
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // HÁBITOS
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [registrosHoy, setRegistrosHoy] = useState<Record<number, RegistroHabito>>({});
  const [rachasHabitos, setRachasHabitos] = useState<Record<number, number>>({});
  const [nuevoHabito, setNuevoHabito] = useState('');
  const [horaObjetivo, setHoraObjetivo] = useState('18:00');

  // NUTRICIÓN Y ENTRENAMIENTO
  const [ejercicios, setEjercicios] = useState<EjercicioGimnasio[]>([]);
  const [comidas, setComidas] = useState<ItemComida[]>(COMIDAS_POR_DEFECTO);

  // HIDRATACIÓN Y SUEÑO
  const [aguaMl, setAguaMl] = useState<number>(0);
  const metaAguaMl = 2500;

  const [suenoHoy, setSuenoHoy] = useState<RegistroSueno>({
    fecha: fechaSeleccionada,
    hora_acostarse: '23:00',
    hora_levantarse: '07:00',
    horas_totales: 0,
    calidad: 3,
  });

  // HELPER PARA ORDENAR HÁBITOS POR HORA OBJETIVO
  const ordenarHabitosPorHora = (lista: Habito[]): Habito[] => {
    return [...lista].sort((a, b) => (a.hora_objetivo || '00:00').localeCompare(b.hora_objetivo || '00:00'));
  };

  // CONTROL DE SESIÓN
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCargandoSesion(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCargandoSesion(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const alternarModoAuth = (esReg: boolean) => {
    setEsRegistro(esReg);
    setEmailAuth('');
    setPasswordAuth('');
    setConfirmPasswordAuth('');
    setErrorAuth('');
    setPasoOTP(false);
  };

  useEffect(() => {
    if (session?.user) cargarDatos();
  }, [fechaSeleccionada, session?.user?.id]);

  // AUTENTICACIÓN
  const manejarAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAuth('');
    setCargandoAuth(true);

    try {
      if (esRegistro) {
        if (passwordAuth !== confirmPasswordAuth) {
          throw new Error('Las contraseñas no coinciden.');
        }
        const { error } = await supabase.auth.signUp({
          email: emailAuth,
          password: passwordAuth,
        });
        if (error) throw error;
        setPasoOTP(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: emailAuth, password: passwordAuth });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorAuth(err.message || 'Error al autenticar');
    } finally {
      setCargandoAuth(false);
    }
  };

  const verificarCodigoOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAuth('');
    setCargandoAuth(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailAuth,
        token: codigoOTP.trim(),
        type: 'signup',
      });
      if (error) throw error;
      alert('✅ Email verificado exitosamente.');
    } catch (err: any) {
      setErrorAuth(err.message || 'Código de verificación inválido o expirado.');
    } finally {
      setCargandoAuth(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  const cargarDatos = async () => {
    const user = session?.user;
    if (!user) return;

    const { data: datosPerfil } = await supabase.from('perfil_usuario').select('*').eq('user_id', user.id).maybeSingle();
    if (datosPerfil) setPerfil(datosPerfil);

    const { data: datosHabitos } = await supabase.from('habitos').select('*').eq('user_id', user.id);
    if (datosHabitos) {
      setHabitos(ordenarHabitosPorHora(datosHabitos));
      const rachasTemp: Record<number, number> = {};
      datosHabitos.forEach(h => { rachasTemp[h.id] = Math.floor(Math.random() * 5) + 1; });
      setRachasHabitos(rachasTemp);
    }

    const { data: datosRegistros } = await supabase.from('registro_habitos').select('*').eq('user_id', user.id).eq('fecha', fechaSeleccionada);
    const mapaRegistros: Record<number, RegistroHabito> = {};
    if (datosRegistros) datosRegistros.forEach((reg) => { mapaRegistros[reg.habito_id] = reg; });
    setRegistrosHoy(mapaRegistros);

    const { data: datosCalorias } = await supabase.from('registro_calorias').select('*').eq('user_id', user.id).eq('fecha', fechaSeleccionada).maybeSingle();
    if (datosCalorias) {
      setAguaMl(datosCalorias.agua_ml ?? 0);
      setEjercicios(datosCalorias.ejercicios || []);
      setComidas(datosCalorias.comidas?.length ? datosCalorias.comidas : COMIDAS_POR_DEFECTO);
    } else {
      setAguaMl(0); setEjercicios([]); setComidas(COMIDAS_POR_DEFECTO);
    }

    const { data: datosSueno } = await supabase.from('registro_sueno').select('*').eq('user_id', user.id).eq('fecha', fechaSeleccionada).maybeSingle();
    setSuenoHoy(datosSueno || { fecha: fechaSeleccionada, hora_acostarse: '23:00', hora_levantarse: '07:00', horas_totales: 0, calidad: 3 });
  };

  const bmrCalculado = useMemo(() => {
    if (!perfil.fecha_nacimiento || !perfil.peso || !perfil.altura) return 1500;
    const hoy = new Date();
    const cumple = new Date(perfil.fecha_nacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    let bmr = (10 * perfil.peso) + (6.25 * perfil.altura) - (5 * (isNaN(edad) ? 25 : edad));
    return Math.round(perfil.sexo === 'masculino' ? bmr + 5 : bmr - 161);
  }, [perfil]);

  // FUNCIÓN CENTRAL DE GUARDADO AUTOMÁTICO EN SUPABASE
  const guardarCaloriasDB = async (nuevosEjercicios = ejercicios, nuevasComidas = comidas, nuevaAgua = aguaMl) => {
    if (!session?.user) return;
    await supabase.from('registro_calorias').upsert({
      user_id: session.user.id,
      fecha: fechaSeleccionada,
      base: bmrCalculado,
      agua_ml: nuevaAgua,
      ejercicios: nuevosEjercicios,
      comidas: nuevasComidas
    }, { onConflict: 'user_id,fecha' });
  };

  // AUTO-SAVE DE RESPALDO PARA NUTRICIÓN, ACTIVIDADES Y AGUA
  useEffect(() => {
    if (!session?.user) return;
    const timer = setTimeout(() => guardarCaloriasDB(), 600);
    return () => clearTimeout(timer);
  }, [comidas, ejercicios, aguaMl, fechaSeleccionada, session]);

  // AUTO-SAVE DEBOUNCED PARA PERFIL
  useEffect(() => {
    if (!session?.user) return;
    const timer = setTimeout(() => {
      supabase.from('perfil_usuario').upsert({ user_id: session.user.id, ...perfil }, { onConflict: 'user_id' });
    }, 1000);
    return () => clearTimeout(timer);
  }, [perfil, session]);

  // AUTO-SAVE DEBOUNCED PARA SUEÑO
  useEffect(() => {
    if (!session?.user) return;
    const timer = setTimeout(() => {
      const [hA, mA] = suenoHoy.hora_acostarse.split(':').map(Number);
      const [hL, mL] = suenoHoy.hora_levantarse.split(':').map(Number);
      let minA = hA * 60 + mA, minL = hL * 60 + mL;
      if (minL < minA) minL += 24 * 60;
      const duracion = parseFloat(((minL - minA) / 60).toFixed(1));

      const datos = { ...suenoHoy, user_id: session.user.id, fecha: fechaSeleccionada, horas_totales: duracion };
      supabase.from('registro_sueno').upsert(datos, { onConflict: 'user_id,fecha' });
    }, 1000);
    return () => clearTimeout(timer);
  }, [suenoHoy, fechaSeleccionada, session]);

  const guardarPerfil = async () => {
    if (!session?.user) return;
    setGuardandoPerfil(true);
    try {
      const { error } = await supabase.from('perfil_usuario').upsert({ user_id: session.user.id, ...perfil }, { onConflict: 'user_id' });
      if (error) throw error;
      alert('✅ Perfil guardado correctamente');
    } catch (err: any) {
      alert('❌ Error al guardar perfil: ' + err.message);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // HÁBITOS CON AUTO-ORDEN
  const agregarHabito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHabito.trim() || !session?.user) return;
    const { data, error } = await supabase.from('habitos').insert([{ user_id: session.user.id, texto: nuevoHabito, hora_objetivo: horaObjetivo }]).select();
    if (!error && data) {
      setHabitos(prev => ordenarHabitosPorHora([...prev, data[0]]));
      setRachasHabitos(prev => ({ ...prev, [data[0].id]: 1 }));
      setNuevoHabito('');
    }
  };

  const alternarHabito = async (habitoId: number) => {
    if (!session?.user) return;
    const estaCompletado = !!registrosHoy[habitoId]?.completado;
    if (!estaCompletado) {
      await supabase.from('registro_habitos').upsert({ user_id: session.user.id, habito_id: habitoId, fecha: fechaSeleccionada, completado: true }, { onConflict: 'user_id,habito_id,fecha' });
      setRegistrosHoy(prev => ({ ...prev, [habitoId]: { habito_id: habitoId, completado: true } }));
    } else {
      await supabase.from('registro_habitos').delete().eq('user_id', session.user.id).eq('habito_id', habitoId).eq('fecha', fechaSeleccionada);
      setRegistrosHoy(prev => { const copia = { ...prev }; delete copia[habitoId]; return copia; });
    }
  };

  const eliminarHabito = async (id: number) => {
    if (!session?.user || !window.confirm('¿Eliminar hábito?')) return;
    const { error } = await supabase.from('habitos').delete().eq('user_id', session.user.id).eq('id', id);
    if (!error) setHabitos(habitos.filter(h => h.id !== id));
  };

  // NUTRICIÓN (CON GUARDADO AUTOMÁTICO INMEDIATO)
  const agregarComida = () => {
    const nuevas = [...comidas, { id: Date.now().toString(), nombre: 'Nueva Comida', calorias: 0 }];
    setComidas(nuevas);
    guardarCaloriasDB(ejercicios, nuevas, aguaMl);
  };

  const actualizarComida = (id: string, campo: keyof ItemComida, valor: any) => {
    const nuevas = comidas.map(item => item.id === id ? { ...item, [campo]: valor } : item);
    setComidas(nuevas);
    guardarCaloriasDB(ejercicios, nuevas, aguaMl);
  };

  const eliminarComida = (id: string) => {
    const nuevas = comidas.filter(item => item.id !== id);
    setComidas(nuevas);
    guardarCaloriasDB(ejercicios, nuevas, aguaMl);
  };

  const moverComida = (index: number, direccion: 'arriba' | 'abajo') => {
    const destino = direccion === 'arriba' ? index - 1 : index + 1;
    if (destino < 0 || destino >= comidas.length) return;
    const copia = [...comidas];
    const [removido] = copia.splice(index, 1);
    copia.splice(destino, 0, removido);
    setComidas(copia);
    guardarCaloriasDB(ejercicios, copia, aguaMl);
  };

  // EJERCICIOS (CON GUARDADO AUTOMÁTICO INMEDIATO)
  const agregarEjercicio = () => {
    const nuevos = [...ejercicios, { id: Date.now().toString(), tipo: '' as TipoEjercicio, calorias: 0 }];
    setEjercicios(nuevos);
    guardarCaloriasDB(nuevos, comidas, aguaMl);
  };

  const actualizarEjercicio = (id: string, campo: keyof EjercicioGimnasio, valor: any) => {
    const nuevos = ejercicios.map(item => item.id === id ? { ...item, [campo]: valor } : item);
    setEjercicios(nuevos);
    guardarCaloriasDB(nuevos, comidas, aguaMl);
  };

  const eliminarEjercicio = (id: string) => {
    const nuevos = ejercicios.filter(item => item.id !== id);
    setEjercicios(nuevos);
    guardarCaloriasDB(nuevos, comidas, aguaMl);
  };

  const moverEjercicio = (index: number, direccion: 'arriba' | 'abajo') => {
    const destino = direccion === 'arriba' ? index - 1 : index + 1;
    if (destino < 0 || destino >= ejercicios.length) return;
    const copia = [...ejercicios];
    const [removido] = copia.splice(index, 1);
    copia.splice(destino, 0, removido);
    setEjercicios(copia);
    guardarCaloriasDB(copia, comidas, aguaMl);
  };

  // HIDRATACIÓN Y SUEÑO (CON GUARDADO AUTOMÁTICO INMEDIATO)
  const modificarAgua = (deltaMl: number) => {
    setAguaMl(prev => {
      const nuevo = Math.max(0, prev + deltaMl);
      guardarCaloriasDB(ejercicios, comidas, nuevo);
      return nuevo;
    });
  };

  const guardarSueno = async () => {
    if (!session?.user) return;
    const [hA, mA] = suenoHoy.hora_acostarse.split(':').map(Number);
    const [hL, mL] = suenoHoy.hora_levantarse.split(':').map(Number);
    let minA = hA * 60 + mA, minL = hL * 60 + mL;
    if (minL < minA) minL += 24 * 60;
    const duracion = parseFloat(((minL - minA) / 60).toFixed(1));

    const datos = { ...suenoHoy, user_id: session.user.id, fecha: fechaSeleccionada, horas_totales: duracion };
    const { error } = await supabase.from('registro_sueno').upsert(datos, { onConflict: 'user_id,fecha' });
    if (!error) { setSuenoHoy(datos); alert('✅ Sueño guardado'); }
  };

  const enviarSoporte = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoSoporte || !mensajeSoporte.trim()) return alert('⚠️ Completa el formulario');
    window.location.href = `mailto:stefanopintos.contact@gmail.com?subject=${encodeURIComponent(`[Fitness App] ${tipoSoporte}`)}&body=${encodeURIComponent(mensajeSoporte)}`;
    setMensajeSoporte('');
  };

  // CÁLCULOS GENERALES
  const totalCompletados = habitos.filter(h => registrosHoy[h.id]?.completado).length;
  const porcentajeHabitos = habitos.length > 0 ? Math.round((totalCompletados / habitos.length) * 100) : 0;
  const totalGastoEjercicios = ejercicios.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const totalIngresoCalorias = comidas.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const balanceCalorico = totalIngresoCalorias - (bmrCalculado + totalGastoEjercicios);

  // EVALUACIÓN DE BARRA DE BALANCE CALÓRICO
  const evaluarEstadoCalorias = () => {
    let pct = 0;
    let colorBarra = "bg-rose-500 shadow-rose-500/50";
    let colorTexto = "text-rose-400";
    let mensaje = "Atención requerida";

    if (perfil.objetivo === 'subir') {
      if (balanceCalorico < 0) {
        pct = Math.max(5, Math.min(100, Math.round((totalIngresoCalorias / (bmrCalculado + totalGastoEjercicios)) * 100)));
        colorBarra = "bg-rose-500 shadow-rose-500/50";
        colorTexto = "text-rose-400";
        mensaje = "Déficit no deseado";
      } else if (balanceCalorico < 300) {
        pct = 50;
        colorBarra = "bg-amber-500 shadow-amber-500/50";
        colorTexto = "text-amber-400";
        mensaje = "Superávit bajo";
      } else {
        pct = 100;
        colorBarra = "bg-emerald-500 shadow-emerald-500/50";
        colorTexto = "text-emerald-400";
        mensaje = "¡Superávit óptimo!";
      }
    } else if (perfil.objetivo === 'bajar') {
      if (balanceCalorico > 0) {
        pct = 100;
        colorBarra = "bg-rose-500 shadow-rose-500/50";
        colorTexto = "text-rose-400";
        mensaje = "Exceso calórico";
      } else if (balanceCalorico > -200) {
        pct = 50;
        colorBarra = "bg-amber-500 shadow-amber-500/50";
        colorTexto = "text-amber-400";
        mensaje = "Déficit leve";
      } else {
        pct = 100;
        colorBarra = "bg-emerald-500 shadow-emerald-500/50";
        colorTexto = "text-emerald-400";
        mensaje = "¡Déficit logrado!";
      }
    } else {
      const diff = Math.abs(balanceCalorico);
      if (diff < 150) {
        pct = 100;
        colorBarra = "bg-emerald-500 shadow-emerald-500/50";
        colorTexto = "text-emerald-400";
        mensaje = "Balance perfecto";
      } else if (diff < 350) {
        pct = 50;
        colorBarra = "bg-amber-500 shadow-amber-500/50";
        colorTexto = "text-amber-400";
        mensaje = "Desviación moderada";
      } else {
        pct = 20;
        colorBarra = "bg-rose-500 shadow-rose-500/50";
        colorTexto = "text-rose-400";
        mensaje = "Desviación alta";
      }
    }
    return { pct, colorBarra, colorTexto, mensaje };
  };

  const estadoCalorico = evaluarEstadoCalorias();

  // COLORES DINÁMICOS
  const getDynamicColor = (porcentaje: number) => {
    if (porcentaje >= 80) return { bar: "bg-emerald-500 shadow-emerald-500/50", text: "text-emerald-400" };
    if (porcentaje >= 40) return { bar: "bg-amber-500 shadow-amber-500/50", text: "text-amber-400" };
    return { bar: "bg-rose-500 shadow-rose-500/50", text: "text-rose-400" };
  };

  if (cargandoSesion) return <div className="min-h-screen bg-slate-950 text-indigo-400 flex items-center justify-center font-sans animate-pulse text-sm">⚡ Cargando tu centro de entrenamiento...</div>;

  // SESIÓN NO INICIADA
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <span className="text-5xl inline-block drop-shadow-lg">💪</span>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Personal Fitness App</h1>
            <p className="text-xs text-slate-400 font-medium">{pasoOTP ? 'Ingresa el código que enviamos a tu email' : esRegistro ? 'Crea tu cuenta profesional' : 'Bienvenido de nuevo'}</p>
          </div>

          {errorAuth && <div className="bg-rose-950/60 text-rose-300 text-xs p-3.5 rounded-2xl border border-rose-800/80 text-center font-medium">⚠️ {errorAuth}</div>}

          {pasoOTP ? (
            <form onSubmit={verificarCodigoOTP} className="space-y-4">
              <input type="text" required value={codigoOTP} onChange={(e) => setCodigoOTP(e.target.value)} placeholder="Código de 6 dígitos" className={`${INPUT_CLS} text-center font-mono text-base tracking-widest`} />
              <button type="submit" disabled={cargandoAuth} className={BTN_PRIMARY}>{cargandoAuth ? 'Verificando...' : 'Confirmar Código'}</button>
              <button type="button" onClick={() => setPasoOTP(false)} className="w-full text-xs text-slate-400 hover:text-indigo-400 transition">← Volver al formulario</button>
            </form>
          ) : (
            <form onSubmit={manejarAuth} className="space-y-4">
              <input type="email" required value={emailAuth} onChange={(e) => setEmailAuth(e.target.value)} placeholder="tu@email.com" className={INPUT_CLS} />
              
              <div className="relative">
                <input type={mostrarPassword ? "text" : "password"} required value={passwordAuth} onChange={(e) => setPasswordAuth(e.target.value)} placeholder="Contraseña" className={INPUT_CLS} />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-200 transition">
                  {mostrarPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {esRegistro && (
                <input type={mostrarPassword ? "text" : "password"} required value={confirmPasswordAuth} onChange={(e) => setConfirmPasswordAuth(e.target.value)} placeholder="Confirmar contraseña" className={INPUT_CLS} />
              )}

              <button type="submit" disabled={cargandoAuth} className={BTN_PRIMARY}>
                {cargandoAuth ? 'Procesando...' : esRegistro ? 'Registrarse' : 'Iniciar Sesión'}
              </button>
            </form>
          )}

          {!pasoOTP && (
            <button onClick={() => alternarModoAuth(!esRegistro)} className="w-full text-center text-xs text-slate-400 hover:text-indigo-400 transition font-medium">
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* MENÚ LATERAL Y NAVEGACIÓN */}
      <aside className={`bg-slate-900/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-800/80 transition-all duration-300 flex flex-col justify-between shrink-0 ${sidebarAbierto ? 'fixed inset-0 z-50 w-full h-full md:relative md:w-64' : 'w-full md:w-20'}`}>
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
            <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition active:scale-95">
              <span className="text-xs font-bold">{sidebarAbierto ? '✕' : '☰'}</span>
            </button>
            
            <div className="text-xs font-bold text-slate-200 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800/80 truncate max-w-[170px] shadow-inner">
              👤 {perfil.nombre.trim() || session?.user?.email?.split('@')[0] || 'Usuario'}
            </div>
          </div>

          <nav className="p-3 text-center flex flex-col items-center justify-center">
            {sidebarAbierto ? (
              <div className="w-full flex flex-col space-y-2">
                {SECCIONES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSeccionActiva(item.id as any); setSidebarAbierto(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 w-full justify-start ${
                      seccionActiva === item.id 
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setSidebarAbierto(true)}
                className="flex items-center justify-center p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white transition hover:scale-105 cursor-pointer my-2 shadow-lg shadow-indigo-600/30"
                title="Abrir menú de navegación"
              >
                <span className="text-xl">
                  {SECCIONES.find(s => s.id === seccionActiva)?.icon || '📊'}
                </span>
              </button>
            )}
          </nav>
        </div>

        {sidebarAbierto && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 space-y-3 mt-auto text-center">
            <button onClick={cerrarSesion} className="w-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-bold py-2.5 rounded-xl text-xs transition active:scale-95">🚪 Cerrar Sesión</button>
            <div className="text-[10px] text-slate-500 font-mono">🚀 v{ULTIMA_ACTUALIZACION_APP}</div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* ENCABEZADO CENTRADO DE LA SECCIÓN (EMOJIS SEPARADOS DE GRADIENTES) */}
        <header className="flex justify-center items-center mb-8 bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-slate-800/80 text-center shadow-xl">
          <h2 className="text-xl sm:text-2xl font-black text-center w-full flex items-center justify-center gap-2.5">
            {seccionActiva === 'general' && (
              <>
                <span>📊</span>
                <span className="bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-300 bg-clip-text text-transparent">Resumen General</span>
                <span>📊</span>
              </>
            )}
            {seccionActiva === 'perfil' && (
              <>
                <span>👤</span>
                <span className="bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-300 bg-clip-text text-transparent">Mi Perfil y Objetivos</span>
                <span>👤</span>
              </>
            )}
            {seccionActiva === 'habitos' && (
              <>
                <span>⚡</span>
                <span className="bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-300 bg-clip-text text-transparent">Hábitos Diarios</span>
                <span>⚡</span>
              </>
            )}
            {seccionActiva === 'nutricion' && (
              <>
                <span>🔥</span>
                <span className="bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-300 bg-clip-text text-transparent">Nutrición y Entrenamiento</span>
                <span>🔥</span>
              </>
            )}
            {seccionActiva === 'extra' && (
              <>
                <span>✨</span>
                <span className="bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-300 bg-clip-text text-transparent">Extra</span>
                <span>✨</span>
              </>
            )}
            {seccionActiva === 'actualizaciones' && (
              <>
                <span>🚀</span>
                <span className="bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-300 bg-clip-text text-transparent">Novedades y Soporte</span>
                <span>🚀</span>
              </>
            )}
          </h2>
        </header>

        {/* RESUMEN GENERAL */}
        {seccionActiva === 'general' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
            
            {/* BALANCE CALÓRICO */}
            <div onClick={() => setSeccionActiva('nutricion')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Balance Calórico 🔥</span>
              <p className={`text-3xl font-black my-2 text-center transition-colors ${estadoCalorico.colorTexto}`}>
                {balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico} <span className="text-xs text-slate-500 font-medium">kcal</span>
              </p>
              <div className="w-full space-y-1.5 mt-2">
                <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-500 ${estadoCalorico.colorBarra}`} style={{ width: `${estadoCalorico.pct}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold px-1">
                  <span>{estadoCalorico.mensaje}</span>
                  <span>{estadoCalorico.pct}%</span>
                </div>
              </div>
            </div>

            {/* AGUA */}
            {(() => {
              const pctAgua = Math.min(100, Math.round((aguaMl / metaAguaMl) * 100));
              const colors = getDynamicColor(pctAgua);
              return (
                <div onClick={() => setSeccionActiva('extra')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Agua Diaria 💧</span>
                  <p className={`text-3xl font-black my-2 text-center transition-colors ${colors.text}`}>
                    {(aguaMl / 1000).toFixed(2)}L <span className="text-xs text-slate-500 font-medium">/ 2.5L</span>
                  </p>
                  <div className="w-full space-y-1.5 mt-2">
                    <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${pctAgua}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{pctAgua}% completado</span>
                  </div>
                </div>
              );
            })()}

            {/* HÁBITOS */}
            {(() => {
              const colors = getDynamicColor(porcentajeHabitos);
              return (
                <div onClick={() => setSeccionActiva('habitos')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Hábitos ⚡</span>
                  <p className={`text-3xl font-black my-2 text-center transition-colors ${colors.text}`}>{porcentajeHabitos}%</p>
                  <div className="w-full space-y-1.5 mt-2">
                    <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${porcentajeHabitos}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{totalCompletados} de {habitos.length} listos</span>
                  </div>
                </div>
              );
            })()}

            {/* SUEÑO */}
            {(() => {
              const pctSueno = Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100));
              const colors = getDynamicColor(pctSueno);
              return (
                <div onClick={() => setSeccionActiva('extra')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Sueño 😴</span>
                  <p className={`text-3xl font-black my-2 text-center transition-colors ${colors.text}`}>
                    {suenoHoy.horas_totales} <span className="text-xs text-slate-500 font-medium">hrs</span>
                  </p>
                  <div className="w-full space-y-1.5 mt-2">
                    <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${pctSueno}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{pctSueno}% meta (8 hrs)</span>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* MI PERFIL Y OBJETIVOS */}
        {seccionActiva === 'perfil' && (
          <section className={`${CARD_CLS} max-w-xl mx-auto space-y-6`}>
            <div className="flex border-b border-slate-800/80 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionPerfil('perfil')} className={`text-xs font-bold pb-2 transition ${subSeccionPerfil === 'perfil' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>👤 Datos Personales</button>
              <button onClick={() => setSubSeccionPerfil('objetivo')} className={`text-xs font-bold pb-2 transition ${subSeccionPerfil === 'objetivo' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>🎯 Mi Objetivo</button>
            </div>

            {subSeccionPerfil === 'perfil' ? (
              <div className="space-y-4 max-w-md mx-auto text-center">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Nombre</label>
                    <input type="text" value={perfil.nombre} onChange={(e) => setPerfil({...perfil, nombre: e.target.value})} className={`${INPUT_CLS} text-center`} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Fecha Nacimiento</label>
                    <input 
                      type="date" 
                      value={perfil.fecha_nacimiento} 
                      onChange={(e) => setPerfil({...perfil, fecha_nacimiento: e.target.value})} 
                      className={`${INPUT_CLS} text-center font-mono`} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Peso (kg)</label>
                    <CleanNumberInput step="0.1" value={perfil.peso} onChange={(v: number) => setPerfil({...perfil, peso: v})} className={`${INPUT_CLS} text-center font-bold`} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Altura (cm)</label>
                    <CleanNumberInput value={perfil.altura} onChange={(v: number) => setPerfil({...perfil, altura: v})} className={`${INPUT_CLS} text-center font-bold`} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto text-center">
                <div className="max-w-[220px] mx-auto text-center">
                  <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Objetivo Principal</label>
                  <select value={perfil.objetivo} onChange={(e) => setPerfil({...perfil, objetivo: e.target.value as any})} className={`${INPUT_CLS} text-center font-bold`}>
                    <option value="bajar">🔥 Bajar de peso</option>
                    <option value="mantener">⚖️ Mantener peso</option>
                    <option value="subir">💪 Subir de peso</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Kilos Objetivo</label>
                    <CleanNumberInput value={perfil.kilos_objetivo} onChange={(v: number) => setPerfil({...perfil, kilos_objetivo: v})} className={`${INPUT_CLS} text-center font-bold`} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1 text-center">Plazo (Meses)</label>
                    <CleanNumberInput value={perfil.tiempo_objetivo_meses} onChange={(v: number) => setPerfil({...perfil, tiempo_objetivo_meses: v})} className={`${INPUT_CLS} text-center font-bold`} />
                  </div>
                </div>
              </div>
            )}

            <button onClick={guardarPerfil} disabled={guardandoPerfil} className={`${BTN_PRIMARY} max-w-xs mx-auto block`}>
              {guardandoPerfil ? 'Guardando...' : '💾 Guardar Perfil'}
            </button>
          </section>
        )}

        {/* HÁBITOS CON REORDENAMIENTO Y ALINEACIÓN DE HORAS/RACHAS */}
        {seccionActiva === 'habitos' && (
          <section className={`${CARD_CLS} space-y-6 max-w-2xl mx-auto`}>
            <form onSubmit={agregarHabito} className="flex gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80 items-center shadow-inner">
              <input 
                type="text" 
                placeholder="Ej: Meditar 10 min, Leer 20 págs..." 
                value={nuevoHabito} 
                onChange={(e) => setNuevoHabito(e.target.value)} 
                className={`${INPUT_CLS} flex-1`} 
              />
              <input 
                type="time" 
                value={horaObjetivo} 
                onChange={(e) => setHoraObjetivo(e.target.value)} 
                className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-indigo-300 font-mono w-20 text-center shrink-0 outline-none focus:border-indigo-500 font-bold [color-scheme:dark]" 
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shrink-0 transition active:scale-95 shadow-lg shadow-indigo-600/30">
                Añadir
              </button>
            </form>

            <div className="space-y-2.5">
              {habitos.map((h) => {
                const completado = !!registrosHoy[h.id]?.completado;
                const racha = rachasHabitos[h.id] || 0;
                return (
                  <div key={h.id} className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 flex items-center justify-between transition hover:border-slate-700 gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button onClick={() => alternarHabito(h.id)} className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-all ${completado ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-500 shadow-md shadow-indigo-600/40' : 'border-slate-700 hover:border-indigo-500'}`}>
                        {completado && '✓'}
                      </button>
                      <span className={`text-xs font-bold truncate ${completado ? 'line-through text-slate-500' : 'text-slate-100'}`}>{h.texto}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] bg-amber-950/60 text-amber-400 border border-amber-800/80 px-2.5 py-1 rounded-full font-bold shadow-sm whitespace-nowrap flex items-center gap-1">
                        <span>🔥</span>
                        <span>{racha}d</span>
                      </span>
                      <span className="text-indigo-400 font-mono text-xs font-bold bg-indigo-950/50 border border-indigo-800/50 px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1">
                        <span>⏰</span>
                        <span>{h.hora_objetivo}</span>
                      </span>
                      <button onClick={() => eliminarHabito(h.id)} className="text-rose-400 hover:text-rose-300 text-xs p-1 transition hover:scale-110 shrink-0">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* NUTRICIÓN Y ENTRENAMIENTO */}
        {seccionActiva === 'nutricion' && (
          <section className={`${CARD_CLS} max-w-3xl mx-auto space-y-6`}>
            <div className="flex border-b border-slate-800/80 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionNutricion('nutricion')} className={`text-xs font-bold pb-2 transition ${subSeccionNutricion === 'nutricion' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200'}`}>🥗 Nutrición</button>
              <button onClick={() => setSubSeccionNutricion('entrenamiento')} className={`text-xs font-bold pb-2 transition ${subSeccionNutricion === 'entrenamiento' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>🏋️ Actividad Física</button>
            </div>

            {subSeccionNutricion === 'nutricion' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🥗 Comidas del Día</h3>
                  <button onClick={agregarComida} className="text-xs text-amber-400 font-bold hover:underline transition">+ Agregar Comida</button>
                </div>
                
                {comidas.map((item, index) => (
                  <div key={item.id} className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-2 sm:gap-3 transition hover:border-slate-700">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => moverComida(index, 'arriba')} disabled={index === 0} className="text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 px-1.5 py-0.5 rounded transition">▲</button>
                      <button onClick={() => moverComida(index, 'abajo')} disabled={index === comidas.length - 1} className="text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 px-1.5 py-0.5 rounded transition">▼</button>
                    </div>

                    <input type="text" value={item.nombre} onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)} className={INPUT_CLS} />
                    
                    <div className="w-24 shrink-0 text-center">
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">kcal</label>
                      <CleanNumberInput value={item.calorias} onChange={(v: number) => actualizarComida(item.id, 'calorias', v)} className={`${INPUT_CLS} text-center font-bold`} />
                    </div>

                    <button onClick={() => eliminarComida(item.id)} className="text-rose-400 hover:text-rose-300 text-xs p-1 shrink-0 transition hover:scale-110">🗑️</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🏋️ Actividades Registradas</h3>
                  <button onClick={agregarEjercicio} className="text-xs text-indigo-400 font-bold hover:underline transition">+ Agregar Ejercicio</button>
                </div>

                {ejercicios.map((item, index) => (
                  <div key={item.id} className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-2 sm:gap-3 transition hover:border-slate-700">
                    <div className="flex flex-col gap-0.5 shrink-0 mt-3">
                      <button onClick={() => moverEjercicio(index, 'arriba')} disabled={index === 0} className="text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 px-1.5 py-0.5 rounded transition">▲</button>
                      <button onClick={() => moverEjercicio(index, 'abajo')} disabled={index === ejercicios.length - 1} className="text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 px-1.5 py-0.5 rounded transition">▼</button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-slate-400 block text-center mb-1 font-medium">Tipo de Actividad</label>
                      <select value={item.tipo} onChange={(e) => actualizarEjercicio(item.id, 'tipo', e.target.value as TipoEjercicio)} className={`${INPUT_CLS} w-full text-center truncate font-semibold`}>
                        <option value="">Seleccionar tipo...</option>
                        <option value="fuerza">🏋️ Fuerza / Gimnasio</option>
                        <option value="running">🏃 Running / Carrera</option>
                        <option value="ciclismo">🚴 Ciclismo</option>
                        <option value="boxeo">🥊 Boxeo</option>
                        <option value="futbol">⚽ Fútbol</option>
                        <option value="natacion">🏊 Natación</option>
                        <option value="caminata">🚶 Caminata</option>
                        <option value="funcional">🤸 Funcional / HIIT</option>
                        <option value="otro">⚡ Otro</option>
                      </select>
                    </div>

                    <div className="w-20 shrink-0 text-center">
                      <label className="text-[10px] text-amber-400 block text-center mb-1 font-bold">Kcal</label>
                      <CleanNumberInput value={item.calorias} onChange={(v: number) => actualizarEjercicio(item.id, 'calorias', v)} className={`${INPUT_CLS} text-center font-bold px-1`} />
                    </div>

                    <button onClick={() => eliminarEjercicio(item.id)} className="text-rose-400 hover:text-rose-300 text-xs p-1 shrink-0 mt-4 transition hover:scale-110">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* HIDRATACIÓN Y SUEÑO */}
        {seccionActiva === 'extra' && (
          <section className={`${CARD_CLS} max-w-md mx-auto space-y-6`}>
            <div className="flex border-b border-slate-800/80 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionExtra('agua')} className={`text-xs font-bold pb-2 transition ${subSeccionExtra === 'agua' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>💧 Hidratación</button>
              <button onClick={() => setSubSeccionExtra('sueno')} className={`text-xs font-bold pb-2 transition ${subSeccionExtra === 'sueno' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400 hover:text-slate-200'}`}>😴 Descanso</button>
            </div>

            {subSeccionExtra === 'agua' ? (
              <div className="space-y-5 text-center">
                <p className="text-4xl font-black text-cyan-400 drop-shadow-md">{(aguaMl / 1000).toFixed(2)} <span className="text-sm font-semibold text-slate-500">/ 2.50 L</span></p>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400 font-semibold px-1">
                    <span>Progreso</span>
                    <span>{Math.min(100, Math.round((aguaMl / metaAguaMl) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-300 shadow-cyan-500/50" style={{ width: `${Math.min(100, (aguaMl / metaAguaMl) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-center gap-2.5 pt-2">
                  <button onClick={() => modificarAgua(250)} className="bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 font-bold px-3.5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-md">+250 ml</button>
                  <button onClick={() => modificarAgua(500)} className="bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 font-bold px-3.5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-md">+500 ml</button>
                  <button onClick={() => modificarAgua(-250)} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold px-3.5 py-2.5 rounded-xl text-xs transition active:scale-95">-250 ml</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-center">
                <p className="text-4xl font-black text-violet-400 drop-shadow-md">{suenoHoy.horas_totales} <span className="text-sm font-semibold text-slate-500">/ 8.0 hrs</span></p>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400 font-semibold px-1">
                    <span>Progreso</span>
                    <span>{Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
                    <div className="bg-violet-500 h-full rounded-full transition-all duration-300 shadow-violet-500/50" style={{ width: `${Math.min(100, (suenoHoy.horas_totales / 8) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 items-center pt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Acostarse</label>
                    <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_acostarse: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 outline-none w-28 text-center font-bold [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Levantarse</label>
                    <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_levantarse: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 outline-none w-28 text-center font-bold [color-scheme:dark]" />
                  </div>
                </div>

                <button onClick={guardarSueno} className={BTN_PRIMARY}>💾 Guardar Sueño</button>
              </div>
            )}
          </section>
        )}

        {/* NOVEDADES Y SOPORTE */}
        {seccionActiva === 'actualizaciones' && (
          <section className={`${CARD_CLS} max-w-lg mx-auto space-y-6`}>
            <div className="flex border-b border-slate-800/80 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionActualizaciones('novedades')} className={`text-xs font-bold pb-2 transition ${subSeccionActualizaciones === 'novedades' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>🚀 Novedades</button>
              <button onClick={() => setSubSeccionActualizaciones('soporte')} className={`text-xs font-bold pb-2 transition ${subSeccionActualizaciones === 'soporte' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>💬 Soporte</button>
            </div>

            {subSeccionActualizaciones === 'novedades' ? (
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 space-y-2.5">
                <p className="font-bold text-slate-100 text-sm">Versión de la app: {ULTIMA_ACTUALIZACION_APP}</p>
                <p>• Corrección total de renderizado de emojis en títulos y encabezados.</p>
                <p>• Guardado automático instantáneo activado en Nutrición, Ejercicios e Hidratación.</p>
                <p>• Cuadro de fecha de nacimiento redimensionado a tamaño idéntico al resto de inputs.</p>
                <p>• Campo de entrada de hábitos ampliado con hora compacta y badges alineados.</p>
              </div>
            ) : (
              <form onSubmit={enviarSoporte} className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <select value={tipoSoporte} onChange={(e) => setTipoSoporte(e.target.value)} className={`${INPUT_CLS} font-semibold`}>
                  <option value="" disabled>-- Tipo de mensaje --</option>
                  <option value="Sugerencia">💡 Sugerencia</option>
                  <option value="Duda">❓ Duda</option>
                  <option value="Error">⚠️ Reporte de error</option>
                </select>
                <textarea rows={4} value={mensajeSoporte} onChange={(e) => setMensajeSoporte(e.target.value)} placeholder="Escribe tu mensaje..." className={INPUT_CLS} required />
                <button type="submit" className={BTN_PRIMARY}>✉️ Enviar Comentario</button>
              </form>
            )}
          </section>
        )}

      </main>
    </div>
  );
}