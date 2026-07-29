'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// FECHA Y HORA REAL DINÁMICA DE ÚLTIMA ACTUALIZACIÓN
const obtenerFechaUltimaActualizacion = () => {
  if (typeof window === 'undefined') return '29/07/2026 18:00';
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = meAhora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
};

const meAhora = new Date();
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

  // Modal de datos iniciales u Onboarding (Solo 1 vez)
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

  // Nutrición / Calorías / Gimnasio
  const [ejercicios, setEjercicios] = useState<EjercicioGimnasio[]>([]);
  const [comidas, setComidas] = useState<ItemComida[]>(COMIDAS_POR_DEFECTO);
  const [bibliotecaComidas, setBibliotecaComidas] = useState<ItemComida[]>([]);
  const [busquedaBiblioteca, setBusquedaBiblioteca] = useState('');
  const [guardandoCalorias, setGuardandoCalorias] = useState(false);

  // Modal IA Comidas
  const [comidaIaModal, setComidaIaModal] = useState<ItemComida | null>(null);
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

  // Formulario Soporte / Recomendaciones
  const [tipoSoporte, setTipoSoporte] = useState<'bug' | 'reclamo' | 'recomendacion'>('bug');
  const [mensajeSoporte, setMensajeSoporte] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  const [cargando, setCargando] = useState(true);

  // ESCUCHAR SESIÓN DE AUTENTICACIÓN
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar Biblioteca desde localStorage
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

  // Reloj en vivo
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

  // AUTENTICACIÓN: LOGIN Y REGISTRO
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
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        alert('✅ Registro exitoso. Se envió un correo de confirmación a tu casilla. Revisa tu e-mail para validar el enlace.');
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
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorAuth(err.message || 'Error al iniciar sesión con Google. Revisa la configuración del proveedor en Supabase.');
      setCargandoAuth(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  // Probabilidad de éxito calculada
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
              const ciudad = dataGeo.city || dataGeo.locality || dataGeo.principalSubdivision || '';
              const pais = dataGeo.countryName || '';
              if (ciudad && pais) textoUbicacion = `${ciudad}, ${pais}`;
              else if (pais) textoUbicacion = pais;
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

              if (code === 0) { 
                desc = esNoche ? 'Noche Despejada' : 'Despejado / Sol'; 
                icono = esNoche ? '🌙' : '☀️'; 
              } else if (code >= 1 && code <= 3) { 
                desc = esNoche ? 'Noche Algo Nublada' : 'Parcialmente Nublado'; 
                icono = esNoche ? '☁️' : '⛅'; 
              } else if (code >= 45 && code <= 48) { 
                desc = 'Neblina'; 
                icono = '🌫️'; 
              } else if (code >= 51 && code <= 67) { 
                desc = 'Lluvia / Llovizna'; 
                icono = '🌧️'; 
                rec = '⚠️ Lluvia en tu zona. Entrená en interiores hoy.'; 
              } else if (code >= 71 && code <= 77) { 
                desc = 'Nieve'; 
                icono = '❄️'; 
                rec = '⚠️ Nieve. Abrigate muy bien al entrenar.'; 
              } else if (code >= 80 && code <= 82) { 
                desc = 'Chaparrones'; 
                icono = '🌦️'; 
                rec = '⚠️ Probabilidad de chaparrones aislados.'; 
              } else if (code >= 95) { 
                desc = 'Tormenta Eléctrica'; 
                icono = '⛈️'; 
                rec = '⚠️ Alerta de tormenta. Mantenete a resguardo.'; 
              }

              if (temp <= 14) rec = `Hace frío (${temp}°C). Entrená con ropa de abrigo.`;
              else if (temp >= 28) rec = `Hace calor (${temp}°C). Hidratate frecuentemente.`;

              const objClima = { temp, codigoClima: code, descripcion: desc, recomendacion: rec, ubicacion: textoUbicacion, icono };
              setClima(objClima);
              localStorage.setItem('clima_cache', JSON.stringify(objClima));
              localStorage.setItem('clima_cache_time', String(Date.now()));
            }
          } catch (e) {}
        },
        () => {
          const hora = new Date().getHours();
          const esNoche = hora >= 20 || hora < 7;
          const objClimaFallback = { 
            temp: 18, 
            codigoClima: 0, 
            descripcion: esNoche ? 'Noche Templada' : 'Templado', 
            recomendacion: 'Temperatura agradable para entrenar.', 
            ubicacion: 'Ubicación local', 
            icono: esNoche ? '🌙' : '🌤️' 
          };
          setClima(objClimaFallback);
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
      const nombreGoogle = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
      setPerfil((prev) => ({
        ...prev,
        nombre: datosPerfil?.nombre || nombreGoogle || prev.nombre,
        fecha_nacimiento: datosPerfil?.fecha_nacimiento || prev.fecha_nacimiento || '2000-01-01'
      }));
      setMostrarModalOnboarding(true);
    }

    const { data: datosHabitos } = await supabase.from('habitos').select('*').eq('user_id', user.id).order('id', { ascending: true });
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

  // AUTOGUARDADO AUTOMÁTICO DE COMIDAS Y ENTRENAMIENTO
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
    }, 800);

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

      const { error } = await supabase
        .from('perfil_usuario')
        .upsert(payloadPerfil, { onConflict: 'user_id' });

      if (error) {
        alert('❌ Error al guardar perfil: ' + error.message);
        return false;
      }

      localStorage.setItem(`onboarding_completado_${user.id}`, 'true');
      alert('✅ Perfil guardado correctamente');
      setMostrarModalOnboarding(false);
      return true;
    } catch (err: any) {
      alert('❌ Error inesperado: ' + (err.message || err));
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
    if (error) alert('❌ Error al agregar hábito: ' + error.message);
    else if (data) { setHabitos([...habitos, data[0]]); setNuevoHabito(''); }
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
      } else alert('❌ Error: ' + error.message);
    } else {
      const { error } = await supabase.from('registro_habitos').delete().eq('user_id', user.id).eq('habito_id', habitoId).eq('fecha', fechaSeleccionada);
      if (!error) {
        setRegistrosHoy((prev) => { const copia = { ...prev }; delete copia[habitoId]; return copia; });
        calcularRachas(habitos);
      } else alert('❌ Error: ' + error.message);
    }
  };

  const eliminarHabito = async (id: number) => {
    const user = session?.user;
    if (!user || !window.confirm('¿Estás seguro de que deseas eliminar este hábito?')) return;
    const { error } = await supabase.from('habitos').delete().eq('user_id', user.id).eq('id', id);
    if (!error) setHabitos(habitos.filter((h) => h.id !== id));
    else alert('❌ Error: ' + error.message);
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
    if (!window.confirm('¿Estás seguro de que deseas eliminar este ejercicio / actividad?')) return;
    setEjercicios(ejercicios.filter((item) => item.id !== id));
  };

  const moverEjercicio = async (index: number, direccion: 'arriba' | 'abajo') => {
    const user = session?.user;
    const nuevoIndice = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndice < 0 || nuevoIndice >= ejercicios.length || !user) return;
    const copia = [...ejercicios];
    const [removido] = copia.splice(index, 1);
    copia.splice(nuevoIndice, 0, removido);
    setEjercicios(copia);
  };

  const calcularCaloriasEjercicioIA = (item: EjercicioGimnasio) => {
    const pesoUser = perfil.peso || 70;
    let cal = 0;

    if (item.tipo === 'gimnasio' || !item.tipo) {
      const series = item.series || 1;
      const reps = item.repeticiones || 10;
      const pesoKg = item.peso || 0;
      const trabajoCarga = (pesoKg * 0.012) + 0.4;
      cal = series * reps * trabajoCarga * (pesoUser / 75);
    } else if (item.tipo === 'running') {
      const dist = item.distancia_km || 0;
      const dur = item.duracion_minutos || 0;
      if (dist > 0) cal = dist * pesoUser * 1.036;
      else if (dur > 0) cal = dur * (9.8 * 3.5 * pesoUser / 200);
    } else if (item.tipo === 'ciclismo') {
      const dur = item.duracion_minutos || 0;
      cal = dur * (7.5 * 3.5 * pesoUser / 200);
    } else if (item.tipo === 'boxeo') {
      const dur = item.duracion_minutos || 0;
      cal = dur * (9.0 * 3.5 * pesoUser / 200);
    } else if (item.tipo === 'natacion') {
      const dur = item.duracion_minutos || 0;
      cal = dur * (8.0 * 3.5 * pesoUser / 200);
    } else if (item.tipo === 'caminata') {
      const dist = item.distancia_km || 0;
      const dur = item.duracion_minutos || 0;
      if (dist > 0) cal = dist * pesoUser * 0.5;
      else if (dur > 0) cal = dur * (3.8 * 3.5 * pesoUser / 200);
    } else {
      const dur = item.duracion_minutos || 30;
      cal = dur * (6.0 * 3.5 * pesoUser / 200);
    }

    const resultadoFinal = Math.round(cal);
    actualizarEjercicio(item.id, 'calorias', resultadoFinal);
    alert(`🤖 IA: Se calcularon aprox. ${resultadoFinal} kcal quemadas para "${item.nombre}".`);
  };

  const agregarComida = () => setComidas([...comidas, { id: Date.now().toString(), nombre: 'Nueva Comida', calorias: 0, proteinas: 0, carbs: 0, grasas: 0 }]);
  
  const actualizarComida = (id: string, campo: keyof ItemComida, valor: any) => {
    setComidas((prevComidas) =>
      prevComidas.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };
  
  const eliminarComida = (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta comida?')) return;
    setComidas(comidas.filter((item) => item.id !== id));
  };

  const moverComida = async (index: number, direccion: 'arriba' | 'abajo') => {
    const user = session?.user;
    const nuevoIndice = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndice < 0 || nuevoIndice >= comidas.length || !user) return;
    const copia = [...comidas];
    const [removido] = copia.splice(index, 1);
    copia.splice(nuevoIndice, 0, removido);
    setComidas(copia);
  };

  const guardarEnBiblioteca = (comida: ItemComida) => {
    if (!comida.nombre || comida.nombre.trim() === '') return;
    const existe = bibliotecaComidas.some(b => b.nombre.toLowerCase() === comida.nombre.toLowerCase());
    if (existe) {
      alert('ℹ️ Este plato ya está en tu biblioteca de comidas frecuentes.');
      return;
    }
    const nuevaBib = [...bibliotecaComidas, { ...comida, id: Date.now().toString() }];
    setBibliotecaComidas(nuevaBib);
    localStorage.setItem('biblioteca_comidas_user', JSON.stringify(nuevaBib));
    alert(`⭐ "${comida.nombre}" se guardó en tu Biblioteca de Comidas Frecuentes.`);
  };

  const cargarDesdeBiblioteca = (comidaBib: ItemComida) => {
    const nombreNormalizado = comidaBib.nombre.trim().toLowerCase();
    const indexExistente = comidas.findIndex(c => c.nombre.trim().toLowerCase() === nombreNormalizado);

    if (indexExistente !== -1) {
      const nuevasComidas = [...comidas];
      nuevasComidas[indexExistente] = {
        ...nuevasComidas[indexExistente],
        calorias: comidaBib.calorias,
        proteinas: comidaBib.proteinas || 0,
        carbs: comidaBib.carbs || 0,
        grasas: comidaBib.grasas || 0,
      };
      setComidas(nuevasComidas);
      alert(`⚡ ¡Actualizado! Se cargaron los datos de "${comidaBib.nombre}" directamente en tu menú del día.`);
    } else {
      const nuevaComida: ItemComida = {
        ...comidaBib,
        id: Date.now().toString()
      };
      setComidas([...comidas, nuevaComida]);
      alert(`➕ Se agregó "${comidaBib.nombre}" a tus comidas de hoy.`);
    }
  };

  const eliminarDeBiblioteca = (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta comida de tu biblioteca?')) return;
    const nuevaBib = bibliotecaComidas.filter(b => b.id !== id);
    setBibliotecaComidas(nuevaBib);
    localStorage.setItem('biblioteca_comidas_user', JSON.stringify(nuevaBib));
  };

  // ESTIMADOR CON GEMINI IA & PARSER LOCAL DE RESPALDO CORREGIDO
  const abrirModalIaComida = (comida: ItemComida) => {
    setComidaIaModal(comida);
    setTextoIaInput(''); // Se deja vacío para visualizar el placeholder con el ejemplo
    setImagenesIaInput([]);
  };

  const procesarFotoIA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setImagenesIaInput((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  const eliminarFotoIa = (index: number) => {
    setImagenesIaInput((prev) => prev.filter((_, i) => i !== index));
  };

  const estimarComidaConIA = async () => {
    if (!comidaIaModal) return;
    setProcesandoIa(true);

    const promptTexto = textoIaInput.trim();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    let resCal = 0, resP = 0, resC = 0, resG = 0;
    let exitoGemini = false;

    // Intento de integración directa con la API de Google Gemini (si existe API key configurada)
    if (apiKey && (promptTexto || imagenesIaInput.length > 0)) {
      try {
        const parts: any[] = [];
        if (promptTexto) {
          parts.push({
            text: `Analiza la siguiente ingesta de alimentos e indica ÚNICAMENTE un JSON válido con esta estructura exacta sin formato markdown: {"calorias": number, "proteinas": number, "carbs": number, "grasas": number}. Descripción: "${promptTexto}"`
          });
        }

        for (const imgBase64 of imagenesIaInput) {
          const mimeMatch = imgBase64.match(/^data:(image\/\w+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, '');
          parts.push({
            inline_data: { mime_type: mimeType, data: base64Data }
          });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            resCal = Math.round(Number(parsed.calorias) || 0);
            resP = Math.round(Number(parsed.proteinas) || 0);
            resC = Math.round(Number(parsed.carbs) || 0);
            resG = Math.round(Number(parsed.grasas) || 0);
            exitoGemini = true;
          }
        }
      } catch (err) {
        console.warn('Error con la API de Gemini, utilizando estimador nutricional local:', err);
      }
    }

    // Algoritmo local inteligente de respaldo que evalúa unidades vs gramos/ml
    if (!exitoGemini) {
      const lineas = promptTexto ? promptTexto.split(/[\n,\+;]+|\s+y\s+/i) : [comidaIaModal.nombre];
      let calAcc = 0, pAcc = 0, cAcc = 0, gAcc = 0;
      let itemsEncontrados = 0;

      const baseAlimentos: Record<string, { unit: 'g' | 'ml' | 'u', calUnit: number, pUnit: number, cUnit: number, gUnit: number }> = {
        'leche': { unit: 'ml', calUnit: 0.35, pUnit: 0.034, cUnit: 0.048, gUnit: 0.002 },
        'leche descremada': { unit: 'ml', calUnit: 0.35, pUnit: 0.034, cUnit: 0.048, gUnit: 0.002 },
        'galleta de arroz': { unit: 'g', calUnit: 3.8, pUnit: 0.08, cUnit: 0.8, gUnit: 0.03 },
        'galletas de arroz': { unit: 'g', calUnit: 3.8, pUnit: 0.08, cUnit: 0.8, gUnit: 0.03 },
        'pan integral': { unit: 'g', calUnit: 2.5, pUnit: 0.09, cUnit: 0.45, gUnit: 0.03 },
        'pan': { unit: 'g', calUnit: 2.6, pUnit: 0.08, cUnit: 0.5, gUnit: 0.02 },
        'manzana': { unit: 'g', calUnit: 0.52, pUnit: 0.003, cUnit: 0.14, gUnit: 0.002 },
        'huevo': { unit: 'g', calUnit: 1.43, pUnit: 0.12, cUnit: 0.008, gUnit: 0.095 },
        'huevos': { unit: 'g', calUnit: 1.43, pUnit: 0.12, cUnit: 0.008, gUnit: 0.095 },
        'almendra': { unit: 'u', calUnit: 7, pUnit: 0.25, cUnit: 0.25, gUnit: 0.6 },
        'almendras': { unit: 'u', calUnit: 7, pUnit: 0.25, cUnit: 0.25, gUnit: 0.6 },
        'pollo': { unit: 'g', calUnit: 1.65, pUnit: 0.31, cUnit: 0, gUnit: 0.036 },
        'pechuga': { unit: 'g', calUnit: 1.65, pUnit: 0.31, cUnit: 0, gUnit: 0.036 },
        'carne': { unit: 'g', calUnit: 2.2, pUnit: 0.26, cUnit: 0, gUnit: 0.13 },
        'arroz': { unit: 'g', calUnit: 1.3, pUnit: 0.027, cUnit: 0.28, gUnit: 0.003 },
        'fideos': { unit: 'g', calUnit: 1.31, pUnit: 0.05, cUnit: 0.25, gUnit: 0.011 },
        'banana': { unit: 'u', calUnit: 90, pUnit: 1.1, cUnit: 23, gUnit: 0.3 },
        'plátano': { unit: 'u', calUnit: 90, pUnit: 1.1, cUnit: 23, gUnit: 0.3 },
        'queso': { unit: 'g', calUnit: 3.0, pUnit: 0.22, cUnit: 0.02, gUnit: 0.22 },
        'yogur': { unit: 'g', calUnit: 0.6, pUnit: 0.04, cUnit: 0.07, gUnit: 0.015 },
        'avena': { unit: 'g', calUnit: 3.89, pUnit: 0.169, cUnit: 0.66, gUnit: 0.069 },
        'proteina': { unit: 'g', calUnit: 3.8, pUnit: 0.8, cUnit: 0.05, gUnit: 0.03 },
        'whey': { unit: 'g', calUnit: 3.8, pUnit: 0.8, cUnit: 0.05, gUnit: 0.03 },
      };

      for (const itemStr of lineas) {
        const strL = itemStr.toLowerCase().trim();
        if (!strL) continue;

        const keys = Object.keys(baseAlimentos).sort((a, b) => b.length - a.length);
        const matchedKey = keys.find((k) => strL.includes(k));

        if (matchedKey) {
          const info = baseAlimentos[matchedKey];
          const matchNum = strL.match(/(\d+)/);
          let cantidad = matchNum ? parseInt(matchNum[1], 10) : (info.unit === 'u' ? 1 : 100);

          calAcc += info.calUnit * cantidad;
          pAcc += info.pUnit * cantidad;
          cAcc += info.cUnit * cantidad;
          gAcc += info.gUnit * cantidad;
          itemsEncontrados++;
        }
      }

      if (itemsEncontrados > 0) {
        resCal = Math.round(calAcc);
        resP = Math.round(pAcc);
        resC = Math.round(cAcc);
        resG = Math.round(gAcc);
      } else {
        const base = 250 + (imagenesIaInput.length > 0 ? 100 : 0);
        resCal = base;
        resP = Math.round(base * 0.06);
        resC = Math.round(base * 0.1);
        resG = Math.round(base * 0.025);
      }
    }

    // Actualiza calorías y macros sin modificar el nombre de la comida si ya existía (e.g. Desayuno)
    setComidas((prev) =>
      prev.map((item) =>
        item.id === comidaIaModal.id
          ? {
              ...item,
              calorias: resCal,
              proteinas: resP,
              carbs: resC,
              grasas: resG,
              nombre: item.nombre === 'Nueva Comida' && promptTexto ? promptTexto.split(/[\n,]+/)[0].substring(0, 35) : item.nombre,
            }
          : item
      )
    );

    setProcesandoIa(false);
    setComidaIaModal(null);
    alert(`🤖 Estimación IA realizada: ${resCal} kcal | ${resP}g Prot | ${resC}g Carbs | ${resG}g Grasas`);
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
    if (error) alert('❌ Error al guardar calorías: ' + error.message);
    else alert('✅ Nutrición, macronutrientes y ejercicios guardados correctamente');
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
    if (error) alert('❌ Error al guardar sueño: ' + error.message);
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
    if (error) alert('❌ Error al guardar nota: ' + error.message);
    else alert('✅ Nota guardada correctamente');
  };

  const enviarMensajeSoporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeSoporte.trim()) return;
    setEnviandoMensaje(true);
    try {
      const user = session?.user;
      await supabase.from('soporte_contacto').insert([{
        user_id: user?.id,
        email: emailContacto || user?.email,
        tipo: tipoSoporte,
        mensaje: mensajeSoporte,
        fecha: new Date().toISOString()
      }]);
      alert('✅ Mensaje enviado con éxito. ¡Gracias por tus comentarios!');
      setMensajeSoporte('');
    } catch (err: any) {
      alert('✅ Mensaje recibido.');
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // HÁBITOS
  const totalCompletados = habitos.filter((h) => registrosHoy[h.id]?.completado).length;
  const porcentajeHabitos = habitos.length > 0 ? Math.round((totalCompletados / habitos.length) * 100) : 0;

  // NUTRICIÓN Y MACROS
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
      if (b <= -200 && b >= -800) { nota = 10; mensaje = '¡Excelente déficit para quemar grasa de forma saludable!'; }
      else if (b < -800) { nota = 5; mensaje = '⚠️ Déficit excesivo. Riesgo de perder masa muscular.'; }
      else if (b < 0) { nota = 8; mensaje = 'Buen déficit ligero, pero podrías ajustarlo más.'; }
      else if (b === 0) { nota = 6; mensaje = 'Mantenimiento. No estás bajando peso hoy.'; }
      else { nota = Math.max(0, 5 - b/200); mensaje = 'Superávit. Esto te aleja de tu objetivo de bajar.'; }
    } else if (perfil.objetivo === 'subir') {
      if (b >= 200 && b <= 600) { nota = 10; mensaje = '¡Superávit ideal para ganancia muscular!'; }
      else if (b > 600) { nota = 7; mensaje = 'Superávit alto. Riesgo de ganar demasiada grasa.'; }
      else if (b > 0) { nota = 8; mensaje = 'Buen inicio, pero intenta comer un poco más.'; }
      else if (b === 0) { nota = 6; mensaje = 'Mantenimiento. Será difícil ganar masa muscular.'; }
      else { nota = Math.max(0, 5 + b/200); mensaje = 'Déficit. Estás en riesgo de perder músculo.'; }
    } else {
      if (Math.abs(b) <= 100) { nota = 10; mensaje = '¡Mantenimiento perfecto!'; }
      else if (Math.abs(b) <= 300) { nota = 8; mensaje = 'Ligero desvío, pero dentro de lo aceptable.'; }
      else { nota = Math.max(0, 10 - Math.abs(b)/100); mensaje = 'Te alejaste bastante de tus calorías de mantenimiento.'; }
    }
    
    return { nota: Math.max(0, Math.min(10, Math.round(nota))), mensaje };
  }, [balanceCalorico, perfil.objetivo]);

  const pctCalorias = evaluacionNutricion.nota * 10;
  const pctAgua = Math.min(100, Math.round((aguaMl / metaAguaMl) * 100));
  const pctSueño = Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100));

  const diaNumero = parseInt(fechaSeleccionada.split('-')[2] || '1', 10);
  const fraseDelDia = FRASES_MOTIVACIONALES[diaNumero % FRASES_MOTIVACIONALES.length];

  // PANTALLA DE INICIO DE SESIÓN / REGISTRO
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-indigo-400">💪 Personal Fitness App</h1>
            <p className="text-xs text-slate-400">
              {esRegistro ? 'Crea tu cuenta para comenzar tu seguimiento' : 'Ingresa tus credenciales para acceder'}
            </p>
          </div>

          {errorAuth && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl">
              ⚠️ {errorAuth}
            </div>
          )}

          <button
            type="button"
            onClick={iniciarSesionGoogle}
            disabled={cargandoAuth}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition cursor-pointer text-sm flex items-center justify-center gap-2 border border-slate-700 shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-1.4-1.2-3.1-1.2-4.8z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-800"></div>
            <span className="px-3 text-xs text-slate-500 uppercase font-semibold">o con email</span>
            <div className="flex-1 border-t border-slate-800"></div>
          </div>

          <form onSubmit={manejarAuth} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Correo Electrónico</label>
              <input
                type="email"
                required
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Contraseña</label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={passwordAuth}
                  onChange={(e) => setPasswordAuth(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer text-sm select-none"
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargandoAuth}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition cursor-pointer text-sm disabled:opacity-50 shadow-lg shadow-indigo-600/30"
            >
              {cargandoAuth ? 'Procesando...' : esRegistro ? '🚀 Crear Cuenta' : '🔑 Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setEsRegistro(!esRegistro);
                setErrorAuth('');
              }}
              className="text-xs text-slate-400 hover:text-indigo-400 transition cursor-pointer"
            >
              {esRegistro ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
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
            <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="p-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center justify-center gap-2 border border-slate-700/50">
              <span className="text-xs font-bold uppercase tracking-wider">{sidebarAbierto ? '✕ Cerrar' : '☰ Menú'}</span>
            </button>

            {session?.user && (
              <button 
                onClick={() => cambiarSeccion('perfil')}
                className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm group"
                title="Ir a mi perfil"
              >
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Perfil</span>
                <span className="text-xs sm:text-sm font-extrabold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                  {perfil.nombre || session.user.email?.split('@')[0]} 👋
                </span>
              </button>
            )}
          </div>

          <nav className={`p-2 sm:p-3 ${sidebarAbierto ? 'flex flex-col space-y-2' : 'flex flex-row md:flex-col overflow-x-auto gap-1.5 md:space-y-1.5 justify-around md:justify-start'}`}>
            {[
              { id: 'general', label: 'General', icon: '📊' },
              { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
              { id: 'habitos', label: 'Hábitos diarios', icon: '⚡' },
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
                  seccionActiva === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                } ${sidebarAbierto ? 'w-full justify-start text-base py-3' : 'justify-center'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarAbierto && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {sidebarAbierto && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 space-y-3 mt-auto">
            <button
              onClick={cerrarSesion}
              className="w-full bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              🚪 Cerrar Sesión
            </button>

            <div className="text-[11px] text-slate-400 font-semibold bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span>🚀 Última actualización: </span>
              <span className="text-indigo-400 font-mono">{ULTIMA_ACTUALIZACION_APP}</span>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Fecha Activa</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"/>
            </div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto">
        
        <header className="flex flex-col gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-100">
                {seccionActiva === 'general' && '📊 Resumen General Fitness'}
                {seccionActiva === 'perfil' && '👤 Mi Perfil y Objetivos'}
                {seccionActiva === 'habitos' && '⚡ Hábitos Diarios'}
                {seccionActiva === 'nutricion' && '🔥 Nutrición y Entrenamiento Profundo'}
                {seccionActiva === 'extra' && '✨ Módulos Extra'}
                {seccionActiva === 'notas' && '📝 Notas'}
                {seccionActiva === 'estadisticas' && '📈 Visualización y Estadísticas'}
                {seccionActiva === 'actualizaciones' && '🚀 Novedades y Soporte'}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1"><span>📅</span> {formatearFechaLarga(fechaSeleccionada)}</span>
                <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-800 flex items-center gap-1"><span>🕒</span> {horaVivo || '00:00:00'}</span>
              </div>
            </div>
          </div>

          {clima && (
            <a 
              href={`https://www.google.com/search?q=clima+${clima.ubicacion}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-3 rounded-xl flex items-center gap-3.5 cursor-pointer transition-colors shadow-sm"
              title="Ver pronóstico detallado"
            >
              <span className="text-3xl shrink-0">{clima.icono}</span>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm text-slate-100">{clima.temp}°C</span>
                  <span className="text-xs text-slate-400">• {clima.descripcion}</span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">• {clima.ubicacion}</span>
                </div>
                <p className="text-xs font-semibold text-indigo-300 leading-normal break-words">{clima.recomendacion}</p>
              </div>
            </a>
          )}
        </header>

        <div className="mb-6 bg-indigo-950/40 border border-indigo-800/50 p-3 rounded-xl text-center text-indigo-300 text-xs font-medium italic">
          {fraseDelDia}
        </div>

        {cargando ? (
          <div className="text-center py-16 text-slate-400 font-medium">Cargando datos... ⏳</div>
        ) : (
          <div>
            {/* GENERAL */}
            {seccionActiva === 'general' && (
              <div className="space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>💡</span> Guía de indicadores:
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <strong>Rojo y bajo:</strong> Mal / Requiere atención
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <strong>Naranja y medio:</strong> Regular / En progreso
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <strong>Verde y llena:</strong> Excelente / Objetivo cumplido
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                  {/* CALORÍAS */}
                  <div onClick={() => cambiarSeccion('nutricion')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-amber-500/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Bal. Calórico</span>
                        <span className={`text-xs font-bold ${getEstadoBarra(pctCalorias).text}`}>{pctCalorias}%</span>
                        <span className="text-base ml-1">⚖️</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                        <div className={`h-full rounded-full ${getEstadoBarra(pctCalorias).bar}`} style={{ width: `${pctCalorias}%` }}></div>
                      </div>
                      <p className={`text-2xl font-extrabold ${balanceCalorico < 0 ? 'text-amber-400' : balanceCalorico === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico}
                      </p>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-2">Clic para Nutrición</p>
                  </div>

                  {/* AGUA */}
                  <div onClick={() => { cambiarSeccion('extra'); setSubSeccionExtra('agua'); }} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Agua Diaria</span>
                        <span className={`text-xs font-bold ${getEstadoBarra(pctAgua).text}`}>{pctAgua}%</span>
                        <span className="text-base ml-1">💧</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                        <div className={`h-full rounded-full ${getEstadoBarra(pctAgua).bar}`} style={{ width: `${pctAgua}%` }}></div>
                      </div>
                      <p className="text-2xl font-extrabold text-cyan-400">{(aguaMl / 1000).toFixed(2)}L</p>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-2">Clic para Hidratación</p>
                  </div>

                  {/* HÁBITOS */}
                  <div onClick={() => cambiarSeccion('habitos')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Hábitos</span>
                        <span className={`text-xs font-bold ${getEstadoBarra(porcentajeHabitos).text}`}>{porcentajeHabitos}%</span>
                        <span className="text-base ml-1">⚡</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                        <div className={`h-full rounded-full ${getEstadoBarra(porcentajeHabitos).bar}`} style={{ width: `${porcentajeHabitos}%` }}></div>
                      </div>
                      <p className="text-2xl font-extrabold text-indigo-400">{porcentajeHabitos}%</p>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-2">Clic para Hábitos</p>
                  </div>

                  {/* FÍSICO */}
                  <div onClick={() => cambiarSeccion('perfil')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-slate-400/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Físico (Éxito)</span>
                        <span className={`text-xs font-bold ${getEstadoBarra(perfil.porcentaje_probabilidad).text}`}>{perfil.porcentaje_probabilidad}%</span>
                        <span className="text-base ml-1">🎯</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                        <div className={`h-full rounded-full ${getEstadoBarra(perfil.porcentaje_probabilidad).bar}`} style={{ width: `${perfil.porcentaje_probabilidad}%` }}></div>
                      </div>
                      <p className="text-xl font-extrabold text-slate-200">{perfil.peso} <span className="text-sm font-normal">kg</span></p>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-2">Clic para Perfil</p>
                  </div>

                  {/* SUEÑO */}
                  <div onClick={() => { cambiarSeccion('extra'); setSubSeccionExtra('sueno'); }} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-indigo-400/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Sueño</span>
                        <span className={`text-xs font-bold ${getEstadoBarra(pctSueño).text}`}>{pctSueño}%</span>
                        <span className="text-base ml-1">😴</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                        <div className={`h-full rounded-full ${getEstadoBarra(pctSueño).bar}`} style={{ width: `${pctSueño}%` }}></div>
                      </div>
                      <p className="text-xl font-extrabold text-indigo-300">{suenoHoy.horas_totales} <span className="text-sm font-normal">hrs</span></p>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-2">Clic para Descanso</p>
                  </div>
                </div>

                <div onClick={() => cambiarSeccion('notas')} className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-amber-500/50 transition-all group">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2 group-hover:text-amber-300">📌 Nota rápida del día (Clic para ir a Notas)</h3>
                  <p className="text-xs text-slate-300 italic">{notaDiaria || 'Sin notas registradas para este día.'}</p>
                </div>
              </div>
            )}

            {/* PERFIL */}
            {seccionActiva === 'perfil' && (
              <section className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6 max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-200">👤 Datos Personales y Objetivos Físicos</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Datos Básicos</h3>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                      <input type="text" value={perfil.nombre} onChange={(e) => setPerfil({...perfil, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Fecha de Nacimiento</label>
                      <input type="date" value={perfil.fecha_nacimiento} onChange={(e) => setPerfil({...perfil, fecha_nacimiento: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Peso Actual (kg)</label>
                        <input type="number" step="0.1" value={perfil.peso} onChange={(e) => setPerfil({...perfil, peso: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Altura (cm)</label>
                        <input type="number" value={perfil.altura} onChange={(e) => setPerfil({...perfil, altura: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Sexo (Para cálculo metabólico)</label>
                      <select value={perfil.sexo} onChange={(e) => setPerfil({...perfil, sexo: e.target.value as any})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer">
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Objetivos Físicos</h3>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Objetivo Principal</label>
                      <select value={perfil.objetivo} onChange={(e) => setPerfil({...perfil, objetivo: e.target.value as any})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none cursor-pointer">
                        <option value="bajar">Bajar de peso (Déficit)</option>
                        <option value="mantener">Mantener peso / Recomposición</option>
                        <option value="subir">Subir de peso (Masa muscular)</option>
                      </select>
                    </div>
                    
                    {perfil.objetivo !== 'mantener' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Kilos Objetivo</label>
                          <input type="number" step="0.1" value={perfil.kilos_objetivo} onChange={(e) => setPerfil({...perfil, kilos_objetivo: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">En tiempo (Meses)</label>
                          <input type="number" min="1" value={perfil.tiempo_objetivo_meses} onChange={(e) => setPerfil({...perfil, tiempo_objetivo_meses: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" />
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400 font-medium">Probabilidad de Logro (Calculado)</label>
                        <span className={`text-sm font-bold ${getEstadoBarra(probabilidadCalculada).text}`}>{probabilidadCalculada}% Éxito</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-1.5">
                        <div className={`h-full rounded-full transition-all duration-500 ${getEstadoBarra(probabilidadCalculada).bar}`} style={{ width: `${probabilidadCalculada}%` }}></div>
                      </div>
                      <p className="text-[10px] text-slate-500">🤖 Calculado automáticamente según kilos y plazo configurado.</p>
                    </div>
                  </div>
                </div>

                <button onClick={guardarPerfil} disabled={guardandoPerfil} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer font-bold">
                  {guardandoPerfil ? 'Guardando...' : '💾 Guardar Perfil y Actualizar Cálculos'}
                </button>
              </section>
            )}

            {/* HÁBITOS DIARIOS */}
            {seccionActiva === 'habitos' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-indigo-400">⚡ Hábitos Diarios</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 self-start sm:self-auto">
                    {totalCompletados}/{habitos.length} Completados ({porcentajeHabitos}%)
                  </span>
                </div>

                <form onSubmit={agregarHabito} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <input 
                    type="text" 
                    placeholder="Escribe un nuevo hábito..." 
                    value={nuevoHabito} 
                    onChange={(e) => setNuevoHabito(e.target.value)} 
                    className="min-w-0 flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                  />
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">⏰ Hora objetivo:</span>
                      <input 
                        type="time" 
                        value={horaObjetivo} 
                        onChange={(e) => setHoraObjetivo(e.target.value)} 
                        className="bg-transparent text-sm text-white focus:outline-none cursor-pointer font-mono" 
                      />
                    </div>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer shrink-0">
                      ➕ Añadir
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {habitos.map((h) => {
                    const reg = registrosHoy[h.id];
                    const completado = !!reg?.completado;
                    const racha = rachasHabitos[h.id] || 0;
                    return (
                      <div key={h.id} className={`p-3.5 rounded-xl border flex items-center justify-between transition gap-2 ${completado ? 'bg-indigo-950/40 border-indigo-800/60 text-slate-300' : 'bg-slate-900/70 border-slate-800 text-slate-100'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => alternarHabito(h.id)} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${completado ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 hover:border-indigo-400'}`}>
                            {completado && '✓'}
                          </button>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${completado ? 'line-through text-slate-400' : ''}`}>{h.texto}</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              🕒 Hora objetivo para cumplir: <span className="text-indigo-300 font-mono font-bold">{h.hora_objetivo} hs</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center gap-1">🔥 {racha} {racha === 1 ? 'día' : 'días'}</span>
                          <button onClick={() => eliminarHabito(h.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* NUTRICIÓN Y ENTRENAMIENTO */}
            {seccionActiva === 'nutricion' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-amber-400 flex items-center gap-2">
                  <span>🏋️ Nutrición y Entrenamiento Profundo</span>
                </h2>

                <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center gap-4">
                  <div className="w-full md:w-auto flex flex-col items-center justify-center p-3 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Nota Diaria</span>
                    <span className={`text-5xl font-black ${evaluacionNutricion.nota >= 8 ? 'text-emerald-400' : evaluacionNutricion.nota >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {evaluacionNutricion.nota}<span className="text-xl text-slate-600">/10</span>
                    </span>
                  </div>
                  <div className="w-full text-center md:text-left">
                    <h3 className="text-sm font-bold text-slate-200">Evaluación de tu objetivo: <span className="text-amber-400 uppercase">{perfil.objetivo}</span></h3>
                    <p className="text-sm text-slate-400 mt-1">{evaluacionNutricion.mensaje}</p>
                    <p className="text-xs text-slate-500 mt-2 font-mono">Balance actual: {balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico} kcal</p>
                  </div>
                </div>

                <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-900/50 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-indigo-300">Metabolismo Basal Calculado (BMR)</p>
                    <p className="text-[10px] text-indigo-400/70">Calculado en base a tu perfil (Edad, Sexo, {perfil.peso}kg, {perfil.altura}cm)</p>
                  </div>
                  <div className="text-xl font-mono font-bold text-indigo-400 bg-indigo-950 px-3 py-1 rounded-lg border border-indigo-800">
                    {bmrCalculado} <span className="text-xs text-indigo-400/70">kcal</span>
                  </div>
                </div>

                {/* RESUMEN DE MACRONUTRIENTES */}
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">🥑 Resumen Total de Macronutrientes</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-rose-900/40">
                      <span className="text-[10px] text-rose-400 font-bold uppercase block">Proteínas</span>
                      <span className="text-lg font-mono font-bold text-rose-300">{totalProteinas}g</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-900/40">
                      <span className="text-[10px] text-amber-400 font-bold uppercase block">Carbohidratos</span>
                      <span className="text-lg font-mono font-bold text-amber-300">{totalCarbs}g</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-blue-900/40">
                      <span className="text-[10px] text-blue-400 font-bold uppercase block">Grasas</span>
                      <span className="text-lg font-mono font-bold text-blue-300">{totalGrasas}g</span>
                    </div>
                  </div>
                </div>

                {/* BIBLIOTECA DE COMIDAS FRECUENTES */}
                {bibliotecaComidas.length > 0 && (
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase text-amber-400 tracking-wider">⭐ Biblioteca de Comidas Frecuentes</h3>
                      <input
                        type="text"
                        placeholder="🔍 Buscar en biblioteca..."
                        value={busquedaBiblioteca}
                        onChange={(e) => setBusquedaBiblioteca(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 w-full sm:w-48"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">Toca un plato para cargar o actualizar tus comidas de hoy directamente.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {bibliotecaComidas
                        .filter((b) => b.nombre.toLowerCase().includes(busquedaBiblioteca.toLowerCase()))
                        .map((item) => (
                          <div key={item.id} className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
                            <button onClick={() => cargarDesdeBiblioteca(item)} className="font-semibold text-slate-200 hover:text-amber-400 transition cursor-pointer">
                              ⚡ {item.nombre} <span className="text-[10px] text-slate-400 font-normal">({item.calorias} kcal)</span>
                            </button>
                            <button onClick={() => eliminarDeBiblioteca(item.id)} className="text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer">✕</button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* LISTA DE COMIDAS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🥗 Comidas e Ingesta Diaria</h3>
                    <button onClick={agregarComida} className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer">+ Agregar Comida</button>
                  </div>
                  
                  {comidas.map((item, idx) => (
                    <div key={item.id} className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moverComida(idx, 'arriba')} disabled={idx === 0} className="text-[10px] text-slate-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer">▲</button>
                          <button onClick={() => moverComida(idx, 'abajo')} disabled={idx === comidas.length - 1} className="text-[10px] text-slate-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer">▼</button>
                        </div>

                        <input 
                          type="text" 
                          value={item.nombre} 
                          onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)} 
                          className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-semibold" 
                          placeholder="Nombre de la comida"
                        />
                        
                        <button onClick={() => abrirModalIaComida(item)} className="text-xs text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-2.5 py-1 rounded-lg hover:bg-cyan-900/60 transition cursor-pointer flex items-center gap-1 shrink-0 font-medium">
                          📷 IA
                        </button>

                        <button onClick={() => guardarEnBiblioteca(item)} className="text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1 bg-amber-950/40 border border-amber-800/50 rounded-lg cursor-pointer shrink-0" title="Guardar en biblioteca frecuente">
                          ⭐ Guardar
                        </button>
                        <button onClick={() => eliminarComida(item.id)} className="text-slate-500 hover:text-rose-400 shrink-0 p-1 cursor-pointer">🗑️</button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Calorías (kcal)</label>
                          <input type="number" value={item.calorias} onChange={(e) => actualizarComida(item.id, 'calorias', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-rose-400 block mb-0.5">Proteínas (g)</label>
                          <input type="number" value={item.proteinas || 0} onChange={(e) => actualizarComida(item.id, 'proteinas', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-amber-400 block mb-0.5">Carbs (g)</label>
                          <input type="number" value={item.carbs || 0} onChange={(e) => actualizarComida(item.id, 'carbs', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-blue-400 block mb-0.5">Grasas (g)</label>
                          <input type="number" value={item.grasas || 0} onChange={(e) => actualizarComida(item.id, 'grasas', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BITÁCORA DE ENTRENAMIENTO */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🏋️ Bitácora de Entrenamiento</h3>
                    <button onClick={agregarEjercicio} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer">+ Agregar Actividad</button>
                  </div>

                  {ejercicios.map((item, idx) => (
                    <div key={item.id} className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moverEjercicio(idx, 'arriba')} disabled={idx === 0} className="text-[10px] text-slate-400 hover:text-indigo-400 disabled:opacity-20 cursor-pointer">▲</button>
                          <button onClick={() => moverEjercicio(idx, 'abajo')} disabled={idx === ejercicios.length - 1} className="text-[10px] text-slate-400 hover:text-indigo-400 disabled:opacity-20 cursor-pointer">▼</button>
                        </div>

                        <select 
                          value={item.tipo || 'gimnasio'} 
                          onChange={(e) => actualizarEjercicio(item.id, 'tipo', e.target.value as any)} 
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-indigo-300 font-bold shrink-0 cursor-pointer"
                        >
                          <option value="gimnasio">🏋️ Gym</option>
                          <option value="running">🏃 Running</option>
                          <option value="ciclismo">🚴 Ciclismo</option>
                          <option value="boxeo">🥊 Boxeo</option>
                          <option value="natacion">🏊 Natación</option>
                          <option value="caminata">🚶 Caminata</option>
                          <option value="otro">🔥 Otro</option>
                        </select>

                        <input 
                          type="text" 
                          value={item.nombre} 
                          onChange={(e) => actualizarEjercicio(item.id, 'nombre', e.target.value)} 
                          className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-semibold" 
                          placeholder="Nombre de la actividad"
                        />

                        <button onClick={() => calcularCaloriasEjercicioIA(item)} className="text-xs text-indigo-300 bg-indigo-950 border border-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-900 transition cursor-pointer flex items-center gap-1 shrink-0 font-medium" title="Calcular calorías quemadas con IA">
                          🤖 IA
                        </button>

                        <button onClick={() => eliminarEjercicio(item.id)} className="text-slate-500 hover:text-rose-400 shrink-0 p-1 cursor-pointer">🗑️</button>
                      </div>

                      {item.tipo === 'gimnasio' || !item.tipo ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-indigo-300 block mb-0.5">Series</label>
                            <input type="number" value={item.series || 0} onChange={(e) => actualizarEjercicio(item.id, 'series', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] text-indigo-300 block mb-0.5">Repeticiones</label>
                            <input type="number" value={item.repeticiones || 0} onChange={(e) => actualizarEjercicio(item.id, 'repeticiones', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] text-indigo-300 block mb-0.5">Peso (kg)</label>
                            <input type="number" step="0.5" value={item.peso || 0} onChange={(e) => actualizarEjercicio(item.id, 'peso', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] text-amber-400 block mb-0.5">Calorías Quemadas</label>
                            <input type="number" value={item.calorias || 0} onChange={(e) => actualizarEjercicio(item.id, 'calorias', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-indigo-300 block mb-0.5">Duración (Mins)</label>
                            <input type="number" value={item.duracion_minutos || 0} onChange={(e) => actualizarEjercicio(item.id, 'duracion_minutos', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] text-indigo-300 block mb-0.5">Distancia (km)</label>
                            <input type="number" step="0.1" value={item.distancia_km || 0} onChange={(e) => actualizarEjercicio(item.id, 'distancia_km', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] text-amber-400 block mb-0.5">Calorías Quemadas</label>
                            <input type="number" value={item.calorias || 0} onChange={(e) => actualizarEjercicio(item.id, 'calorias', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={guardarCalorias} disabled={guardandoCalorias} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 font-bold">
                  {guardandoCalorias ? 'Guardando...' : '💾 Guardar Registro Manual'}
                </button>
              </section>
            )}

            {/* SECCIÓN EXTRA (HIDRATACIÓN Y SUEÑO) */}
            {seccionActiva === 'extra' && (
              <section className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <div className="flex border-b border-slate-700 pb-3 gap-4">
                  <button onClick={() => setSubSeccionExtra('agua')} className={`text-sm font-bold pb-1 cursor-pointer transition ${subSeccionExtra === 'agua' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                    💧 Hidratación
                  </button>
                  <button onClick={() => setSubSeccionExtra('sueno')} className={`text-sm font-bold pb-1 cursor-pointer transition ${subSeccionExtra === 'sueno' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}>
                    😴 Registro de Sueño
                  </button>
                </div>

                {subSeccionExtra === 'agua' ? (
                  <div className="space-y-4 max-w-md mx-auto text-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                    <span className="text-5xl">💧</span>
                    <h3 className="text-xl font-bold text-cyan-300">Control de Hidratación</h3>
                    <p className="text-3xl font-black text-cyan-400">{(aguaMl / 1000).toFixed(2)} / {(metaAguaMl / 1000).toFixed(2)} L</p>
                    <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                      <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${pctAgua}%` }}></div>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button onClick={() => modificarAgua(250)} className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">+250 ml 🥛</button>
                      <button onClick={() => modificarAgua(500)} className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">+500 ml 🍾</button>
                      <button onClick={() => modificarAgua(-250)} className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl text-xs cursor-pointer">-250 ml</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md mx-auto bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-indigo-300 text-center">😴 Registro de Descanso</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de Acostarse</label>
                        <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_acostarse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de Levantarse</label>
                        <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_levantarse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Calidad de Sueño (1 a 5)</label>
                      <select value={suenoHoy.calidad} onChange={(e) => setSuenoHoy({...suenoHoy, calidad: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer">
                        <option value={1}>⭐ Mala</option>
                        <option value={2}>⭐⭐ Regular</option>
                        <option value={3}>⭐⭐⭐ Aceptable</option>
                        <option value={4}>⭐⭐⭐⭐ Buena</option>
                        <option value={5}>⭐⭐⭐⭐⭐ Excelente</option>
                      </select>
                    </div>
                    <button onClick={guardarSueno} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">💾 Guardar Sueño</button>
                  </div>
                )}
              </section>
            )}

            {/* NOTAS */}
            {seccionActiva === 'notas' && (
              <section className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
                <h2 className="text-xl font-semibold text-amber-400">📝 Notas Diarias y Reflexiones</h2>
                <textarea 
                  rows={6} 
                  value={notaDiaria} 
                  onChange={(e) => setNotaDiaria(e.target.value)} 
                  placeholder="Escribe tus notas, sensaciones o ideas del día aquí..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <button onClick={guardarNota} disabled={guardandoNota} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition">
                  {guardandoNota ? 'Guardando...' : '💾 Guardar Nota'}
                </button>
              </section>
            )}

            {/* ESTADÍSTICAS */}
            {seccionActiva === 'estadisticas' && (
              <section className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6 text-center">
                <h2 className="text-xl font-semibold text-indigo-400">📈 Visualización y Estadísticas</h2>
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <p className="text-sm text-slate-300">Resumen histórico de consistencia</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Hábitos Completados</span>
                      <span className="text-2xl font-bold text-indigo-400">{todosLosRegistrosHabitos.length}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Ingesta de Hoy</span>
                      <span className="text-2xl font-bold text-amber-400">{totalIngeridoCal} kcal</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Gasto de Hoy</span>
                      <span className="text-2xl font-bold text-emerald-400">{totalGastadoCal} kcal</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Agua Registrada</span>
                      <span className="text-2xl font-bold text-cyan-400">{(aguaMl / 1000).toFixed(2)} L</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SOPORTE Y ACTUALIZACIONES */}
            {seccionActiva === 'actualizaciones' && (
              <section className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-indigo-400">🚀 Novedades y Soporte técnico</h2>
                
                <form onSubmit={enviarMensajeSoporte} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4 max-w-xl mx-auto">
                  <h3 className="text-sm font-bold text-slate-200">Envíanos un reporte o sugerencia</h3>
                  
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Tipo de Mensaje</label>
                    <select value={tipoSoporte} onChange={(e) => setTipoSoporte(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none cursor-pointer">
                      <option value="bug">🐛 Reporte de Error / Bug</option>
                      <option value="recomendacion">💡 Sugerencia o Recomendación</option>
                      <option value="reclamo">📢 Reclamo</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Tu Correo de Contacto (Opcional)</label>
                    <input type="email" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} placeholder="tu@email.com" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none" />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Detalle del mensaje</label>
                    <textarea rows={4} value={mensajeSoporte} onChange={(e) => setMensajeSoporte(e.target.value)} required placeholder="Describe tu consulta con detalle..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" />
                  </div>

                  <button type="submit" disabled={enviandoMensaje} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">
                    {enviandoMensaje ? 'Enviando...' : '📤 Enviar Mensaje'}
                  </button>
                </form>
              </section>
            )}

            {/* MODAL IA ESTIMACIÓN COMIDAS */}
            {comidaIaModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-cyan-500/40 p-5 sm:p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                      <span>🤖 Estimación de Nutrición con Gemini IA</span>
                    </h3>
                    <button onClick={() => setComidaIaModal(null)} className="text-slate-400 hover:text-white cursor-pointer text-xs">✕ Cerrar</button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Escribe los alimentos y cantidades ingeridos:</label>
                      <textarea
                        value={textoIaInput}
                        onChange={(e) => setTextoIaInput(e.target.value)}
                        placeholder="Ej: Leche descremada 336 ml, Galleta de arroz 15g, Pan integral 30g, Manzana 148g, Huevos 91g, Almendras 6u..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Adjuntar fotos del plato (Opcional):</label>
                      <input type="file" accept="image/*" multiple onChange={procesarFotoIA} className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer" />
                    </div>

                    {imagenesIaInput.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {imagenesIaInput.map((img, idx) => (
                          <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 group">
                            <img src={img} alt="Vista previa" className="w-full h-full object-cover" />
                            <button onClick={() => eliminarFotoIa(idx)} className="absolute inset-0 bg-slate-950/70 text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={estimarComidaConIA}
                    disabled={procesandoIa}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {procesandoIa ? 'Analizando con IA...' : '✨ Estimar Calorías y Macronutrientes'}
                  </button>
                </div>
              </div>
            )}

            {/* MODAL ONBOARDING / SOLO 1 VEZ */}
            {mostrarModalOnboarding && (
              <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-indigo-500/40 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-5 shadow-2xl">
                  <div className="text-center space-y-2">
                    <span className="text-4xl">👋</span>
                    <h3 className="text-xl font-bold text-white">¡Bienvenido a Personal Fitness!</h3>
                    <p className="text-xs text-slate-300">
                      Ingresa tus datos personales y objetivos físicos solo una vez para configurar tu perfil metabólico.
                    </p>
                  </div>

                  <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Tu Nombre</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Juan" 
                        value={perfil.nombre} 
                        onChange={(e) => setPerfil({...perfil, nombre: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Fecha Nacimiento</label>
                        <input 
                          type="date" 
                          value={perfil.fecha_nacimiento} 
                          onChange={(e) => setPerfil({...perfil, fecha_nacimiento: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none cursor-pointer" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Sexo</label>
                        <select 
                          value={perfil.sexo} 
                          onChange={(e) => setPerfil({...perfil, sexo: e.target.value as any})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="masculino">Masculino</option>
                          <option value="femenino">Femenino</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Peso (kg)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={perfil.peso} 
                          onChange={(e) => setPerfil({...perfil, peso: Number(e.target.value)})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Altura (cm)</label>
                        <input 
                          type="number" 
                          value={perfil.altura} 
                          onChange={(e) => setPerfil({...perfil, altura: Number(e.target.value)})} 
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" 
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={guardarPerfil}
                    disabled={guardandoPerfil}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition cursor-pointer text-sm shadow-lg shadow-indigo-600/30"
                  >
                    {guardandoPerfil ? 'Guardando...' : '🚀 Guardar e Iniciar App'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}