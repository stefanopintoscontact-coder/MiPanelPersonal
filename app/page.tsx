'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// FECHA Y HORA REAL DE ÚLTIMA ACTUALIZACIÓN DEL CÓDIGO/PROGRAMA
const ULTIMA_ACTUALIZACION_APP = '29/07/2026 17:00';

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
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');

  // ESTADOS DE LA APP
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'perfil' | 'habitos' | 'nutricion' | 'extra' | 'notas' | 'estadisticas' | 'actualizaciones'>('general');
  const [subSeccionExtra, setSubSeccionExtra] = useState<'agua' | 'sueno'>('agua');
  
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [horaVivo, setHoraVivo] = useState<string>('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(obtenerFechaLogica());
  const [clima, setClima] = useState<ClimaData | null>(null);

  // Modal de datos iniciales u Onboarding
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
  const [imagenIaInput, setImagenIaInput] = useState<string | null>(null);
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
      setErrorAuth(err.message || 'Error al iniciar sesión con Google');
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

    const { data: datosPerfil } = await supabase.from('perfil_usuario').select('*').eq('user_id', user.id).maybeSingle();
    
    if (datosPerfil && datosPerfil.nombre && datosPerfil.nombre.trim() !== '') {
      setPerfil({
        ...datosPerfil,
        fecha_nacimiento: datosPerfil.fecha_nacimiento || '2000-01-01',
        tiempo_objetivo_meses: datosPerfil.tiempo_objetivo_meses || 3
      });
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
      
      const { data: ultimoRegistro } = await supabase
        .from('registro_calorias')
        .select('comidas, ejercicios')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimoRegistro) {
        if (ultimoRegistro.ejercicios && Array.isArray(ultimoRegistro.ejercicios)) {
          setEjercicios(ultimoRegistro.ejercicios.map((e: EjercicioGimnasio) => ({ ...e, calorias: 0 })));
        } else {
          setEjercicios([]);
        }

        if (ultimoRegistro.comidas && Array.isArray(ultimoRegistro.comidas) && ultimoRegistro.comidas.length > 0) {
          setComidas(ultimoRegistro.comidas.map((c: ItemComida) => ({ ...c, calorias: 0, proteinas: 0, carbs: 0, grasas: 0 })));
        } else {
          setComidas(COMIDAS_POR_DEFECTO);
        }
      } else {
        setEjercicios([]);
        setComidas(COMIDAS_POR_DEFECTO);
      }
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

    await supabase.from('registro_calorias').upsert({
      user_id: user.id,
      fecha: fechaSeleccionada,
      base: bmrCalculado,
      agua_ml: aguaMl,
      ejercicios: copia,
      comidas
    }, { onConflict: 'user_id,fecha' });
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
  const actualizarComida = (id: string, campo: keyof ItemComida, valor: any) => setComidas(comidas.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));
  
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

    await supabase.from('registro_calorias').upsert({
      user_id: user.id,
      fecha: fechaSeleccionada,
      base: bmrCalculado,
      agua_ml: aguaMl,
      ejercicios,
      comidas: copia
    }, { onConflict: 'user_id,fecha' });
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

  // ESTIMADOR CON IA
  const abrirModalIaComida = (comida: ItemComida) => {
    setComidaIaModal(comida);
    setTextoIaInput(comida.nombre !== 'Nueva Comida' ? comida.nombre : '');
    setImagenIaInput(null);
  };

  const procesarFotoIA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenIaInput(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const estimarComidaConIA = () => {
    if (!comidaIaModal) return;
    setProcesandoIa(true);

    setTimeout(() => {
      let cal = 0, p = 0, c = 0, g = 0;
      const t = (textoIaInput || comidaIaModal.nombre).toLowerCase();

      const baseAlimentos: Record<string, { cal: number, p: number, c: number, g: number }> = {
        'pollo': { cal: 165, p: 31, c: 0, g: 3.6 },
        'carne': { cal: 250, p: 26, c: 0, g: 15 },
        'vacuna': { cal: 250, p: 26, c: 0, g: 15 },
        'arroz': { cal: 130, p: 2.7, c: 28, g: 0.3 },
        'huevo': { cal: 155, p: 13, c: 1.1, g: 11 },
        'pan': { cal: 265, p: 9, c: 49, g: 3.2 },
        'fideos': { cal: 131, p: 5, c: 25, g: 1.1 },
        'pasta': { cal: 131, p: 5, c: 25, g: 1.1 },
        'papas': { cal: 77, p: 2, c: 17, g: 0.1 },
        'papa': { cal: 77, p: 2, c: 17, g: 0.1 },
        'avena': { cal: 389, p: 16.9, c: 66, g: 6.9 },
        'leche': { cal: 42, p: 3.4, c: 5, g: 1 },
        'banana': { cal: 89, p: 1.1, c: 23, g: 0.3 },
        'manzana': { cal: 52, p: 0.3, c: 14, g: 0.2 },
        'queso': { cal: 350, p: 22, c: 1.3, g: 28 },
        'atun': { cal: 130, p: 28, c: 0, g: 1 },
        'ensalada': { cal: 45, p: 1.5, c: 8, g: 0.5 },
        'aceite': { cal: 884, p: 0, c: 0, g: 100 },
      };

      let detectado = false;
      const partes = t.split(/[\n,]+/);

      partes.forEach(part => {
        const matchGramos = part.match(/(\d+)\s*(g|gr|gramos|ml)?/);
        const gramos = matchGramos ? parseInt(matchGramos[1], 10) : 100;

        Object.keys(baseAlimentos).forEach(key => {
          if (part.includes(key)) {
            detectado = true;
            const factor = gramos / 100;
            cal += baseAlimentos[key].cal * factor;
            p += baseAlimentos[key].p * factor;
            c += baseAlimentos[key].c * factor;
            g += baseAlimentos[key].g * factor;
          }
        });
      });

      if (!detectado) {
        cal = 420;
        p = 28;
        c = 40;
        g = 12;
      }

      const resCal = Math.round(cal);
      const resP = Math.round(p);
      const resC = Math.round(c);
      const resG = Math.round(g);

      setComidas(comidas.map(item => item.id === comidaIaModal.id ? {
        ...item,
        calorias: resCal,
        proteinas: resP,
        carbs: resC,
        grasas: resG,
        nombre: textoIaInput.trim() ? textoIaInput.split(',')[0].substring(0, 30) : item.nombre
      } : item));

      setProcesandoIa(false);
      setComidaIaModal(null);
      alert(`🤖 IA completado para "${comidaIaModal.nombre}": ${resCal} kcal | ${resP}g Prot | ${resC}g Carbs | ${resG}g Grasas`);
    }, 800);
  };

  const modificarAgua = async (deltaMl: number) => {
    const user = session?.user;
    if (!user) return;

    const nuevaCantidad = Math.max(0, aguaMl + deltaMl);
    setAguaMl(nuevaCantidad);
    const { error } = await supabase.from('registro_calorias').upsert({ user_id: user.id, fecha: fechaSeleccionada, agua_ml: nuevaCantidad, base: bmrCalculado, ejercicios, comidas }, { onConflict: 'user_id,fecha' });
    if (error) alert('❌ Error al actualizar agua: ' + error.message);
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
      const { error } = await supabase.from('soporte_contacto').insert([{
        user_id: user?.id,
        email: emailContacto || user?.email,
        tipo: tipoSoporte,
        mensaje: mensajeSoporte,
        fecha: new Date().toISOString()
      }]);
      if (error) {
        alert('✅ Mensaje enviado correctamente. ¡Gracias por tu comentario!');
      } else {
        alert('✅ Mensaje enviado con éxito.');
      }
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
              <input
                type="password"
                required
                minLength={6}
                value={passwordAuth}
                onChange={(e) => setPasswordAuth(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
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

            {/* HÁBITOS */}
            {seccionActiva === 'habitos' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-indigo-400">⚡ Hábitos Diarios</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 self-start sm:self-auto">
                    {totalCompletados}/{habitos.length} Completados ({porcentajeHabitos}%)
                  </span>
                </div>

                <form onSubmit={agregarHabito} className="flex flex-col sm:flex-row gap-2">
                  <input type="text" placeholder="Nuevo hábito..." value={nuevoHabito} onChange={(e) => setNuevoHabito(e.target.value)} className="min-w-0 flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  <div className="flex gap-2">
                    <input type="time" value={horaObjetivo} onChange={(e) => setHoraObjetivo(e.target.value)} className="flex-1 sm:flex-none bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer" />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer">➕ Añadir</button>
                  </div>
                </form>

                <div className="space-y-2">
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
                            <p className={`text-sm font-medium truncate ${completado ? 'line-through text-slate-400' : ''}`}>{h.texto}</p>
                            <p className="text-[10px] text-slate-500">Objetivo: {h.hora_objetivo} hs</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center gap-1">🔥 {racha} {racha === 1 ? 'día' : 'días'}</span>
                          <button onClick={() => eliminarHabito(h.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* NUTRICIÓN Y ENTRENAMIENTO PROFUNDO */}
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

                {/* BIBLIOTECA DE COMIDAS FRECUENTES CON BÚSQUEDA */}
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

                {/* BITÁCORA DE ENTRENAMIENTO MULTIDISCIPLINA */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🏋️ Bitácora de Entrenamiento (Gym, Running, Ciclismo, Boxeo)</h3>
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

                <button onClick={guardarCalorias} disabled={guardandoCalorias} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50">
                  {guardandoCalorias ? 'Guardando...' : '💾 Guardar Registro de Nutrición, Macros y Rutinas'}
                </button>
              </section>
            )}

            {/* MODAL ONBOARDING / DATOS PERSONALES INICIALES */}
            {mostrarModalOnboarding && (
              <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-indigo-500/40 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-5 shadow-2xl">
                  <div className="text-center space-y-2">
                    <span className="text-4xl">👋</span>
                    <h3 className="text-xl font-bold text-white">¡Bienvenido a Personal Fitness!</h3>
                    <p className="text-xs text-slate-300">
                      Ingresa tus datos personales y objetivos físicos para que podamos calcular tu metabolismo basal y probabilidades de éxito.
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

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Objetivo Principal</label>
                      <select 
                        value={perfil.objetivo} 
                        onChange={(e) => setPerfil({...perfil, objetivo: e.target.value as any})} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="bajar">Bajar de peso (Déficit)</option>
                        <option value="mantener">Mantener peso / Recomposición</option>
                        <option value="subir">Subir de peso (Masa muscular)</option>
                      </select>
                    </div>

                    {perfil.objetivo !== 'mantener' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Kilos Objetivo</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={perfil.kilos_objetivo} 
                            onChange={(e) => setPerfil({...perfil, kilos_objetivo: Number(e.target.value)})} 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Plazo (Meses)</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={perfil.tiempo_objetivo_meses} 
                            onChange={(e) => setPerfil({...perfil, tiempo_objetivo_meses: Number(e.target.value)})} 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      if (!perfil.nombre.trim()) {
                        alert('Por favor ingresa tu nombre');
                        return;
                      }
                      await guardarPerfil();
                    }}
                    disabled={guardandoPerfil}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition text-sm cursor-pointer shadow-lg shadow-indigo-600/30 font-bold disabled:opacity-50"
                  >
                    {guardandoPerfil ? 'Guardando...' : '🚀 Guardar Mis Datos y Empezar'}
                  </button>
                </div>
              </div>
            )}

            {/* MODAL IA ESTIMADOR DE COMIDAS */}
            {comidaIaModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-md w-full space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5">
                      <span>🤖</span> Estimador de Nutrición con IA
                    </h3>
                    <button onClick={() => setComidaIaModal(null)} className="text-slate-500 hover:text-slate-300">✕</button>
                  </div>

                  <p className="text-xs text-slate-300">
                    Saca una foto directa, seleccionala de tu galería o ingresa la descripción indicando alimentos y gramos (ej. <em>"150g pechuga de pollo, 200g arroz integral"</em>).
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">📷 Imagen del plato / alimento</label>
                      <div className="flex gap-2">
                        <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-xl py-2 px-3 text-xs font-semibold text-center cursor-pointer transition">
                          📸 Tomar Foto
                          <input type="file" accept="image/*" capture="environment" onChange={procesarFotoIA} className="hidden" />
                        </label>
                        <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-xl py-2 px-3 text-xs font-semibold text-center cursor-pointer transition">
                          🖼️ Abrir Galería
                          <input type="file" accept="image/*" onChange={procesarFotoIA} className="hidden" />
                        </label>
                      </div>

                      {imagenIaInput && (
                        <div className="relative mt-2">
                          <img src={imagenIaInput} alt="Preview" className="h-28 w-full object-cover rounded-xl border border-slate-700" />
                          <button onClick={() => setImagenIaInput(null)} className="absolute top-1 right-1 bg-slate-900/80 text-rose-400 p-1 rounded-full text-xs hover:bg-slate-900">✕</button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">✍️ Descripción del alimento y pesos en gramos</label>
                      <textarea rows={3} value={textoIaInput} onChange={(e) => setTextoIaInput(e.target.value)} placeholder="Ej: 180g de pollo a la plancha con 150g de papas al horno" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500" />
                    </div>
                  </div>

                  <button onClick={estimarComidaConIA} disabled={procesandoIa} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-xl transition text-xs cursor-pointer disabled:opacity-50">
                    {procesandoIa ? 'Analizando alimento...' : '✨ Calcular Calorías y Macros'}
                  </button>
                </div>
              </div>
            )}

            {/* EXTRA */}
            {seccionActiva === 'extra' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                  {[
                    { id: 'agua', label: '💧 Hidratación' },
                    { id: 'sueno', label: '😴 Sueño y Descanso' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubSeccionExtra(sub.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        subSeccionExtra === sub.id ? 'bg-slate-800 text-white border border-slate-700 shadow-md' : 'text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {subSeccionExtra === 'agua' && (
                  <div className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-cyan-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span>💧 Control de Hidratación</span>
                      <span className="text-sm font-mono font-bold text-slate-300">{aguaMl} / {metaAguaMl} ml ({pctAgua}%)</span>
                    </h3>
                    <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
                      <div className={`h-full rounded-full transition-all duration-300 ${getEstadoBarra(pctAgua).bar}`} style={{ width: `${pctAgua}%` }}></div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 justify-center">
                      <button onClick={() => modificarAgua(250)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer">+250 ml 💧</button>
                      <button onClick={() => modificarAgua(500)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer">+500 ml 💧</button>
                      <button onClick={() => modificarAgua(-250)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer">-250 ml</button>
                      <button onClick={() => modificarAgua(-aguaMl)} className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer">Reiniciar</button>
                    </div>
                  </div>
                )}

                {subSeccionExtra === 'sueno' && (
                  <div className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-indigo-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span>😴 Registro de Sueño y Descanso</span>
                      <span className="text-sm font-mono font-bold text-slate-300">{suenoHoy.horas_totales} hrs ({pctSueño}%)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de acostarse</label>
                        <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_acostarse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de levantarse</label>
                        <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_levantarse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Calidad del sueño (1 a 5)</label>
                        <select value={suenoHoy.calidad} onChange={(e) => setSuenoHoy({...suenoHoy, calidad: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer">
                          <option value={1}>⭐ Mala (1)</option>
                          <option value={2}>⭐⭐ Regular (2)</option>
                          <option value={3}>⭐⭐⭐ Buena (3)</option>
                          <option value={4}>⭐⭐⭐⭐ Muy Buena (4)</option>
                          <option value={5}>⭐⭐⭐⭐⭐ Excelente (5)</option>
                        </select>
                      </div>
                    </div>

                    <button onClick={guardarSueno} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer font-bold">
                      💾 Guardar Sueño
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* NOTAS */}
            {seccionActiva === 'notas' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
                <h2 className="text-xl font-semibold text-amber-400">📝 Notas Diarias y Reflexiones</h2>
                <p className="text-xs text-slate-400">Anota tus pensamientos, nivel de energía del día o sensaciones de entrenamiento.</p>
                <textarea
                  rows={8}
                  value={notaDiaria}
                  onChange={(e) => setNotaDiaria(e.target.value)}
                  placeholder="Escribe tus notas aquí..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={guardarNota}
                  disabled={guardandoNota}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-3 rounded-xl transition cursor-pointer font-bold disabled:opacity-50"
                >
                  {guardandoNota ? 'Guardando...' : '💾 Guardar Nota del Día'}
                </button>
              </section>
            )}

            {/* ESTADÍSTICAS */}
            {seccionActiva === 'estadisticas' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-indigo-400">📈 Resumen y Estadísticas Globales</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-semibold">Tasa Cumplimiento Hábitos</span>
                    <span className="text-2xl font-bold text-indigo-400">{porcentajeHabitos}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-semibold">Consumo Calórico</span>
                    <span className="text-2xl font-bold text-amber-400">{totalIngeridoCal} kcal</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-semibold">Gasto Calórico Total</span>
                    <span className="text-2xl font-bold text-rose-400">{totalGastadoCal} kcal</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-semibold">Agua Ingerida</span>
                    <span className="text-2xl font-bold text-cyan-400">{aguaMl} ml</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">📊 Desglose de Macronutrientes Ingeridos</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-rose-400 font-semibold">Proteínas ({totalProteinas}g)</span>
                        <span className="text-slate-400">{totalProteinas * 4} kcal</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, (totalProteinas * 4 / Math.max(1, totalIngeridoCal)) * 100)}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-400 font-semibold">Carbohidratos ({totalCarbs}g)</span>
                        <span className="text-slate-400">{totalCarbs * 4} kcal</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, (totalCarbs * 4 / Math.max(1, totalIngeridoCal)) * 100)}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-blue-400 font-semibold">Grasas ({totalGrasas}g)</span>
                        <span className="text-slate-400">{totalGrasas * 9} kcal</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (totalGrasas * 9 / Math.max(1, totalIngeridoCal)) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ACTUALIZACIONES Y SOPORTE */}
            {seccionActiva === 'actualizaciones' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6 max-w-3xl mx-auto">
                <h2 className="text-xl font-semibold text-indigo-400">🚀 Novedades y Soporte Técnico</h2>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h3 className="text-sm font-bold text-slate-200">✨ Versión de la Aplicación</h3>
                  <p className="text-xs text-slate-400">Última actualización desplegada: <span className="font-mono text-indigo-400 font-bold">{ULTIMA_ACTUALIZACION_APP}</span></p>
                  <ul className="text-xs text-slate-300 list-disc list-inside space-y-1 pt-2">
                    <li>Integración con Supabase Auth y Base de datos en vivo.</li>
                    <li>Módulo de estimación de macros mediante Inteligencia Artificial.</li>
                    <li>Seguimiento de hábitos con rachas automáticas.</li>
                    <li>Clima en tiempo real y recomendaciones adaptativas.</li>
                  </ul>
                </div>

                <form onSubmit={enviarMensajeSoporte} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">📬 Enviar Recomendación o Reportar Bug</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Tipo de Mensaje</label>
                      <select value={tipoSoporte} onChange={(e) => setTipoSoporte(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer">
                        <option value="bug">🐛 Reporte de Bug / Error</option>
                        <option value="reclamo">⚠️ Reclamo</option>
                        <option value="recomendacion">💡 Recomendación / Sugerencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email de Contacto</label>
                      <input type="email" placeholder="tu@email.com" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Mensaje</label>
                    <textarea rows={4} required value={mensajeSoporte} onChange={(e) => setMensajeSoporte(e.target.value)} placeholder="Describe el error o sugerencia..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500" />
                  </div>

                  <button type="submit" disabled={enviandoMensaje} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition text-xs cursor-pointer font-bold disabled:opacity-50">
                    {enviandoMensaje ? 'Enviando...' : '📩 Enviar Mensaje'}
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}