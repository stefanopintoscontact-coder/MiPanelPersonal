'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// FECHA Y HORA REAL DINÁMICA DE ÚLTIMA ACTUALIZACIÓN
const obtenerFechaUltimaActualizacion = () => {
  if (typeof window === 'undefined') return '29/07/2026 18:00';
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
};

const ULTIMA_ACTUALIZACION_APP = obtenerFechaUltimaActualizacion();

// --- INTERFACES ---
interface PerfilUsuario {
  nombre: string;
  fecha_nacimiento: string;
  peso: number;
  altura: number; // en cm
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
  racha_actual?: number;
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
  proteinas?: number;
  carbs?: number;
  grasas?: number;
}

interface EjercicioGimnasio {
  id: string;
  nombre: string;
  tipo?: 'gimnasio' | 'running' | 'ciclismo' | 'boxeo' | 'natacion' | 'caminata' | 'otro';
  series?: number;
  repeticiones?: number;
  peso?: number; // en kg
  duracion_minutos?: number;
  distancia_km?: number;
  calorias: number;
}

interface ClimaData {
  temp: number;
  codigoClima: number;
  recomendacion: string;
  descripcion: string;
  ubicacion: string;
  icono: string;
}

interface RegistroSueno {
  id?: number;
  fecha: string;
  hora_acostarse: string;
  hora_levantarse: string;
  horas_totales: number;
  calidad: number;
}

const FRASES_MOTIVACIONALES = [
  "«El éxito es la suma de pequeños esfuerzos repetidos día tras día.»",
  "«La disciplina es construir el puente entre tus metas y tus logros.»",
  "«No cuentes los días, haz que los días cuenten.»",
  "«Tu versión del futuro te agradecerá la constancia de hoy.»",
  "«Un pequeño avance diario genera resultados gigantes al final del año.»",
  "«La constancia vence a la motivación cuando la motivación falta.»",
  "«Haz hoy lo que otros no quieren para vivir mañana como otros no pueden.»"
];

const COMIDAS_POR_DEFECTO: ItemComida[] = [
  { id: '1', nombre: 'Desayuno', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 },
  { id: '2', nombre: 'Almuerzo', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 },
  { id: '3', nombre: 'Merienda', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 },
  { id: '4', nombre: 'Cena', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 },
  { id: '5', nombre: 'Extra', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 },
];

// --- FUNCIONES AUXILIARES ---
const obtenerFechaLogica = () => {
  const ahora = new Date();
  const fechaAjustada = new Date(ahora.getTime() - 4 * 60 * 60 * 1000);
  return fechaAjustada.toISOString().split('T')[0];
};

const obtenerHora24 = (fechaISO?: string) => {
  const d = fechaISO ? new Date(fechaISO) : new Date();
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
};

