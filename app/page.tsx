'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// FECHA Y HORA FIJA DE LA ÚLTIMA ACTUALIZACIÓN
const ULTIMA_ACTUALIZACION_APP = '1/8/2026';

// ESTILOS REUTILIZABLES
const INPUT_CLS = "w-full min-w-0 max-w-full box-border bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 transition placeholder:text-slate-500 outline-none";
const BTN_PRIMARY = "w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer shadow-lg active:scale-[0.99]";
const CARD_CLS = "bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl transition-all hover:border-slate-700";

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

  // MANEJO DE REGISTRO E INICIO DE SESIÓN CON CÓDIGO OTP
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
      setHabitos(datosHabitos);
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

  const guardarCaloriasAuto = (nuevosEjercicios?: EjercicioGimnasio[], nuevasComidas?: ItemComida[]) => {
    if (!session?.user) return;
    supabase.from('registro_calorias').upsert({
      user_id: session.user.id,
      fecha: fechaSeleccionada,
      base: bmrCalculado,
      agua_ml: aguaMl,
      ejercicios: nuevosEjercicios || ejercicios,
      comidas: nuevasComidas || comidas
    }, { onConflict: 'user_id,fecha' });
  };

  useEffect(() => {
    if (!session?.user) return;
    const timer = setTimeout(() => guardarCaloriasAuto(), 600);
    return () => clearTimeout(timer);
  }, [comidas, ejercicios, aguaMl, fechaSeleccionada, session]);

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

  // HÁBITOS
  const agregarHabito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHabito.trim() || !session?.user) return;
    const { data, error } = await supabase.from('habitos').insert([{ user_id: session.user.id, texto: nuevoHabito, hora_objetivo: horaObjetivo }]).select();
    if (!error && data) {
      setHabitos([...habitos, data[0]]);
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

  // NUTRICIÓN & EJERCICIOS
  const agregarComida = () => setComidas([...comidas, { id: Date.now().toString(), nombre: 'Nueva Comida', calorias: 0 }]);
  const actualizarComida = (id: string, campo: keyof ItemComida, valor: any) => setComidas(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  const eliminarComida = (id: string) => setComidas(comidas.filter(item => item.id !== id));

  const agregarEjercicio = () => setEjercicios([...ejercicios, { id: Date.now().toString(), tipo: '', calorias: 0 }]);
  const actualizarEjercicio = (id: string, campo: keyof EjercicioGimnasio, valor: any) => setEjercicios(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  const eliminarEjercicio = (id: string) => setEjercicios(ejercicios.filter(item => item.id !== id));

  // HIDRATACIÓN Y SUEÑO
  const modificarAgua = (deltaMl: number) => setAguaMl(prev => Math.max(0, prev + deltaMl));

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

  if (cargandoSesion) return <div className="min-h-screen bg-slate-950 text-indigo-400 flex items-center justify-center">⚡ Cargando...</div>;

  // SESIÓN NO INICIADA
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="text-4xl">💪</span>
            <h1 className="text-2xl font-black text-indigo-400">Personal Fitness App</h1>
            <p className="text-xs text-slate-400">{pasoOTP ? 'Ingresa el código que enviamos a tu email' : esRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</p>
          </div>

          {errorAuth && <div className="bg-rose-950 text-rose-200 text-xs p-3.5 rounded-2xl border border-rose-800 text-center">⚠️ {errorAuth}</div>}

          {pasoOTP ? (
            <form onSubmit={verificarCodigoOTP} className="space-y-4">
              <input type="text" required value={codigoOTP} onChange={(e) => setCodigoOTP(e.target.value)} placeholder="Código de 6 dígitos" className={`${INPUT_CLS} text-center font-mono text-base tracking-widest`} />
              <button type="submit" disabled={cargandoAuth} className={BTN_PRIMARY}>{cargandoAuth ? 'Verificando...' : 'Confirmar Código'}</button>
              <button type="button" onClick={() => setPasoOTP(false)} className="w-full text-xs text-slate-400 hover:text-indigo-400">← Volver al formulario</button>
            </form>
          ) : (
            <form onSubmit={manejarAuth} className="space-y-3.5">
              <input type="email" required value={emailAuth} onChange={(e) => setEmailAuth(e.target.value)} placeholder="tu@email.com" className={INPUT_CLS} />
              
              <div className="relative">
                <input type={mostrarPassword ? "text" : "password"} required value={passwordAuth} onChange={(e) => setPasswordAuth(e.target.value)} placeholder="Contraseña" className={INPUT_CLS} />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200">
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
            <button onClick={() => alternarModoAuth(!esRegistro)} className="w-full text-center text-xs text-slate-400 hover:text-indigo-400">
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* MENÚ LATERAL LISO Y CENTRADO */}
      <aside className={`bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 transition-all flex flex-col justify-between shrink-0 ${sidebarAbierto ? 'fixed inset-0 z-50 w-full h-full md:relative md:w-64' : 'w-full md:w-20'}`}>
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-800">
            <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="p-2 rounded-xl bg-slate-800 text-slate-200">
              <span className="text-sm font-bold">{sidebarAbierto ? '✕' : '☰'}</span>
            </button>
            {/* INDICADOR MORADO ESTÁTICO DERECHA DE BARRA ARRIBA */}
            <div className="bg-indigo-950 border border-indigo-800 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300 flex items-center gap-1.5 select-none">
              {seccionActiva === 'general' && '📊 Resumen'}
              {seccionActiva === 'perfil' && '👤 Mi Perfil'}
              {seccionActiva === 'habitos' && '⚡ Hábitos'}
              {seccionActiva === 'nutricion' && '🔥 Nutrición'}
              {seccionActiva === 'extra' && '✨ Extra'}
              {seccionActiva === 'actualizaciones' && '🚀 Novedades'}
            </div>
          </div>

          <nav className={`p-3 text-center ${sidebarAbierto ? 'flex flex-col space-y-2' : 'flex flex-row md:flex-col overflow-x-auto gap-2 justify-center'}`}>
            {[
              { id: 'general', label: 'General', icon: '📊' },
              { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
              { id: 'habitos', label: 'Hábitos', icon: '⚡' },
              { id: 'nutricion', label: 'Nutrición / Entreno', icon: '🔥' },
              { id: 'extra', label: 'Extra', icon: '✨' },
              { id: 'actualizaciones', label: 'Actualizaciones', icon: '🚀' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setSeccionActiva(item.id as any); setSidebarAbierto(false); }}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition shrink-0 justify-center w-full text-center ${
                  seccionActiva === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarAbierto && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {sidebarAbierto && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3 mt-auto text-center">
            <button onClick={cerrarSesion} className="w-full bg-rose-950 border border-rose-800 text-rose-300 font-bold py-2 rounded-xl text-xs">🚪 Cerrar Sesión</button>
            <div className="text-[10px] text-slate-500 font-mono">🚀 v{ULTIMA_ACTUALIZACION_APP}</div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        
        {/* ENCABEZADO CENTRADO CON EMOJIS */}
        <header className="flex justify-center items-center mb-6 bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center">
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 text-center w-full">
            {seccionActiva === 'general' && '📊 Resumen General 📊'}
            {seccionActiva === 'perfil' && '👤 Mi Perfil y Objetivos 👤'}
            {seccionActiva === 'habitos' && '⚡ Hábitos Diarios ⚡'}
            {seccionActiva === 'nutricion' && '🔥 Nutrición y Entrenamiento 🔥'}
            {seccionActiva === 'extra' && '✨ Extra ✨'}
            {seccionActiva === 'actualizaciones' && '🚀 Novedades y Soporte 🚀'}
          </h2>
        </header>

        {/* RESUMEN GENERAL */}
        {seccionActiva === 'general' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-center">
            
            <div onClick={() => setSeccionActiva('nutricion')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center`}>
              <span className="text-xs text-slate-400 font-medium text-center">Balance Calórico 🔥</span>
              <p className={`text-2xl font-black my-2 text-center ${balanceCalorico < 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {balanceCalorico} <span className="text-xs text-slate-500">kcal</span>
              </p>
              <div className="w-full space-y-1 mt-2">
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, (totalIngresoCalorias / (bmrCalculado || 2000)) * 100))}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500">{Math.min(100, Math.round((totalIngresoCalorias / (bmrCalculado || 2000)) * 100))}% consumido</span>
              </div>
            </div>

            <div onClick={() => setSeccionActiva('extra')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center`}>
              <span className="text-xs text-slate-400 font-medium text-center">Agua Diaria 💧</span>
              <p className="text-2xl font-black text-cyan-400 my-2 text-center">
                {(aguaMl / 1000).toFixed(2)}L <span className="text-xs text-slate-500">/ 2.5L</span>
              </p>
              <div className="w-full space-y-1 mt-2">
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (aguaMl / metaAguaMl) * 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500">{Math.min(100, Math.round((aguaMl / metaAguaMl) * 100))}% completado</span>
              </div>
            </div>

            <div onClick={() => setSeccionActiva('habitos')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center`}>
              <span className="text-xs text-slate-400 font-medium text-center">Hábitos ⚡</span>
              <p className="text-2xl font-black text-indigo-400 my-2 text-center">{porcentajeHabitos}%</p>
              <div className="w-full space-y-1 mt-2">
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${porcentajeHabitos}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500">{totalCompletados} de {habitos.length} listos</span>
              </div>
            </div>

            <div onClick={() => setSeccionActiva('extra')} className={`${CARD_CLS} cursor-pointer text-center flex flex-col justify-between items-center`}>
              <span className="text-xs text-slate-400 font-medium text-center">Sueño 😴</span>
              <p className="text-2xl font-black text-violet-400 my-2 text-center">
                {suenoHoy.horas_totales} <span className="text-xs text-slate-500">hrs</span>
              </p>
              <div className="w-full space-y-1 mt-2">
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (suenoHoy.horas_totales / 8) * 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-500">{Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100))}% meta (8 hrs)</span>
              </div>
            </div>

          </div>
        )}

        {/* MI PERFIL Y OBJETIVOS */}
        {seccionActiva === 'perfil' && (
          <section className={`${CARD_CLS} max-w-xl mx-auto space-y-6`}>
            <div className="flex border-b border-slate-800 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionPerfil('perfil')} className={`text-xs font-bold pb-2 ${subSeccionPerfil === 'perfil' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>👤 Datos Personales</button>
              <button onClick={() => setSubSeccionPerfil('objetivo')} className={`text-xs font-bold pb-2 ${subSeccionPerfil === 'objetivo' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>🎯 Mi Objetivo</button>
            </div>

            {subSeccionPerfil === 'perfil' ? (
              <div className="space-y-4 max-w-md mx-auto text-center">
                {/* NOMBRE Y FECHA DE NACIMIENTO EN LA MISMA LÍNEA Y AJUSTADOS */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center">Nombre</label>
                    <input type="text" value={perfil.nombre} onChange={(e) => setPerfil({...perfil, nombre: e.target.value})} className={`${INPUT_CLS} text-center`} />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-slate-400 block mb-1 text-center">Fecha de Nacimiento</label>
                    <input 
                      type="date" 
                      value={perfil.fecha_nacimiento} 
                      onChange={(e) => setPerfil({...perfil, fecha_nacimiento: e.target.value})} 
                      className="w-full max-w-[140px] bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-[11px] text-slate-100 text-center outline-none" 
                    />
                  </div>
                </div>

                {/* PESO Y ALTURA CON TEXTO CENTRADO ARRIBA */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center">Peso (kg)</label>
                    <input type="number" step="0.1" value={perfil.peso} onChange={(e) => setPerfil({...perfil, peso: Number(e.target.value)})} className={`${INPUT_CLS} text-center`} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center">Altura (cm)</label>
                    <input type="number" value={perfil.altura} onChange={(e) => setPerfil({...perfil, altura: Number(e.target.value)})} className={`${INPUT_CLS} text-center`} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto text-center">
                {/* OBJETIVO RECORTADO Y CENTRADO */}
                <div className="max-w-[220px] mx-auto text-center">
                  <label className="text-xs text-slate-400 block mb-1 text-center">Objetivo Principal</label>
                  <select value={perfil.objetivo} onChange={(e) => setPerfil({...perfil, objetivo: e.target.value as any})} className={`${INPUT_CLS} text-center`}>
                    <option value="bajar">🔥 Bajar de peso</option>
                    <option value="mantener">⚖️ Mantener peso</option>
                    <option value="subir">💪 Subir de peso</option>
                  </select>
                </div>

                {/* KILOS Y PLAZO CON TEXTO CENTRADO ARRIBA */}
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center">Kilos Objetivo</label>
                    <input type="number" value={perfil.kilos_objetivo} onChange={(e) => setPerfil({...perfil, kilos_objetivo: Number(e.target.value)})} className={`${INPUT_CLS} text-center`} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center">Plazo (Meses)</label>
                    <input type="number" value={perfil.tiempo_objetivo_meses} onChange={(e) => setPerfil({...perfil, tiempo_objetivo_meses: Number(e.target.value)})} className={`${INPUT_CLS} text-center`} />
                  </div>
                </div>
              </div>
            )}

            <button onClick={guardarPerfil} disabled={guardandoPerfil} className={`${BTN_PRIMARY} max-w-xs mx-auto block`}>
              {guardandoPerfil ? 'Guardando...' : '💾 Guardar Perfil'}
            </button>
          </section>
        )}

        {/* HÁBITOS */}
        {seccionActiva === 'habitos' && (
          <section className={`${CARD_CLS} space-y-6 max-w-2xl mx-auto`}>
            <form onSubmit={agregarHabito} className="flex gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 items-center">
              <input type="text" placeholder="Habito" value={nuevoHabito} onChange={(e) => setNuevoHabito(e.target.value)} className={INPUT_CLS} />
              <input type="time" value={horaObjetivo} onChange={(e) => setHoraObjetivo(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-100 font-mono w-24 shrink-0 outline-none" />
              <button type="submit" className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0">Añadir</button>
            </form>

            <div className="space-y-2">
              {habitos.map((h) => {
                const completado = !!registrosHoy[h.id]?.completado;
                const racha = rachasHabitos[h.id] || 0;
                return (
                  <div key={h.id} className="p-3 rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => alternarHabito(h.id)} className={`w-6 h-6 rounded-lg border flex items-center justify-center ${completado ? 'bg-indigo-600 text-white border-indigo-500' : 'border-slate-700'}`}>
                        {completado && '✓'}
                      </button>
                      <span className={`text-xs font-semibold ${completado ? 'line-through text-slate-500' : 'text-slate-100'}`}>{h.texto}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* CONTADOR DE RACHAS */}
                      <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2.5 py-0.5 rounded-full font-bold">🔥 {racha} días</span>
                      <span className="text-indigo-400 font-mono text-xs">{h.hora_objetivo}</span>
                      <button onClick={() => eliminarHabito(h.id)} className="text-rose-400 text-xs">🗑️</button>
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
            <div className="flex border-b border-slate-800 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionNutricion('nutricion')} className={`text-xs font-bold pb-2 ${subSeccionNutricion === 'nutricion' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'}`}>🥗 Nutrición</button>
              <button onClick={() => setSubSeccionNutricion('entrenamiento')} className={`text-xs font-bold pb-2 ${subSeccionNutricion === 'entrenamiento' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>🏋️ Actividad Física</button>
            </div>

            {subSeccionNutricion === 'nutricion' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase text-slate-400">🥗 Comidas del Día</h3>
                  <button onClick={agregarComida} className="text-xs text-amber-400 font-bold hover:underline">+ Agregar Comida</button>
                </div>
                
                {comidas.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                    <input type="text" value={item.nombre} onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)} className={INPUT_CLS} />
                    <div className="w-24 shrink-0 text-center">
                      <label className="text-[10px] text-slate-400 block mb-1">kcal</label>
                      <input type="number" value={item.calorias} onChange={(e) => actualizarComida(item.id, 'calorias', Number(e.target.value))} className={`${INPUT_CLS} text-center`} />
                    </div>
                    <button onClick={() => eliminarComida(item.id)} className="text-rose-400 text-xs p-1 shrink-0">🗑️</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase text-slate-400">🏋️ Actividades Registradas</h3>
                  <button onClick={agregarEjercicio} className="text-xs text-indigo-400 font-bold hover:underline">+ Agregar Ejercicio</button>
                </div>

                {ejercicios.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                    {/* TIPO DE ACTIVIDAD CON TODO EL ESPACIO DISPONIBLE */}
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-slate-400 block text-center mb-1">Tipo de Actividad</label>
                      <select value={item.tipo} onChange={(e) => actualizarEjercicio(item.id, 'tipo', e.target.value as TipoEjercicio)} className={`${INPUT_CLS} w-full text-center truncate`}>
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

                    {/* KCAL COMPACTO PARA 4 DÍGITOS MAXIMO */}
                    <div className="w-20 shrink-0 text-center">
                      <label className="text-[10px] text-amber-400 block text-center mb-1">Kcal</label>
                      <input type="number" value={item.calorias} onChange={(e) => actualizarEjercicio(item.id, 'calorias', Number(e.target.value))} className={`${INPUT_CLS} text-center px-1`} />
                    </div>

                    <button onClick={() => eliminarEjercicio(item.id)} className="text-rose-400 text-xs p-1 shrink-0 mt-4">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* HIDRATACIÓN Y SUEÑO */}
        {seccionActiva === 'extra' && (
          <section className={`${CARD_CLS} max-w-md mx-auto space-y-6`}>
            <div className="flex border-b border-slate-800 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionExtra('agua')} className={`text-xs font-bold pb-2 ${subSeccionExtra === 'agua' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>💧 Hidratación</button>
              <button onClick={() => setSubSeccionExtra('sueno')} className={`text-xs font-bold pb-2 ${subSeccionExtra === 'sueno' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400'}`}>😴 Descanso</button>
            </div>

            {subSeccionExtra === 'agua' ? (
              <div className="space-y-4 text-center">
                <p className="text-3xl font-black text-cyan-400">{(aguaMl / 1000).toFixed(2)} <span className="text-sm font-normal text-slate-500">/ 2.50 L</span></p>

                {/* BARRA DE PORCENTAJE HIDRATACIÓN */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Progreso</span>
                    <span>{Math.min(100, Math.round((aguaMl / metaAguaMl) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (aguaMl / metaAguaMl) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-center gap-2 pt-2">
                  <button onClick={() => modificarAgua(250)} className="bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold px-3 py-2 rounded-xl text-xs">+250 ml</button>
                  <button onClick={() => modificarAgua(500)} className="bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold px-3 py-2 rounded-xl text-xs">+500 ml</button>
                  <button onClick={() => modificarAgua(-250)} className="bg-slate-900 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl text-xs">-250 ml</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-3xl font-black text-violet-400">{suenoHoy.horas_totales} <span className="text-sm font-normal text-slate-500">/ 8.0 hrs</span></p>

                {/* BARRA DE PORCENTAJE DESCANSO */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Progreso</span>
                    <span>{Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (suenoHoy.horas_totales / 8) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-center gap-3 items-center pt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Acostarse</label>
                    <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_acostarse: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs font-mono text-slate-100 outline-none w-24 text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Levantarse</label>
                    <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_levantarse: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs font-mono text-slate-100 outline-none w-24 text-center" />
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
            <div className="flex border-b border-slate-800 pb-3 gap-6 justify-center">
              <button onClick={() => setSubSeccionActualizaciones('novedades')} className={`text-xs font-bold pb-2 ${subSeccionActualizaciones === 'novedades' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>🚀 Novedades</button>
              <button onClick={() => setSubSeccionActualizaciones('soporte')} className={`text-xs font-bold pb-2 ${subSeccionActualizaciones === 'soporte' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>💬 Soporte</button>
            </div>

            {subSeccionActualizaciones === 'novedades' ? (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-slate-100">Versión de la app: {ULTIMA_ACTUALIZACION_APP}</p>
                <p>• Rediseño visual con menús lisos centrados y alineación de componentes.</p>
                <p>• Indicador superior estático de sección sincronizado con el contenido.</p>
                <p>• Ajuste de simetría en el cuadro de fecha de nacimiento.</p>
                <p>• Ampliación de anchura en selector de tipo de actividad física.</p>
              </div>
            ) : (
              <form onSubmit={enviarSoporte} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <select value={tipoSoporte} onChange={(e) => setTipoSoporte(e.target.value)} className={INPUT_CLS}>
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