const formatearFechaLarga = (fechaStr: string) => {
  if (!fechaStr) return '';
  const [year, month, day] = fechaStr.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  const str = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getEstadoBarra = (pct: number) => {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  if (pct >= 50) return { bar: 'bg-amber-500', text: 'text-amber-400' };
  return { bar: 'bg-rose-500', text: 'text-rose-400' };
};

export default function Home() {
  // ESTADOS DE AUTENTICACIÓN
  const [session, setSession] = useState<any>(null);
  const [esRegistro, setEsRegistro] = useState(false);
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');

  // ESTADOS DE LA APP
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'perfil' | 'habitos' | 'nutricion' | 'extra' | 'notas' | 'estadisticas' | 'actualizaciones'>('general');
  const [subSeccionExtra, setSubSeccionExtra] = useState<'agua' | 'sueno'>('agua');
  
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [horaVivo, setHoraVivo] = useState<string>('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(obtenerFechaLogica());
  const [clima, setClima] = useState<ClimaData | null>(null);

  const [mostrarModalOnboarding, setMostrarModalOnboarding] = useState(false);

  // Perfil del Usuario
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

  // Hábitos
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [registrosHoy, setRegistrosHoy] = useState<Record<number, RegistroHabito>>({});
  const [todosLosRegistrosHabitos, setTodosLosRegistrosHabitos] = useState<RegistroHabito[]>([]);
  const [rachasHabitos, setRachasHabitos] = useState<Record<number, number>>({});
  const [nuevoHabito, setNuevoHabito] = useState('');
  const [horaObjetivo, setHoraObjetivo] = useState('18:00');

  const habitosOrdenados = useMemo(() => {
    return [...habitos].sort((a, b) => {
      const hA = a.hora_objetivo || '00:00';
      const hB = b.hora_objetivo || '00:00';
      return hA.localeCompare(hB);
    });
  }, [habitos]);

  // Nutrición / Calorías / Gimnasio
  const [ejercicios, setEjercicios] = useState<EjercicioGimnasio[]>([]);
  const [comidas, setComidas] = useState<ItemComida[]>(COMIDAS_POR_DEFECTO);
  const [bibliotecaComidas, setBibliotecaComidas] = useState<ItemComida[]>([]);
  const [busquedaBiblioteca, setBusquedaBiblioteca] = useState('');
  const [guardandoCalorias, setGuardandoCalorias] = useState(false);

  // Modal IA Comidas
  const [comidaIaModal, setComidaIaModal] = useState<ItemComida | null>(null);
  const [nombreIaModalInput, setNombreIaModalInput] = useState('');
  const [textoIaInput, setTextoIaInput] = useState('');
  const [imagenesIaInput, setImagenesIaInput] = useState<string[]>([]);
  const [procesandoIa, setProcesandoIa] = useState(false);

  // Hidratación
  const [aguaMl, setAguaMl] = useState<number>(0);
  const metaAguaMl = 2500;

  // Sueño
  const [suenoHoy, setSuenoHoy] = useState<RegistroSueno>({
    fecha: fechaSeleccionada,
    hora_acostarse: '23:00',
    hora_levantarse: '07:00',
    horas_totales: 0,
    calidad: 3,
  });

  // Notas
  const [notaDiaria, setNotaDiaria] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Formulario Soporte
  const [tipoSoporte, setTipoSoporte] = useState<'bug' | 'reclamo' | 'recomendacion'>('bug');
  const [mensajeSoporte, setMensajeSoporte] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const bib = localStorage.getItem('biblioteca_comidas_user');
    if (bib) {
      try { setBibliotecaComidas(JSON.parse(bib)); } catch (e) {}
    }
  }, []);

  const cambiarSeccion = (id: typeof seccionActiva) => {
    setSeccionActiva(id);
    setSidebarAbierto(false);
  };

  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date();
      const h = String(ahora.getHours()).padStart(2, '0');
      const m = String(ahora.getMinutes()).padStart(2, '0');
      const s = String(ahora.getSeconds()).padStart(2, '0');
      setHoraVivo(`${h}:${m}:${s}`);

      const nuevaFechaLogica = obtenerFechaLogica();
      setFechaSeleccionada((prev) => (prev !== nuevaFechaLogica ? nuevaFechaLogica : prev));
    };
    actualizarReloj();
    const timer = setInterval(actualizarReloj, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    obtenerClimaYUbicacion();
  }, []);

  useEffect(() => {
    if (session?.user) {
      cargarDatos();
    }
  }, [fechaSeleccionada, session]);

  const manejarAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAuth('');
    setCargandoAuth(true);

    try {
      if (esRegistro) {
        const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.signUp({
          email: emailAuth,
          password: passwordAuth,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        alert('✅ Registro exitoso. Se envió un correo de confirmación a tu casilla.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailAuth,
          password: passwordAuth,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorAuth(err.message || 'Error al autenticar');
    } finally {
      setCargandoAuth(false);
    }
  };

  const iniciarSesionGoogle = async () => {
    setErrorAuth('');
    setCargandoAuth(true);
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorAuth(err.message || 'Error al iniciar sesión con Google.');
      setCargandoAuth(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  const probabilidadCalculada = useMemo(() => {
    if (perfil.objetivo === 'mantener') return 95;
    if (!perfil.kilos_objetivo || perfil.kilos_objetivo <= 0 || !perfil.tiempo_objetivo_meses || perfil.tiempo_objetivo_meses <= 0) return 50;

    const kgPorMes = perfil.kilos_objetivo / perfil.tiempo_objetivo_meses;
    if (kgPorMes <= 2.0) return 95;
    if (kgPorMes <= 3.5) return 80;
    if (kgPorMes <= 5.0) return 60;
    if (kgPorMes <= 6.5) return 40;
    return 20;
  }, [perfil.objetivo, perfil.kilos_objetivo, perfil.tiempo_objetivo_meses]);

  useEffect(() => {
    setPerfil(prev => ({ ...prev, porcentaje_probabilidad: probabilidadCalculada }));
  }, [probabilidadCalculada]);

  const obtenerClimaYUbicacion = () => {
    const cacheClima = localStorage.getItem('clima_cache');
    const cacheTime = localStorage.getItem('clima_cache_time');
    const ahora = Date.now();

    if (cacheClima && cacheTime && (ahora - Number(cacheTime) < 3600000)) {
      try {
        setClima(JSON.parse(cacheClima));
        return;
      } catch (e) {}
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const resClima = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const dataClima = await resClima.json();

            let textoUbicacion = 'Tu ubicación';
            try {
              const resGeo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
              const dataGeo = await resGeo.json();
              const ciudad = dataGeo.city || dataGeo.locality || '';
              const pais = dataGeo.countryName || '';
              if (ciudad && pais) textoUbicacion = `${ciudad}, ${pais}`;
            } catch (geoErr) {}

            if (dataClima.current_weather) {
              const temp = Math.round(dataClima.current_weather.temperature);
              const code = dataClima.current_weather.weathercode;
              const isDay = dataClima.current_weather.is_day === 1;
              const hora = new Date().getHours();
              const esNoche = !isDay || hora >= 20 || hora < 7;
              
              let desc = esNoche ? 'Noche Despejada' : 'Despejado';
              let icono = esNoche ? '🌙' : '☀️';
              let rec = 'Día ideal para realizar tus actividades físicas.';

              if (code >= 51 && code <= 67) { desc = 'Lluvia'; icono = '🌧️'; rec = '⚠️ Lluvia en tu zona. Entrená en interiores.'; }

              const objClima = { temp, codigoClima: code, descripcion: desc, recomendacion: rec, ubicacion: textoUbicacion, icono };
              setClima(objClima);
              localStorage.setItem('clima_cache', JSON.stringify(objClima));
              localStorage.setItem('clima_cache_time', String(Date.now()));
            }
          } catch (e) {}
        },
        () => {
          setClima({ temp: 18, codigoClima: 0, descripcion: 'Templado', recomendacion: 'Temperatura agradable.', ubicacion: 'Local', icono: '🌤️' });
        },
        { maximumAge: 3600000, timeout: 8000 }
      );
    }
  };

  const calcularRachas = async (listaHabitos: Habito[]) => {
    const user = session?.user;
    if (!user) return;

    const { data: historial } = await supabase.from('registro_habitos').select('habito_id, fecha, completado').eq('user_id', user.id).eq('completado', true).order('fecha', { ascending: false });
    if (!historial) return;

    setTodosLosRegistrosHabitos(historial);

    const mapaRachas: Record<number, number> = {};
    listaHabitos.forEach((h) => {
      const registrosDeHabito = historial.filter((r) => r.habito_id === h.id);
      let racha = 0;
      let fechaActual = new Date();

      for (let i = 0; i < 30; i++) {
        const strFecha = fechaActual.toISOString().split('T')[0];
        const exist = registrosDeHabito.some((r) => r.fecha === strFecha);
        if (exist) { racha++; fechaActual.setDate(fechaActual.getDate() - 1); } 
        else if (i === 0) { fechaActual.setDate(fechaActual.getDate() - 1); } 
        else { break; }
      }
      mapaRachas[h.id] = racha;
    });
    setRachasHabitos(mapaRachas);
  };

  const cargarDatos = async () => {
    const user = session?.user;
    if (!user) return;
    setCargando(true);

    const onboardingCompletado = localStorage.getItem(`onboarding_completado_${user.id}`);
    const { data: datosPerfil } = await supabase.from('perfil_usuario').select('*').eq('user_id', user.id).maybeSingle();
    
    if (datosPerfil && datosPerfil.nombre && datosPerfil.nombre.trim() !== '') {
      setPerfil({
        ...datosPerfil,
        fecha_nacimiento: datosPerfil.fecha_nacimiento || '2000-01-01',
        tiempo_objetivo_meses: datosPerfil.tiempo_objetivo_meses || 3
      });
      setMostrarModalOnboarding(false);
      localStorage.setItem(`onboarding_completado_${user.id}`, 'true');
    } else if (onboardingCompletado === 'true') {
      setMostrarModalOnboarding(false);
    } else {
      const nombreGoogle = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      setPerfil((prev) => ({
        ...prev,
        nombre: datosPerfil?.nombre || nombreGoogle || prev.nombre,
      }));
      setMostrarModalOnboarding(true);
    }

    const { data: datosHabitos } = await supabase.from('habitos').select('*').eq('user_id', user.id);
    if (datosHabitos) {
      setHabitos(datosHabitos);
      calcularRachas(datosHabitos);
    }

    const { data: datosRegistros } = await supabase.from('registro_habitos').select('*').eq('user_id', user.id).eq('fecha', fechaSeleccionada);
    const mapaRegistros: Record<number, RegistroHabito> = {};
    if (datosRegistros) datosRegistros.forEach((reg) => { mapaRegistros[reg.habito_id] = reg; });
    setRegistrosHoy(mapaRegistros);

    const { data: datosCalorias } = await supabase.from('registro_calorias').select('*').eq('user_id', user.id).eq('fecha', fechaSeleccionada).maybeSingle();
    if (datosCalorias) {
      setAguaMl(datosCalorias.agua_ml ?? 0);
      setEjercicios(datosCalorias.ejercicios && Array.isArray(datosCalorias.ejercicios) ? datosCalorias.ejercicios : []);
      if (datosCalorias.comidas && Array.isArray(datosCalorias.comidas) && datosCalorias.comidas.length > 0) {
        setComidas(datosCalorias.comidas);
      } else {
        setComidas(COMIDAS_POR_DEFECTO);
      }
    } else {
      setAguaMl(0);
      setEjercicios([]);
      setComidas(COMIDAS_POR_DEFECTO);
    }

    const { data: datosSueno } = await supabase.from('registro_sueno').select('*').eq('user_id', user.id).eq('fecha', fechaSeleccionada).maybeSingle();
    if (datosSueno) {
      setSuenoHoy(datosSueno);
    } else {
      setSuenoHoy({ fecha: fechaSeleccionada, hora_acostarse: '23:00', hora_levantarse: '07:00', horas_totales: 0, calidad: 3 });
    }

    const { data: datosNota } = await supabase.from('notas_diarias').select('contenido').eq('user_id', user.id).eq('fecha', fechaSeleccionada).maybeSingle();
    setNotaDiaria(datosNota?.contenido || '');

    setCargando(false);
  };

  const bmrCalculado = useMemo(() => {
    if (!perfil.fecha_nacimiento || !perfil.peso || !perfil.altura) return 1500;
    const hoy = new Date();
    const cumple = new Date(perfil.fecha_nacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;

    let bmr = (10 * perfil.peso) + (6.25 * perfil.altura) - (5 * (isNaN(edad) ? 25 : edad));
    return Math.round(perfil.sexo === 'masculino' ? bmr + 5 : bmr - 161);
  }, [perfil]);

  // AUTOGUARDADO AUTOMÁTICO DE COMIDAS Y ENTRENAMIENTO SIN BORRAR DATOS
  useEffect(() => {
    if (!session?.user || cargando) return;
    const timer = setTimeout(() => {
      supabase.from('registro_calorias').upsert({
        user_id: session.user.id,
        fecha: fechaSeleccionada,
        base: bmrCalculado,
        agua_ml: aguaMl,
        ejercicios,
        comidas
      }, { onConflict: 'user_id,fecha' });
    }, 600);

    return () => clearTimeout(timer);
  }, [comidas, ejercicios, aguaMl, bmrCalculado, fechaSeleccionada, session, cargando]);

  const guardarPerfil = async () => {
    const user = session?.user;
    if (!user) return false;

    setGuardandoPerfil(true);
    try {
      const payloadPerfil = {
        user_id: user.id,
        nombre: perfil.nombre.trim(),
        fecha_nacimiento: perfil.fecha_nacimiento || '2000-01-01',
        peso: Number(perfil.peso) || 70,
        altura: Number(perfil.altura) || 170,
        sexo: perfil.sexo,
        objetivo: perfil.objetivo,
        kilos_objetivo: Number(perfil.kilos_objetivo) || 0,
        tiempo_objetivo_meses: Number(perfil.tiempo_objetivo_meses) || 1,
        porcentaje_probabilidad: Number(perfil.porcentaje_probabilidad) || 50
      };

      const { error } = await supabase.from('perfil_usuario').upsert(payloadPerfil, { onConflict: 'user_id' });
      if (error) throw error;

      localStorage.setItem(`onboarding_completado_${user.id}`, 'true');
      alert('✅ Perfil guardado correctamente');
      setMostrarModalOnboarding(false);
      return true;
    } catch (err: any) {
      alert('❌ Error al guardar perfil: ' + err.message);
      return false;
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const agregarHabito = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = session?.user;
    if (!nuevoHabito.trim() || !user) return;

    const { data, error } = await supabase.from('habitos').insert([{ user_id: user.id, texto: nuevoHabito, hora_objetivo: horaObjetivo }]).select();
    if (error) alert('❌ Error: ' + error.message);
    else if (data) { 
      setHabitos([...habitos, data[0]]); 
      setNuevoHabito(''); 
    }
  };

  const alternarHabito = async (habitoId: number) => {
    const user = session?.user;
    if (!user) return;

    const estaCompletado = !!registrosHoy[habitoId]?.completado;
    const horaActual = obtenerHora24();

    if (!estaCompletado) {
      const { error } = await supabase.from('registro_habitos').upsert({ user_id: user.id, habito_id: habitoId, fecha: fechaSeleccionada, completado: true, hora_completado: horaActual }, { onConflict: 'user_id,habito_id,fecha' });
      if (!error) {
        setRegistrosHoy((prev) => ({ ...prev, [habitoId]: { habito_id: habitoId, completado: true, hora_completado: horaActual } }));
        calcularRachas(habitos);
      }
    } else {
      const { error } = await supabase.from('registro_habitos').delete().eq('user_id', user.id).eq('habito_id', habitoId).eq('fecha', fechaSeleccionada);
      if (!error) {
        setRegistrosHoy((prev) => { const copia = { ...prev }; delete copia[habitoId]; return copia; });
        calcularRachas(habitos);
      }
    }
  };

  const eliminarHabito = async (id: number) => {
    const user = session?.user;
    if (!user || !window.confirm('¿Eliminar hábito?')) return;
    const { error } = await supabase.from('habitos').delete().eq('user_id', user.id).eq('id', id);
    if (!error) setHabitos(habitos.filter((h) => h.id !== id));
  };

  // --- NUTRICIÓN Y ENTRENAMIENTO ---
  const agregarEjercicio = () => setEjercicios([...ejercicios, { 
    id: Date.now().toString(), 
    nombre: 'Nuevo Ejercicio', 
    tipo: 'gimnasio', 
    series: 4, 
    repeticiones: 10, 
    peso: 0, 
    duracion_minutos: 30, 
    distancia_km: 0, 
    calorias: 0 
  }]);

  const actualizarEjercicio = (id: string, campo: keyof EjercicioGimnasio, valor: any) => setEjercicios(ejercicios.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));
  
  const eliminarEjercicio = (id: string) => {
    if (!window.confirm('¿Eliminar ejercicio?')) return;
    setEjercicios(ejercicios.filter((item) => item.id !== id));
  };

  const moverEjercicio = async (index: number, direccion: 'arriba' | 'abajo') => {
    const nuevoIndice = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndice < 0 || nuevoIndice >= ejercicios.length) return;
    const copia = [...ejercicios];
    const [removido] = copia.splice(index, 1);
    copia.splice(nuevoIndice, 0, removido);
    setEjercicios(copia);
  };

  const calcularCaloriasEjercicioIA = (item: EjercicioGimnasio) => {
    const pesoUser = perfil.peso || 70;
    let cal = 0;
    if (item.tipo === 'gimnasio' || !item.tipo) {
      cal = (item.series || 1) * (item.repeticiones || 10) * ((item.peso || 0) * 0.012 + 0.4) * (pesoUser / 75);
    } else {
      cal = (item.duracion_minutos || 30) * (6.0 * 3.5 * pesoUser / 200);
    }
    const resultadoFinal = Math.round(cal);
    actualizarEjercicio(item.id, 'calorias', resultadoFinal);
    alert(`🤖 IA: ~${resultadoFinal} kcal quemadas.`);
  };

  const agregarComida = () => setComidas([...comidas, { id: Date.now().toString(), nombre: 'Nueva Comida', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 }]);
  
  const actualizarComida = (id: string, campo: keyof ItemComida, valor: any) => {
    setComidas((prevComidas) =>
      prevComidas.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };
  
  const eliminarComida = (id: string) => {
    if (!window.confirm('¿Eliminar comida?')) return;
    setComidas(comidas.filter((item) => item.id !== id));
  };

  const moverComida = async (index: number, direccion: 'arriba' | 'abajo') => {
    const nuevoIndice = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndice < 0 || nuevoIndice >= comidas.length) return;
    const copia = [...comidas];
    const [removido] = copia.splice(index, 1);
    copia.splice(nuevoIndice, 0, removido);
    setComidas(copia);
  };

  const guardarEnBiblioteca = (comida: ItemComida) => {
    if (!comida.nombre || comida.nombre.trim() === '') return;
    const nuevaBib = [...bibliotecaComidas.filter(b => b.nombre.toLowerCase() !== comida.nombre.toLowerCase()), { ...comida, id: Date.now().toString() }];
    setBibliotecaComidas(nuevaBib);
    localStorage.setItem('biblioteca_comidas_user', JSON.stringify(nuevaBib));
    alert(`⭐ Guardado en Biblioteca.`);
  };

  const cargarDesdeBiblioteca = (comidaBib: ItemComida) => {
    const nombreNormalizado = comidaBib.nombre.trim().toLowerCase();
    const indexExistente = comidas.findIndex(c => c.nombre.trim().toLowerCase() === nombreNormalizado);

    if (indexExistente !== -1) {
      const nuevasComidas = [...comidas];
      nuevasComidas[indexExistente] = { ...nuevasComidas[indexExistente], calorias: comidaBib.calorias, proteinas: comidaBib.proteinas || 0, carbs: comidaBib.carbs || 0, grasas: comidaBib.grasas || 0 };
      setComidas(nuevasComidas);
    } else {
      setComidas([...comidas, { ...comidaBib, id: Date.now().toString() }]);
    }
    alert(`⚡ Cargado en tu menú.`);
  };

  const eliminarDeBiblioteca = (id: string) => {
    const nuevaBib = bibliotecaComidas.filter(b => b.id !== id);
    setBibliotecaComidas(nuevaBib);
    localStorage.setItem('biblioteca_comidas_user', JSON.stringify(nuevaBib));
  };

  const abrirModalIaComida = (comida: ItemComida) => {
    setComidaIaModal(comida);
    setNombreIaModalInput(comida.nombre);
    setTextoIaInput('');
    setImagenesIaInput([]);
  };

  const procesarFotoIA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) setImagenesIaInput((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  // ESTIMADOR CON IA CALIBRADO Y GUARDADO AUTOMÁTICO INMEDIATO
  const estimarComidaConIA = async () => {
    if (!comidaIaModal) return;
    setProcesandoIa(true);

    const promptTexto = `${comidaIaModal.nombre} ${textoIaInput}`.trim().toLowerCase();
    let resCal = 350, resP = 25, resC = 35, resG = 10;

    const baseAlimentos = [
      { nombres: ['arroz', 'fideos', 'pasta'], calPerGram: 1.3, pPerGram: 0.04, cPerGram: 0.28, gPerGram: 0.01, defaultPortion: 150 },
      { nombres: ['pollo', 'pechuga'], calPerGram: 1.65, pPerGram: 0.31, cPerGram: 0, gPerGram: 0.035, defaultPortion: 150 },
      { nombres: ['carne', 'vacuna', 'bife', 'lomo'], calPerGram: 2.1, pPerGram: 0.26, cPerGram: 0, gPerGram: 0.12, defaultPortion: 180 },
      { nombres: ['huevo', 'huevos'], calPerGram: 1.4, pPerGram: 0.13, cPerGram: 0.01, gPerGram: 0.10, defaultPortion: 100 },
      { nombres: ['avena'], calPerGram: 3.8, pPerGram: 0.13, cPerGram: 0.66, gPerGram: 0.07, defaultPortion: 50 },
      { nombres: ['banana', 'plátano', 'platano'], calPerGram: 0.9, pPerGram: 0.01, cPerGram: 0.23, gPerGram: 0.003, defaultPortion: 120 },
      { nombres: ['manzana'], calPerGram: 0.52, pPerGram: 0.003, cPerGram: 0.14, gPerGram: 0.002, defaultPortion: 150 },
      { nombres: ['naranja'], calPerGram: 0.47, pPerGram: 0.009, cPerGram: 0.12, gPerGram: 0.001, defaultPortion: 150 },
      { nombres: ['pan', 'tostada'], calPerGram: 2.5, pPerGram: 0.09, cPerGram: 0.48, gPerGram: 0.03, defaultPortion: 60 },
      { nombres: ['atún', 'atun'], calPerGram: 1.2, pPerGram: 0.25, cPerGram: 0, gPerGram: 0.02, defaultPortion: 120 },
      { nombres: ['café', 'cafe'], calPerGram: 0.5, pPerGram: 0.01, cPerGram: 0.05, gPerGram: 0.01, defaultPortion: 200 }
    ];

    let matched = false;
    let calAcc = 0, pAcc = 0, cAcc = 0, gAcc = 0;

    for (const al of baseAlimentos) {
      const found = al.nombres.some(n => promptTexto.includes(n));
      if (found) {
        matched = true;
        const matchNum = promptTexto.match(new RegExp(`(?:${al.nombres.join('|')})[^\\d]*(\\d+)`, 'i')) || promptTexto.match(/(\d+)/);
        const gramos = matchNum ? parseInt(matchNum[1], 10) : al.defaultPortion;
        const porcionReal = gramos > 5 && gramos < 1000 ? gramos : al.defaultPortion;
        calAcc += al.calPerGram * porcionReal;
        pAcc += al.pPerGram * porcionReal;
        cAcc += al.cPerGram * porcionReal;
        gAcc += al.gPerGram * porcionReal;
      }
    }

    if (matched && calAcc > 0) {
      resCal = Math.round(calAcc);
      resP = Math.round(pAcc);
      resC = Math.round(cAcc);
      resG = Math.round(gAcc);
    } else if (promptTexto.length > 3) {
      resCal = 420;
      resP = 28;
      resC = 42;
      resG = 12;
    }

    const nuevoNombre = nombreIaModalInput.trim() || comidaIaModal.nombre;

    const nuevasComidas = comidas.map((item) =>
      item.id === comidaIaModal.id
        ? { ...item, nombre: nuevoNombre, calorias: resCal, proteinas: resP, carbs: resC, grasas: resG }
        : item
    );

    setComidas(nuevasComidas);
    setProcesandoIa(false);
    setComidaIaModal(null);

    // Guardado automático inmediato en Supabase tras calcular con IA
    if (session?.user) {
      await supabase.from('registro_calorias').upsert({
        user_id: session.user.id,
        fecha: fechaSeleccionada,
        base: bmrCalculado,
        agua_ml: aguaMl,
        ejercicios,
        comidas: nuevasComidas
      }, { onConflict: 'user_id,fecha' });
    }

    alert(`🤖 IA: Estimado "${nuevoNombre}" -> ${resCal} kcal | ${resP}g P | ${resC}g C | ${resG}g G`);
  };

  const modificarAgua = async (deltaMl: number) => {
    const user = session?.user;
    if (!user) return;
    const nuevaCantidad = Math.max(0, aguaMl + deltaMl);
    setAguaMl(nuevaCantidad);
    await supabase.from('registro_calorias').upsert({ user_id: user.id, fecha: fechaSeleccionada, agua_ml: nuevaCantidad, base: bmrCalculado, ejercicios, comidas }, { onConflict: 'user_id,fecha' });
  };

  const guardarCalorias = async () => {
    const user = session?.user;
    if (!user) return;
    setGuardandoCalorias(true);
    const { error } = await supabase.from('registro_calorias').upsert({ user_id: user.id, fecha: fechaSeleccionada, base: bmrCalculado, agua_ml: aguaMl, ejercicios, comidas }, { onConflict: 'user_id,fecha' });
    setGuardandoCalorias(false);
    if (error) alert('❌ Error: ' + error.message);
    else alert('✅ Nutrición guardada correctamente');
  };

  const guardarSueno = async () => {
    const user = session?.user;
    if (!user) return;

    const [hA, mA] = suenoHoy.hora_acostarse.split(':').map(Number);
    const [hL, mL] = suenoHoy.hora_levantarse.split(':').map(Number);
    let minAcostado = hA * 60 + mA;
    let minLevantado = hL * 60 + mL;
    if (minLevantado < minAcostado) minLevantado += 24 * 60;
    const duracionHoras = parseFloat(((minLevantado - minAcostado) / 60).toFixed(1));

    const datosGuardar = { ...suenoHoy, user_id: user.id, fecha: fechaSeleccionada, horas_totales: duracionHoras };
    const { error } = await supabase.from('registro_sueno').upsert(datosGuardar, { onConflict: 'user_id,fecha' });
    if (error) alert('❌ Error: ' + error.message);
    else {
      setSuenoHoy(datosGuardar);
      alert('✅ Sueño guardado correctamente');
    }
  };

  const guardarNota = async () => {
    const user = session?.user;
    if (!user) return;
    setGuardandoNota(true);
    const { error } = await supabase.from('notas_diarias').upsert({ user_id: user.id, fecha: fechaSeleccionada, contenido: notaDiaria }, { onConflict: 'user_id,fecha' });
    setGuardandoNota(false);
    if (!error) alert('✅ Nota guardada');
  };

  // CÁLCULOS
  const totalCompletados = habitos.filter((h) => registrosHoy[h.id]?.completado).length;
  const porcentajeHabitos = habitos.length > 0 ? Math.round((totalCompletados / habitos.length) * 100) : 0;

  const totalGastoEjercicios = ejercicios.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const totalGastadoCal = bmrCalculado + totalGastoEjercicios;
  const totalIngeridoCal = comidas.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const balanceCalorico = totalIngeridoCal - totalGastadoCal;

  const totalProteinas = comidas.reduce((acc, item) => acc + Number(item.proteinas || 0), 0);
  const totalCarbs = comidas.reduce((acc, item) => acc + Number(item.carbs || 0), 0);
  const totalGrasas = comidas.reduce((acc, item) => acc + Number(item.grasas || 0), 0);

  const evaluacionNutricion = useMemo(() => {
    let nota = 0;
    let mensaje = '';
    const b = balanceCalorico;
    
    if (perfil.objetivo === 'bajar') {
      if (b <= -200 && b >= -800) { nota = 10; mensaje = '¡Excelente déficit para quemar grasa!'; }
      else if (b < -800) { nota = 5; mensaje = '⚠️ Déficit excesivo. Riesgo muscular.'; }
      else if (b < 0) { nota = 8; mensaje = 'Buen déficit ligero.'; }
      else { nota = 5; mensaje = 'Superávit o mantenimiento. No estás bajando peso.'; }
    } else if (perfil.objetivo === 'subir') {
      if (b >= 200 && b <= 600) { nota = 10; mensaje = '¡Superávit ideal para ganancia muscular!'; }
      else { nota = 7; mensaje = 'Ajusta tus calorías para asegurar hipertrofia.'; }
    } else {
      nota = Math.abs(b) <= 150 ? 10 : 7;
      mensaje = 'Mantenimiento en curso.';
    }
    return { nota: Math.max(0, Math.min(10, Math.round(nota))), mensaje };
  }, [balanceCalorico, perfil.objetivo]);

  const pctCalorias = evaluacionNutricion.nota * 10;
  const pctAgua = Math.min(100, Math.round((aguaMl / metaAguaMl) * 100));
  const pctSueño = Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100));

  const diaNumero = parseInt(fechaSeleccionada.split('-')[2] || '1', 10);
  const fraseDelDia = FRASES_MOTIVACIONALES[diaNumero % FRASES_MOTIVACIONALES.length];

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-indigo-400">💪 Personal Fitness App</h1>
            <p className="text-xs text-slate-400">{esRegistro ? 'Crea tu cuenta' : 'Inicia sesión'}</p>
          </div>

          {errorAuth && <div className="bg-rose-950 text-rose-200 text-xs p-3 rounded-xl border border-rose-800">⚠️ {errorAuth}</div>}

          <button onClick={iniciarSesionGoogle} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-700 cursor-pointer">
            Continuar con Google
          </button>

          <form onSubmit={manejarAuth} className="space-y-4">
            <input type="email" required value={emailAuth} onChange={(e) => setEmailAuth(e.target.value)} placeholder="tu@email.com" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white" />
            <input type="password" required value={passwordAuth} onChange={(e) => setPasswordAuth(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white" />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl text-sm cursor-pointer">{esRegistro ? 'Registrarse' : 'Iniciar Sesión'}</button>
          </form>

          <button onClick={() => setEsRegistro(!esRegistro)} className="w-full text-center text-xs text-slate-400 hover:text-indigo-400 cursor-pointer">
            {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row font-sans">
      
      {/* BARRA LATERAL */}
      <aside className={`bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 ${sidebarAbierto ? 'fixed inset-0 z-50 w-full h-full md:relative md:inset-auto md:w-64 md:h-auto overflow-y-auto' : 'w-full md:w-16'}`}>
        <div>
          <div className="p-3 sm:p-4 flex items-center justify-between border-b border-slate-800">
            <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="p-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer flex items-center gap-2">
              <span className="text-xs font-bold uppercase">{sidebarAbierto ? '✕' : '☰'}</span>
            </button>
            {session?.user && (
              <button onClick={() => cambiarSeccion('perfil')} className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl cursor-pointer">
                <span className="text-xs font-extrabold text-indigo-400">{perfil.nombre || 'Perfil'} 👋</span>
              </button>
            )}
          </div>

          <nav className={`p-2 sm:p-3 ${sidebarAbierto ? 'flex flex-col space-y-2' : 'flex flex-row md:flex-col overflow-x-auto gap-1.5 md:space-y-1.5 justify-around md:justify-start'}`}>
            {[
              { id: 'general', label: 'General', icon: '📊' },
              { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
              { id: 'habitos', label: 'Hábitos', icon: '⚡' },
              { id: 'nutricion', label: 'Nutrición', icon: '🔥' },
              { id: 'extra', label: 'Extra', icon: '✨' },
              { id: 'estadisticas', label: 'Estadísticas', icon: '📈' },
              { id: 'actualizaciones', label: 'Actualización', icon: '🚀' },
              { id: 'notas', label: 'Notas', icon: '📝' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => cambiarSeccion(item.id as any)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer shrink-0 ${
                  seccionActiva === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                } ${sidebarAbierto ? 'w-full justify-start text-base py-3' : 'justify-center'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarAbierto && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {sidebarAbierto && (
          <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3 mt-auto">
            <button onClick={cerrarSesion} className="w-full bg-rose-950/60 border border-rose-800 text-rose-300 font-bold py-2 rounded-xl text-xs cursor-pointer">🚪 Cerrar Sesión</button>
            <div className="text-[11px] text-slate-400 text-center">🚀 Versión: <span className="text-indigo-400">{ULTIMA_ACTUALIZACION_APP}</span></div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">Fecha Activa</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 cursor-pointer"/>
            </div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto">
        <header className="flex flex-col gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-100">
                {seccionActiva === 'general' && '📊 Resumen General'}
                {seccionActiva === 'perfil' && '👤 Mi Perfil y Objetivos'}
                {seccionActiva === 'habitos' && '⚡ Hábitos Diarios'}
                {seccionActiva === 'nutricion' && '🔥 Nutrición y Entrenamiento'}
                {seccionActiva === 'extra' && '✨ Módulos Extra (Agua y Sueño)'}
                {seccionActiva === 'notas' && '📝 Notas Diarias'}
                {seccionActiva === 'estadisticas' && '📈 Visualización y Estadísticas'}
                {seccionActiva === 'actualizaciones' && '🚀 Novedades y Soporte'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-indigo-400">📅 {formatearFechaLarga(fechaSeleccionada)}</span>
                <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">🕒 {horaVivo || '00:00'}</span>
              </div>
            </div>
          </div>

          {clima && (
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <span className="text-2xl">{clima.icono}</span>
              <div className="text-left">
                <span className="font-bold text-sm">{clima.temp}°C - {clima.descripcion}</span>
                <p className="text-xs text-indigo-300">{clima.recomendacion}</p>
              </div>
            </div>
          )}
        </header>

        <div className="mb-6 bg-indigo-950/40 border border-indigo-800/50 p-3 rounded-xl text-center text-indigo-300 text-xs italic">
          {fraseDelDia}
        </div>

        {cargando ? (
          <div className="text-center py-16 text-slate-400 font-medium">Cargando datos... ⏳</div>
        ) : (
          <div>
            {/* GENERAL CON BARRAS DE PORCENTAJE RESTAURADAS */}
            {seccionActiva === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div onClick={() => cambiarSeccion('nutricion')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-amber-500 transition">
                    <span className="text-xs text-slate-400">Balance Calórico</span>
                    <p className={`text-2xl font-extrabold mt-2 ${balanceCalorico < 0 ? 'text-amber-400' : 'text-rose-400'}`}>{balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico}</p>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800 overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${pctCalorias}%` }}></div>
                    </div>
                  </div>
                  <div onClick={() => { cambiarSeccion('extra'); setSubSeccionExtra('agua'); }} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-cyan-500 transition">
                    <span className="text-xs text-slate-400">Agua Diaria</span>
                    <p className="text-2xl font-extrabold text-cyan-400 mt-2">{(aguaMl / 1000).toFixed(2)}L</p>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800 overflow-hidden">
                      <div className="bg-cyan-500 h-full transition-all" style={{ width: `${pctAgua}%` }}></div>
                    </div>
                  </div>
                  <div onClick={() => cambiarSeccion('habitos')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-indigo-500 transition">
                    <span className="text-xs text-slate-400">Hábitos</span>
                    <p className="text-2xl font-extrabold text-indigo-400 mt-2">{porcentajeHabitos}%</p>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800 overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${porcentajeHabitos}%` }}></div>
                    </div>
                  </div>
                  <div onClick={() => cambiarSeccion('perfil')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-slate-400 transition">
                    <span className="text-xs text-slate-400">Peso / Éxito</span>
                    <p className="text-xl font-extrabold text-slate-200 mt-2">{perfil.peso} kg</p>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800 overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${perfil.porcentaje_probabilidad}%` }}></div>
                    </div>
                  </div>
                  <div onClick={() => { cambiarSeccion('extra'); setSubSeccionExtra('sueno'); }} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-indigo-400 transition">
                    <span className="text-xs text-slate-400">Sueño</span>
                    <p className="text-xl font-extrabold text-indigo-300 mt-2">{suenoHoy.horas_totales} hrs</p>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800 overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${pctSueño}%` }}></div>
                    </div>
                  </div>
                </div>

                <div onClick={() => cambiarSeccion('notas')} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-amber-500 transition">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">📌 Nota rápida del día</h3>
                  <p className="text-xs text-slate-300 italic">{notaDiaria || 'Sin notas registradas hoy.'}</p>
                </div>
              </div>
            )}

            {/* PERFIL */}
            {seccionActiva === 'perfil' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-200">👤 Mi Perfil y Objetivos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                      <input type="text" value={perfil.nombre} onChange={(e) => setPerfil({...perfil, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Fecha de Nacimiento</label>
                      <input type="date" value={perfil.fecha_nacimiento} onChange={(e) => setPerfil({...perfil, fecha_nacimiento: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Peso (kg)</label>
                        <input type="number" step="0.1" value={perfil.peso} onChange={(e) => setPerfil({...perfil, peso: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Altura (cm)</label>
                        <input type="number" value={perfil.altura} onChange={(e) => setPerfil({...perfil, altura: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Objetivo Principal</label>
                      <select value={perfil.objetivo} onChange={(e) => setPerfil({...perfil, objetivo: e.target.value as any})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
                        <option value="bajar">Bajar de peso (Déficit)</option>
                        <option value="mantener">Mantener peso</option>
                        <option value="subir">Subir de peso (Masa muscular)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Kilos Objetivo</label>
                        <input type="number" step="0.1" value={perfil.kilos_objetivo} onChange={(e) => setPerfil({...perfil, kilos_objetivo: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Plazo (Meses)</label>
                        <input type="number" value={perfil.tiempo_objetivo_meses} onChange={(e) => setPerfil({...perfil, tiempo_objetivo_meses: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={guardarPerfil} disabled={guardandoPerfil} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl cursor-pointer">
                  {guardandoPerfil ? 'Guardando...' : '💾 Guardar Perfil'}
                </button>
              </section>
            )}

            {/* HÁBITOS (BOTÓN CORREGIDO DENTRO DEL RECUADRO) */}
            {seccionActiva === 'habitos' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-indigo-400">⚡ Hábitos Diarios</h2>
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                    {totalCompletados}/{habitos.length} ({porcentajeHabitos}%)
                  </span>
                </div>

                <form onSubmit={agregarHabito} className="flex flex-col sm:flex-row gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <input type="text" placeholder="Nuevo hábito..." value={nuevoHabito} onChange={(e) => setNuevoHabito(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white" />
                  <input type="time" value={horaObjetivo} onChange={(e) => setHoraObjetivo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 text-sm text-white font-mono py-2" />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer shrink-0">Añadir</button>
                </form>

                <div className="space-y-2.5">
                  {habitosOrdenados.map((h) => {
                    const completado = !!registrosHoy[h.id]?.completado;
                    const racha = rachasHabitos[h.id] || 0;
                    return (
                      <div key={h.id} className={`p-3.5 rounded-xl border flex items-center justify-between ${completado ? 'bg-indigo-950/40 border-indigo-800' : 'bg-slate-900 border-slate-800'}`}>
                        <div className="flex items-center gap-3">
                          <button onClick={() => alternarHabito(h.id)} className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer ${completado ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600'}`}>
                            {completado && '✓'}
                          </button>
                          <div>
                            <p className={`text-sm font-semibold ${completado ? 'line-through text-slate-400' : ''}`}>{h.texto}</p>
                            <p className="text-[11px] text-slate-400">Hora: <span className="text-indigo-300 font-mono">{h.hora_objetivo}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400">🔥 {racha} días</span>
                          <button onClick={() => eliminarHabito(h.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* NUTRICIÓN Y ENTRENAMIENTO */}
            {seccionActiva === 'nutricion' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-amber-400">🏋️ Nutrición y Entrenamiento</h2>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <span className="text-4xl font-black text-amber-400">{evaluacionNutricion.nota}/10</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Objetivo: <span className="text-amber-400 uppercase">{perfil.objetivo}</span></h3>
                    <p className="text-sm text-slate-400">{evaluacionNutricion.mensaje}</p>
                  </div>
                </div>

                {/* MACROS */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-xs text-rose-400 font-bold block">Proteínas</span><span className="text-lg font-bold text-rose-300">{totalProteinas}g</span></div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-xs text-amber-400 font-bold block">Carbs</span><span className="text-lg font-bold text-amber-300">{totalCarbs}g</span></div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-xs text-blue-400 font-bold block">Grasas</span><span className="text-lg font-bold text-blue-300">{totalGrasas}g</span></div>
                </div>

                {/* COMIDAS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400">🥗 Comidas del Día (Desayuno, Almuerzo, etc.)</h3>
                    <button onClick={agregarComida} className="text-xs text-amber-400 cursor-pointer">+ Agregar Comida</button>
                  </div>
                  
                  {comidas.map((item, idx) => (
                    <div key={item.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input type="text" value={item.nombre} onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
                        <button onClick={() => abrirModalIaComida(item)} className="bg-cyan-950 border border-cyan-800 text-cyan-300 px-3 py-1 rounded-lg text-xs cursor-pointer">📷 IA</button>
                        <button onClick={() => guardarEnBiblioteca(item)} className="bg-amber-950 border border-amber-800 text-amber-300 px-2 py-1 rounded-lg text-xs cursor-pointer">⭐</button>
                        <button onClick={() => eliminarComida(item.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer">🗑️</button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div><label className="text-[10px] text-slate-400">Kcal</label><input type="number" value={item.calorias} onChange={(e) => actualizarComida(item.id, 'calorias', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                        <div><label className="text-[10px] text-rose-400">Prot (g)</label><input type="number" value={item.proteinas || 0} onChange={(e) => actualizarComida(item.id, 'proteinas', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                        <div><label className="text-[10px] text-amber-400">Carbs (g)</label><input type="number" value={item.carbs || 0} onChange={(e) => actualizarComida(item.id, 'carbs', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                        <div><label className="text-[10px] text-blue-400">Grasas (g)</label><input type="number" value={item.grasas || 0} onChange={(e) => actualizarComida(item.id, 'grasas', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ENTRENAMIENTO */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400">🏋️ Actividad Física</h3>
                    <button onClick={agregarEjercicio} className="text-xs text-indigo-400 cursor-pointer">+ Agregar Ejercicio</button>
                  </div>
                  {ejercicios.map((item) => (
                    <div key={item.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input type="text" value={item.nombre} onChange={(e) => actualizarEjercicio(item.id, 'nombre', e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
                        <button onClick={() => calcularCaloriasEjercicioIA(item)} className="bg-indigo-950 border border-indigo-800 text-indigo-300 px-3 py-1 rounded-lg text-xs cursor-pointer">🤖 IA</button>
                        <button onClick={() => eliminarEjercicio(item.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer">🗑️</button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div><label className="text-[10px] text-slate-400">Series</label><input type="number" value={item.series || 0} onChange={(e) => actualizarEjercicio(item.id, 'series', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                        <div><label className="text-[10px] text-slate-400">Reps</label><input type="number" value={item.repeticiones || 0} onChange={(e) => actualizarEjercicio(item.id, 'repeticiones', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                        <div><label className="text-[10px] text-slate-400">Peso (kg)</label><input type="number" value={item.peso || 0} onChange={(e) => actualizarEjercicio(item.id, 'peso', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                        <div><label className="text-[10px] text-amber-400">Kcal Quemadas</label><input type="number" value={item.calorias || 0} onChange={(e) => actualizarEjercicio(item.id, 'calorias', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1" /></div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={guardarCalorias} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl cursor-pointer">
                  💾 Guardar Todo
                </button>
              </section>
            )}

            {/* SECCIÓN EXTRA (AGUA Y SUEÑO CON INPUTS ACOMODADOS PARA EVITAR SOLAPAMIENTO) */}
            {seccionActiva === 'extra' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 max-w-xl mx-auto">
                <div className="flex border-b border-slate-700 pb-3 gap-4">
                  <button onClick={() => setSubSeccionExtra('agua')} className={`text-sm font-bold pb-1 cursor-pointer ${subSeccionExtra === 'agua' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>💧 Hidratación</button>
                  <button onClick={() => setSubSeccionExtra('sueno')} className={`text-sm font-bold pb-1 cursor-pointer ${subSeccionExtra === 'sueno' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>😴 Descanso y Sueño</button>
                </div>

                {subSeccionExtra === 'agua' ? (
                  <div className="space-y-4 text-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <span className="text-5xl">💧</span>
                    <h3 className="text-xl font-bold text-cyan-300">Control de Hidratación</h3>
                    <p className="text-3xl font-black text-cyan-400">{(aguaMl / 1000).toFixed(2)} / 2.50 L</p>
                    <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                      <div className="bg-cyan-500 h-full transition-all" style={{ width: `${pctAgua}%` }}></div>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button onClick={() => modificarAgua(250)} className="bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">+250 ml 🥛</button>
                      <button onClick={() => modificarAgua(500)} className="bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">+500 ml 🍾</button>
                      <button onClick={() => modificarAgua(-250)} className="bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl text-xs cursor-pointer">-250 ml</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <span className="text-5xl">😴</span>
                    <h3 className="text-xl font-bold text-indigo-300">Control de Descanso y Sueño</h3>
                    <p className="text-3xl font-black text-indigo-400">{suenoHoy.horas_totales} <span className="text-sm font-normal text-slate-400">/ 8.0 hrs</span></p>
                    <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${pctSueño}%` }}></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Acostarse</label>
                        <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_acostarse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Levantarse</label>
                        <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_levantarse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono" />
                      </div>
                    </div>

                    <div className="text-left pt-1">
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Calidad del Sueño</label>
                      <div className="flex gap-2 justify-center py-2">
                        {[1, 2, 3, 4, 5].map((estrella) => (
                          <button key={estrella} type="button" onClick={() => setSuenoHoy({...suenoHoy, calidad: estrella})} className={`text-2xl cursor-pointer ${suenoHoy.calidad >= estrella ? 'text-amber-400 scale-110' : 'text-slate-600'}`}>★</button>
                        ))}
                      </div>
                    </div>

                    <button onClick={guardarSueno} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer shadow-md">
                      💾 Guardar Sueño
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ESTADÍSTICAS Y VISUALIZACIÓN MEJORADA */}
            {seccionActiva === 'estadisticas' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-indigo-400">📈 Visualización y Estadísticas Comparativas</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-400">🍽️ Consumo Calórico</span>
                    <p className="text-3xl font-black text-amber-400">{totalIngeridoCal} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                      {totalIngeridoCal > 2000 ? '📈 Has consumido más calorías que tu promedio diario habitual.' : '📉 Tu consumo está por debajo o alineado con tu media.'}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-400">🔥 Gasto Energético</span>
                    <p className="text-3xl font-black text-rose-400">{totalGastadoCal} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                      {totalGastoEjercicios > 300 ? '⚡ Gasto alto por actividad física superior al promedio.' : '🚶 Gasto moderado basado en metabolismo basal y actividad ligera.'}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-400">⚖️ Balance Neto</span>
                    <p className={`text-3xl font-black ${balanceCalorico < 0 ? 'text-cyan-400' : 'text-rose-400'}`}>{balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                      {balanceCalorico < -200 ? '🟢 Déficit efectivo activo respecto a tu semana.' : '🟡 En punto de mantenimiento o superávit.'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">📊 Resumen de Rendimiento</h3>
                  <p className="text-xs text-slate-400">Tus hábitos y registro nutricional muestran una constancia del <strong className="text-indigo-400">{porcentajeHabitos}%</strong>. Mantén el enfoque en tu objetivo de <strong className="text-amber-400">{perfil.objetivo}</strong>.</p>
                </div>
              </section>
            )}

            {/* NOTAS */}
            {seccionActiva === 'notas' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-amber-400">📝 Notas Diarias</h2>
                <textarea rows={6} value={notaDiaria} onChange={(e) => setNotaDiaria(e.target.value)} placeholder="Escribe tus reflexiones, sensaciones o notas de entrenamiento de hoy..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-white focus:border-amber-500 outline-none" />
                <button onClick={guardarNota} disabled={guardandoNota} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl cursor-pointer">
                  {guardandoNota ? 'Guardando...' : '💾 Guardar Nota'}
                </button>
              </section>
            )}

            {/* ACTUALIZACIONES Y SOPORTE */}
            {seccionActiva === 'actualizaciones' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-indigo-400">🚀 Novedades y Soporte</h2>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-white">Versión Actual: {ULTIMA_ACTUALIZACION_APP}</p>
                  <p>• Restauración de barras de porcentaje en el resumen general.</p>
                  <p>• Alineación y ajuste responsive del botón "Añadir" en hábitos diarios.</p>
                  <p>• Guardado automático inmediato tras el cálculo de macros por IA.</p>
                  <p>• Calibración precisa del estimador de IA para evitar sobreestimaciones.</p>
                  <p>• Ajuste de inputs de sueño en módulos extra para evitar solapamiento.</p>
                </div>
              </section>
            )}

          </div>
        )}
      </main>

      {/* MODAL IA COMIDA */}
      {comidaIaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-cyan-300">🤖 Estimador Nutricional IA</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre del plato</label>
              <input type="text" value={nombreIaModalInput} onChange={(e) => setNombreIaModalInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Describe los ingredientes (ej: pechuga de pollo 150g con arroz)</label>
              <textarea rows={3} value={textoIaInput} onChange={(e) => setTextoIaInput(e.target.value)} placeholder="Ej: 2 huevos revueltos con una tostada de pan integral..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">O sube foto de tu plato:</label>
              <input type="file" accept="image/*" multiple onChange={procesarFotoIA} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer" />
            </div>
            {imagenesIaInput.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {imagenesIaInput.map((img, idx) => (
                  <img key={idx} src={img} alt="Comida" className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setComidaIaModal(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-sm font-medium cursor-pointer">Cancelar</button>
              <button onClick={estimarComidaConIA} disabled={procesandoIa} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                {procesandoIa ? 'Analizando...' : '✨ Calcular Macros'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}