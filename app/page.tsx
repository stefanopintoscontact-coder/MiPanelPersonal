'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// --- INTERFACES ---
interface PerfilUsuario {
  nombre: string;
  fecha_nacimiento: string;
  peso: number;
  altura: number; // en cm
  sexo: 'masculino' | 'femenino';
  objetivo: 'bajar' | 'subir' | 'mantener';
  kilos_objetivo: number;
  tiempo_objetivo_meses: number; // Cambiado a MESES
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
}

interface Transaccion {
  id: number;
  monto: number;
  tipo: 'ingreso' | 'gasto';
  descripcion: string;
  categoria: string;
  es_fijo: boolean;
  fecha: string;
}

interface ItemCalorico {
  id: string;
  nombre: string;
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

const CATEGORIAS_GASTO = ['Comida', 'Gimnasio', 'Luz', 'Agua', 'WiFi', 'Alquiler', 'Salud', 'Educación', 'Entretenimiento', 'Varios'];
const CATEGORIAS_INGRESO = ['Sueldo', 'Ventas', 'Inversiones', 'Varios'];

const FRASES_MOTIVACIONALES = [
  "«El éxito es la suma de pequeños esfuerzos repetidos día tras día.»",
  "«La disciplina es construir el puente entre tus metas y tus logros.»",
  "«No cuentes los días, haz que los días cuenten.»",
  "«Tu versión del futuro te agradecerá la constancia de hoy.»",
  "«Un pequeño avance diario genera resultados gigantes al final del año.»",
  "«La constancia vence a la motivación cuando la motivación falta.»",
  "«Haz hoy lo que otros no quieren para vivir mañana como otros no pueden.»"
];

const COMIDAS_POR_DEFECTO: ItemCalorico[] = [
  { id: '1', nombre: 'Desayuno', calorias: 0 },
  { id: '2', nombre: 'Almuerzo', calorias: 0 },
  { id: '3', nombre: 'Merienda', calorias: 0 },
  { id: '4', nombre: 'Cena', calorias: 0 },
  { id: '5', nombre: 'Extra', calorias: 0 },
];

// --- FUNCIONES AUXILIARES ---
const formatearMonto = (monto: number) => {
  return Math.round(monto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

// Helper para determinar color según porcentaje (Verde, Amarillo, Rojo)
const getEstadoBarra = (pct: number) => {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  if (pct >= 50) return { bar: 'bg-amber-500', text: 'text-amber-400' };
  return { bar: 'bg-rose-500', text: 'text-rose-400' };
};

export default function Home() {
  // Pestaña Activa
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'perfil' | 'finanzas' | 'habitos' | 'nutricion' | 'extra' | 'notas'>('general');
  const [subSeccionExtra, setSubSeccionExtra] = useState<'agua' | 'sueno'>('agua');
  
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [horaVivo, setHoraVivo] = useState<string>('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clima, setClima] = useState<ClimaData | null>(null);

  // Perfil del Usuario
  const [perfil, setPerfil] = useState<PerfilUsuario>({
    nombre: '',
    fecha_nacimiento: '2000-01-01',
    peso: 75,
    altura: 175,
    sexo: 'masculino',
    objetivo: 'bajar',
    kilos_objetivo: 5,
    tiempo_objetivo_meses: 3, // Cambiado de semanas a meses
    porcentaje_probabilidad: 85
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Hábitos
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [registrosHoy, setRegistrosHoy] = useState<Record<number, RegistroHabito>>({});
  const [rachasHabitos, setRachasHabitos] = useState<Record<number, number>>({});
  const [nuevoHabito, setNuevoHabito] = useState('');
  const [horaObjetivo, setHoraObjetivo] = useState('18:00');

  // Finanzas
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>('gasto');
  const [categoria, setCategoria] = useState('Comida');
  const [esFijo, setEsFijo] = useState(false);

  // Nutrición / Calorías
  const [ejercicios, setEjercicios] = useState<ItemCalorico[]>([]);
  const [comidas, setComidas] = useState<ItemCalorico[]>(COMIDAS_POR_DEFECTO);
  const [guardandoCalorias, setGuardandoCalorias] = useState(false);

  // Hidratación
  const [aguaMl, setAguaMl] = useState<number>(0);
  const metaAguaMl = 2500;

  // Sueño
  const [suenoHoy, setSuenoHoy] = useState<RegistroSueno>({
    fecha: fechaSeleccionada,
    hora_acostarse: '23:00',
    hora_levantarse: '07:00',
    horas_totales: 8,
    calidad: 4,
  });

  // Notas
  const [notaDiaria, setNotaDiaria] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  const [cargando, setCargando] = useState(true);

  const cambiarSeccion = (id: 'general' | 'perfil' | 'finanzas' | 'habitos' | 'nutricion' | 'extra' | 'notas') => {
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
    };
    actualizarReloj();
    const timer = setInterval(actualizarReloj, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    obtenerClimaYUbicacion();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  // --- CÁLCULO AUTOMÁTICO DE PROBABILIDAD DE LOGRO ---
  const probabilidadCalculada = useMemo(() => {
    if (perfil.objetivo === 'mantener') return 95;
    if (!perfil.kilos_objetivo || perfil.kilos_objetivo <= 0 || !perfil.tiempo_objetivo_meses || perfil.tiempo_objetivo_meses <= 0) return 50;

    const kgPorMes = perfil.kilos_objetivo / perfil.tiempo_objetivo_meses;

    // Ritmo saludable/realista: 1kg a 3kg por mes
    if (kgPorMes <= 2.0) return 95;
    if (kgPorMes <= 3.5) return 80;
    if (kgPorMes <= 5.0) return 60;
    if (kgPorMes <= 6.5) return 40;
    return 20; // Objetivos no realistas (>6.5kg por mes)
  }, [perfil.objetivo, perfil.kilos_objetivo, perfil.tiempo_objetivo_meses]);

  // Actualiza la probabilidad internamente
  useEffect(() => {
    setPerfil(prev => ({ ...prev, porcentaje_probabilidad: probabilidadCalculada }));
  }, [probabilidadCalculada]);

  const obtenerClimaYUbicacion = () => {
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
              
              let desc = 'Despejado';
              let icono = '☀️';
              let rec = 'Día ideal para realizar tus actividades.';

              // Mapeo detallado de códigos WMO OpenMeteo
              if (code === 0) { desc = 'Despejado / Sol'; icono = '☀️'; }
              else if (code >= 1 && code <= 3) { desc = 'Parcialmente Nublado'; icono = '⛅'; }
              else if (code >= 45 && code <= 48) { desc = 'Neblina'; icono = '🌫️'; }
              else if (code >= 51 && code <= 67) { desc = 'Lluvia / Llovizna'; icono = '🌧️'; rec = '⚠️ Lluvia en tu zona. Llevá paraguas si salís.'; }
              else if (code >= 71 && code <= 77) { desc = 'Nieve'; icono = '❄️'; rec = '⚠️ Nieve. Abrigate muy bien.'; }
              else if (code >= 80 && code <= 82) { desc = 'Chaparrones'; icono = '🌦️'; rec = '⚠️ Probabilidad de chaparrones aislados.'; }
              else if (code >= 95) { desc = 'Tormenta Eléctrica'; icono = '⛈️'; rec = '⚠️ Alerta de tormenta. Mantenete a resguardo.'; }

              // Recomendaciones según temperatura
              if (temp <= 14) rec = `🧥 Hace frío (${temp}°C). Podés salir pero abrígate bien.`;
              else if (temp >= 28) rec = `☀️ Hace calor (${temp}°C). Recordá mantenerte bien hidratado.`;

              setClima({ temp, codigoClima: code, descripcion: desc, recomendacion: rec, ubicacion: textoUbicacion, icono });
            }
          } catch (e) {}
        },
        () => {
          setClima({ temp: 18, codigoClima: 0, descripcion: 'Templado', recomendacion: '🧥 Temperatura agradable. Llevá abrigo liviano.', ubicacion: 'Ubicación local', icono: '🌤️' });
        }
      );
    }
  };

  const calcularRachas = async (listaHabitos: Habito[]) => {
    const { data: historial } = await supabase.from('registro_habitos').select('habito_id, fecha, completado').eq('completado', true).order('fecha', { ascending: false });
    if (!historial) return;

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
    setCargando(true);

    // 0. Perfil de Usuario
    const { data: datosPerfil } = await supabase.from('perfil_usuario').select('*').limit(1).maybeSingle();
    if (datosPerfil) {
      setPerfil({
        ...datosPerfil,
        tiempo_objetivo_meses: datosPerfil.tiempo_objetivo_meses || datosPerfil.tiempo_objetivo_semanas || 3
      });
    }

    // 1. Hábitos
    const { data: datosHabitos } = await supabase.from('habitos').select('*').order('id', { ascending: true });
    if (datosHabitos) {
      setHabitos(datosHabitos);
      calcularRachas(datosHabitos);
    }

    // 2. Registros de hábitos
    const { data: datosRegistros } = await supabase.from('registro_habitos').select('*').eq('fecha', fechaSeleccionada);
    const mapaRegistros: Record<number, RegistroHabito> = {};
    if (datosRegistros) datosRegistros.forEach((reg) => { mapaRegistros[reg.habito_id] = reg; });
    setRegistrosHoy(mapaRegistros);

    // 3. Transacciones
    const { data: datosTransacciones } = await supabase.from('transacciones').select('*').order('fecha', { ascending: false });
    if (datosTransacciones) setTransacciones(datosTransacciones);

    // 4. Calorías & Agua
    const { data: datosCalorias } = await supabase.from('registro_calorias').select('*').eq('fecha', fechaSeleccionada).maybeSingle();
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

    // 5. Sueño
    const { data: datosSueno } = await supabase.from('registro_sueno').select('*').eq('fecha', fechaSeleccionada).maybeSingle();
    if (datosSueno) setSuenoHoy(datosSueno);
    else setSuenoHoy({ fecha: fechaSeleccionada, hora_acostarse: '23:00', hora_levantarse: '07:00', horas_totales: 8, calidad: 4 });

    // 6. Notas
    const { data: datosNota } = await supabase.from('notas_diarias').select('contenido').eq('fecha', fechaSeleccionada).maybeSingle();
    setNotaDiaria(datosNota?.contenido || '');

    setCargando(false);
  };

  // --- CÁLCULO BMR AUTOMÁTICO ---
  const bmrCalculado = useMemo(() => {
    if (!perfil.fecha_nacimiento || !perfil.peso || !perfil.altura) return 1500;
    const hoy = new Date();
    const cumple = new Date(perfil.fecha_nacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;

    let bmr = (10 * perfil.peso) + (6.25 * perfil.altura) - (5 * edad);
    return Math.round(perfil.sexo === 'masculino' ? bmr + 5 : bmr - 161);
  }, [perfil]);

  // --- MÉTODOS PERFIL ---
  const guardarPerfil = async () => {
    setGuardandoPerfil(true);
    const { error } = await supabase.from('perfil_usuario').upsert({ id: 1, ...perfil });
    setGuardandoPerfil(false);
    if (error) alert('❌ Error al guardar perfil: ' + error.message);
    else alert('✅ Perfil guardado correctamente');
  };

  // --- MÉTODOS HÁBITOS ---
  const agregarHabito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHabito.trim()) return;
    const { data, error } = await supabase.from('habitos').insert([{ texto: nuevoHabito, hora_objetivo: horaObjetivo }]).select();
    if (error) alert('❌ Error al agregar hábito: ' + error.message);
    else if (data) { setHabitos([...habitos, data[0]]); setNuevoHabito(''); }
  };

  const alternarHabito = async (habitoId: number) => {
    const estaCompletado = !!registrosHoy[habitoId]?.completado;
    const horaActual = obtenerHora24();

    if (!estaCompletado) {
      const { error } = await supabase.from('registro_habitos').upsert({ habito_id: habitoId, fecha: fechaSeleccionada, completado: true, hora_completado: horaActual });
      if (!error) {
        setRegistrosHoy((prev) => ({ ...prev, [habitoId]: { habito_id: habitoId, completado: true, hora_completado: horaActual } }));
        calcularRachas(habitos);
      } else alert('❌ Error: ' + error.message);
    } else {
      const { error } = await supabase.from('registro_habitos').delete().eq('habito_id', habitoId).eq('fecha', fechaSeleccionada);
      if (!error) {
        setRegistrosHoy((prev) => { const copia = { ...prev }; delete copia[habitoId]; return copia; });
        calcularRachas(habitos);
      } else alert('❌ Error: ' + error.message);
    }
  };

  const eliminarHabito = async (id: number) => {
    const { error } = await supabase.from('habitos').delete().eq('id', id);
    if (!error) setHabitos(habitos.filter((h) => h.id !== id));
    else alert('❌ Error: ' + error.message);
  };

  // --- MÉTODOS FINANZAS ---
  const agregarTransaccion = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0 || !descripcion.trim()) return;

    const fechaHora = new Date(`${fechaSeleccionada}T${obtenerHora24()}:00`).toISOString();
    const { data, error } = await supabase.from('transacciones').insert([{ descripcion, monto: numMonto, tipo, categoria, es_fijo: esFijo, fecha: fechaHora }]).select();
    if (error) alert('❌ Error: ' + error.message);
    else if (data) { setTransacciones([data[0], ...transacciones]); setMonto(''); setDescripcion(''); setEsFijo(false); }
  };

  const eliminarTransaccion = async (id: number) => {
    const { error } = await supabase.from('transacciones').delete().eq('id', id);
    if (!error) setTransacciones(transacciones.filter((t) => t.id !== id));
    else alert('❌ Error: ' + error.message);
  };

  // --- MÉTODOS NUTRICIÓN & AGUA ---
  const agregarEjercicio = () => setEjercicios([...ejercicios, { id: Date.now().toString(), nombre: 'Nuevo Entrenamiento', calorias: 0 }]);
  const actualizarEjercicio = (id: string, campo: 'nombre' | 'calorias', valor: any) => setEjercicios(ejercicios.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));
  const eliminarEjercicio = (id: string) => setEjercicios(ejercicios.filter((item) => item.id !== id));

  const agregarComida = () => setComidas([...comidas, { id: Date.now().toString(), nombre: 'Nueva Comida', calorias: 0 }]);
  const actualizarComida = (id: string, campo: 'nombre' | 'calorias', valor: any) => setComidas(comidas.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));
  const eliminarComida = (id: string) => setComidas(comidas.filter((item) => item.id !== id));

  const modificarAgua = async (deltaMl: number) => {
    const nuevaCantidad = Math.max(0, aguaMl + deltaMl);
    setAguaMl(nuevaCantidad);
    const { error } = await supabase.from('registro_calorias').upsert({ fecha: fechaSeleccionada, agua_ml: nuevaCantidad, base: bmrCalculado, ejercicios, comidas }, { onConflict: 'fecha' });
    if (error) alert('❌ Error al actualizar agua: ' + error.message);
  };

  const guardarCalorias = async () => {
    setGuardandoCalorias(true);
    const { error } = await supabase.from('registro_calorias').upsert({ fecha: fechaSeleccionada, base: bmrCalculado, agua_ml: aguaMl, ejercicios, comidas }, { onConflict: 'fecha' });
    setGuardandoCalorias(false);
    if (error) alert('❌ Error al guardar calorías: ' + error.message);
    else alert('✅ Nutrición y ejercicios guardados correctamente');
  };

  // --- MÉTODOS EXTRAS ---
  const guardarSueno = async () => {
    const [hA, mA] = suenoHoy.hora_acostarse.split(':').map(Number);
    const [hL, mL] = suenoHoy.hora_levantarse.split(':').map(Number);
    let minAcostado = hA * 60 + mA;
    let minLevantado = hL * 60 + mL;
    if (minLevantado < minAcostado) minLevantado += 24 * 60;
    const duracionHoras = parseFloat(((minLevantado - minAcostado) / 60).toFixed(1));

    const datosGuardar = { ...suenoHoy, fecha: fechaSeleccionada, horas_totales: duracionHoras };
    const { error } = await supabase.from('registro_sueno').upsert(datosGuardar, { onConflict: 'fecha' });
    if (error) alert('❌ Error al guardar sueño: ' + error.message);
    else {
      setSuenoHoy(datosGuardar);
      alert('✅ Sueño guardado correctamente');
    }
  };

  const guardarNota = async () => {
    setGuardandoNota(true);
    const { error } = await supabase.from('notas_diarias').upsert({ fecha: fechaSeleccionada, contenido: notaDiaria }, { onConflict: 'fecha' });
    setGuardandoNota(false);
    if (error) alert('❌ Error al guardar nota: ' + error.message);
    else alert('✅ Nota guardada correctamente');
  };

  // --- CÁLCULOS GLOBALES ---
  const transaccionesDelDia = transacciones.filter((t) => t.fecha && t.fecha.startsWith(fechaSeleccionada));
  const totalIngresos = transacciones.filter((t) => t.tipo === 'ingreso').reduce((acc, t) => acc + Number(t.monto), 0);
  const totalGastosFijos = transacciones.filter((t) => t.tipo === 'gasto' && t.es_fijo).reduce((acc, t) => acc + Number(t.monto), 0);
  const totalGastosTotales = transacciones.filter((t) => t.tipo === 'gasto').reduce((acc, t) => acc + Number(t.monto), 0);
  const balanceFinanciero = totalIngresos - totalGastosTotales;

  let pctGastoMensual = 0;
  if (totalIngresos > 0) pctGastoMensual = Math.min(100, Math.round((totalGastosTotales / totalIngresos) * 100));
  else if (totalGastosTotales > 0) pctGastoMensual = 100;

  const presupuestoDiario = Math.max(0, (totalIngresos - totalGastosFijos) / 30);
  const gastosVariablesHoy = transaccionesDelDia.filter((t) => t.tipo === 'gasto' && !t.es_fijo).reduce((acc, t) => acc + Number(t.monto), 0);

  let pctGastoDiario = 0;
  if (presupuestoDiario > 0) pctGastoDiario = Math.min(100, Math.round((gastosVariablesHoy / presupuestoDiario) * 100));
  else if (gastosVariablesHoy > 0) pctGastoDiario = 100;

  const totalCompletados = habitos.filter((h) => registrosHoy[h.id]?.completado).length;
  const porcentajeHabitos = habitos.length > 0 ? Math.round((totalCompletados / habitos.length) * 100) : 0;

  const totalGastoEjercicios = ejercicios.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const totalGastadoCal = bmrCalculado + totalGastoEjercicios;
  const totalIngeridoCal = comidas.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const balanceCalorico = totalIngeridoCal - totalGastadoCal;

  // CÁLCULO DE NOTA NUTRICIONAL
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

  // PORCENTAJES PARA RESUMEN GENERAL Y BARRAS
  const pctCalorias = evaluacionNutricion.nota * 10;
  const pctAgua = Math.min(100, Math.round((aguaMl / metaAguaMl) * 100));
  const pctGastosSaludables = Math.max(0, 100 - pctGastoDiario); // Si gasta menos, porcentaje más alto (verde)
  const pctSueño = Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100));

  const diaNumero = parseInt(fechaSeleccionada.split('-')[2] || '1', 10);
  const fraseDelDia = FRASES_MOTIVACIONALES[diaNumero % FRASES_MOTIVACIONALES.length];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row font-sans">
      
      {/* BARRA LATERAL */}
      <aside className={`bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 ${sidebarAbierto ? 'fixed inset-0 z-50 w-full h-full md:relative md:inset-auto md:w-64 md:h-auto' : 'w-full md:w-16'}`}>
        <div>
          <div className={`p-3 sm:p-4 flex items-center ${sidebarAbierto ? 'justify-between' : 'justify-start'} border-b border-slate-800`}>
            {sidebarAbierto && <h1 className="font-bold text-lg text-indigo-400 tracking-wide">Panel Personal</h1>}
            <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center justify-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">{sidebarAbierto ? '✕ Cerrar' : '☰ Menú'}</span>
            </button>
          </div>

          <nav className={`p-2 sm:p-3 ${sidebarAbierto ? 'flex flex-col space-y-2' : 'flex flex-row md:flex-col overflow-x-auto gap-1.5 md:space-y-1.5 justify-around md:justify-start'}`}>
            {[
              { id: 'general', label: 'General', icon: '📊' },
              { id: 'perfil', label: 'Mi Perfil', icon: '👤' },
              { id: 'finanzas', label: 'Finanzas', icon: '💵' },
              { id: 'habitos', label: 'Hábitos diarios', icon: '⚡' },
              { id: 'nutricion', label: 'Nutrición', icon: '🔥' },
              { id: 'extra', label: 'Extra', icon: '✨' },
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
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3 mt-auto">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Fecha Activa</label>
              <input type="date" value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"/>
            </div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto">
        
        {/* HEADER CON NOMBRE ALINEADO A LA DERECHA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-100 whitespace-nowrap">
              {seccionActiva === 'general' && '📊 Resumen General'}
              {seccionActiva === 'perfil' && '👤 Mi Perfil y Objetivos'}
              {seccionActiva === 'finanzas' && '💵 Control Financiero'}
              {seccionActiva === 'habitos' && '⚡ Hábitos Diarios'}
              {seccionActiva === 'nutricion' && '🔥 Nutrición y Calorías'}
              {seccionActiva === 'extra' && '✨ Módulos Extra'}
              {seccionActiva === 'notas' && '📝 Notas'}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1"><span>📅</span> {formatearFechaLarga(fechaSeleccionada)}</span>
              <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-800 flex items-center gap-1"><span>🕒</span> {horaVivo || '00:00:00'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto w-full md:w-auto justify-end">
            {/* VISTA DEL CLIMA Y RECOMENDACIÓN CORREGIDA */}
            {clima && (
              <a 
                href={`https://www.google.com/search?q=clima+${clima.ubicacion}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 px-3.5 py-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                title="Ver pronóstico detallado"
              >
                <span className="text-2xl shrink-0">{clima.icono}</span>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{clima.temp}°C</span>
                    <span className="text-xs text-slate-400">• {clima.descripcion}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-indigo-300 truncate max-w-[220px]">{clima.recomendacion}</p>
                </div>
              </a>
            )}

            {/* NOMBRE DE USUARIO PEGADO A LA DERECHA */}
            {perfil.nombre && (
              <div className="text-right shrink-0 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Perfil</span>
                <span className="text-sm font-bold text-indigo-400">{perfil.nombre} 👋</span>
              </div>
            )}
          </div>
        </header>

        <div className="mb-6 bg-indigo-950/40 border border-indigo-800/50 p-3 rounded-xl text-center text-indigo-300 text-xs font-medium italic">
          {fraseDelDia}
        </div>

        {cargando ? (
          <div className="text-center py-16 text-slate-400 font-medium">Cargando datos... ⏳</div>
        ) : (
          <div>
            {/* 1. GENERAL */}
            {seccionActiva === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                  
                  {/* CALORÍAS */}
                  <div onClick={() => cambiarSeccion('nutricion')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-amber-500/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Bal. Calórico</span>
                        {/* Porcentaje y Barra */}
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

                  {/* GASTOS HOY */}
                  <div onClick={() => cambiarSeccion('finanzas')} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:scale-105 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">Gastos Hoy</span>
                        <span className={`text-xs font-bold ${getEstadoBarra(pctGastosSaludables).text}`}>{pctGastosSaludables}%</span>
                        <span className="text-base ml-1">💵</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                        <div className={`h-full rounded-full ${getEstadoBarra(pctGastosSaludables).bar}`} style={{ width: `${pctGastosSaludables}%` }}></div>
                      </div>
                      <p className="text-2xl font-extrabold text-emerald-400">${formatearMonto(gastosVariablesHoy)}</p>
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 mt-2">Clic para Finanzas</p>
                  </div>

                  {/* FÍSICO / LOGRO */}
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

            {/* 2. PERFIL */}
            {seccionActiva === 'perfil' && (
              <section className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6 max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-200">👤 Datos Personales y Objetivos</h2>
                
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
                          {/* CAMBIO A MESES */}
                          <label className="text-xs text-slate-400 block mb-1">En tiempo (Meses)</label>
                          <input type="number" min="1" value={perfil.tiempo_objetivo_meses} onChange={(e) => setPerfil({...perfil, tiempo_objetivo_meses: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" />
                        </div>
                      </div>
                    )}
                    
                    {/* PROBABILIDAD DE LOGRO CÁLCULO AUTOMÁTICO (NO EDITABLE) */}
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

                <button onClick={guardarPerfil} disabled={guardandoPerfil} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                  {guardandoPerfil ? 'Guardando...' : '💾 Guardar Perfil y Actualizar Cálculos'}
                </button>
              </section>
            )}

            {/* 3. FINANZAS */}
            {seccionActiva === 'finanzas' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>💵 Resumen Financiero</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">
                    Balance: <span className={balanceFinanciero < 0 ? 'text-rose-400' : 'text-emerald-400'}>${formatearMonto(balanceFinanciero)}</span>
                  </span>
                </h2>

                <div className="space-y-3">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400 font-medium">Fondo Mensual Consumido:</span>
                      <span className={`font-mono font-bold ${pctGastoMensual >= 100 ? 'text-rose-400' : 'text-slate-300'}`}>{pctGastoMensual}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div className={`h-full rounded-full transition-all duration-500 ${pctGastoMensual >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pctGastoMensual}%` }}></div>
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-300 font-semibold block">Gastos Diarios (Variables)</span>
                        <span className="text-[10px] text-slate-400">Hoy: ${formatearMonto(gastosVariablesHoy)} / Disp: ${formatearMonto(presupuestoDiario)}</span>
                      </div>
                      <span className={`font-mono font-bold ${pctGastoDiario >= 100 ? 'text-rose-400' : 'text-emerald-400'}`}>{pctGastoDiario}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div className={`h-full rounded-full transition-all duration-500 ${pctGastoDiario >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pctGastoDiario}%` }}></div>
                    </div>
                  </div>
                </div>

                <form onSubmit={agregarTransaccion} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="Descripción..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="min-w-0 flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                    <input type="number" placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full sm:w-32 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <select value={tipo} onChange={(e) => setTipo(e.target.value as 'ingreso' | 'gasto')} className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer">
                      <option value="gasto">Gasto 🔻</option>
                      <option value="ingreso">Ingreso 🟢</option>
                    </select>
                    <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer">
                      {(tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {tipo === 'gasto' && (
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-700">
                        <input type="checkbox" checked={esFijo} onChange={(e) => setEsFijo(e.target.checked)} className="accent-emerald-500 rounded cursor-pointer"/>
                        <span>📌 Gasto Fijo</span>
                      </label>
                    )}
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition cursor-pointer flex items-center justify-center">➕ Agregar</button>
                  </div>
                </form>

                <div className="space-y-2 mt-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Historial de Transacciones</h3>
                  {transacciones.length === 0 ? <p className="text-xs text-slate-500 italic">No hay transacciones registradas.</p> : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {transacciones.map((t) => (
                        <div key={t.id} className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{t.tipo === 'ingreso' ? '🟢' : '🔻'}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-200 truncate">{t.descripcion}</p>
                              <p className="text-[10px] text-slate-400">{t.categoria} {t.es_fijo && '• 📌 Fijo'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-mono font-bold text-sm ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}${formatearMonto(t.monto)}
                            </span>
                            <button onClick={() => eliminarTransaccion(t.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 4. HÁBITOS */}
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

            {/* 5. NUTRICIÓN */}
            {seccionActiva === 'nutricion' && (
             <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-amber-400">🔥 Nutrición y Balance Calórico</h2>

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

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🏃 Ejercicios (+Gasto)</h3>
                    <button onClick={agregarEjercicio} className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer">+ Agregar Ejercicio</button>
                  </div>
                  {ejercicios.map((item) => (
                    <div key={item.id} className="flex gap-1.5 sm:gap-2 items-center w-full">
                      <input type="text" value={item.nombre} onChange={(e) => actualizarEjercicio(item.id, 'nombre', e.target.value)} className="min-w-0 flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-2 sm:px-3 py-1.5 text-xs text-white" />
                      <input type="number" value={item.calorias} onChange={(e) => actualizarEjercicio(item.id, 'calorias', Number(e.target.value))} className="w-16 sm:w-20 bg-slate-900/80 border border-slate-700 rounded-xl px-2 sm:px-3 py-1.5 text-xs text-white text-right" />
                      <span className="text-[11px] sm:text-xs text-slate-400 shrink-0">kcal</span>
                      <button onClick={() => eliminarEjercicio(item.id)} className="text-slate-500 hover:text-rose-400 shrink-0 p-1 cursor-pointer">🗑️</button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🥗 Comidas del día (+Ingesta)</h3>
                    <button onClick={agregarComida} className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer">+ Agregar Comida</button>
                  </div>
                  {comidas.map((item) => (
                    <div key={item.id} className="flex gap-1.5 sm:gap-2 items-center w-full">
                      <input type="text" value={item.nombre} onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)} className="min-w-0 flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-2 sm:px-3 py-1.5 text-xs text-white" />
                      <input type="number" value={item.calorias} onChange={(e) => actualizarComida(item.id, 'calorias', Number(e.target.value))} className="w-16 sm:w-20 bg-slate-900/80 border border-slate-700 rounded-xl px-2 sm:px-3 py-1.5 text-xs text-white text-right" />
                      <span className="text-[11px] sm:text-xs text-slate-400 shrink-0">kcal</span>
                      <button onClick={() => eliminarComida(item.id)} className="text-slate-500 hover:text-rose-400 shrink-0 p-1 cursor-pointer">🗑️</button>
                    </div>
                  ))}
                </div>

                <button onClick={guardarCalorias} disabled={guardandoCalorias} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50">
                  {guardandoCalorias ? 'Guardando...' : '💾 Guardar Registro Calórico y Ejercicios'}
                </button>
              </section>
            )}

            {/* 6. EXTRA */}
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
                      <button onClick={() => modificarAgua(250)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">➕ 🥤 +250 ml</button>
                      <button onClick={() => modificarAgua(500)} className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">➕ 🍾 +500 ml</button>
                      <button onClick={() => modificarAgua(-250)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer">➖ 250 ml</button>
                    </div>
                  </div>
                )}

                {subSeccionExtra === 'sueno' && (
                  <div className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-indigo-400">😴 Registro de Sueño y Descanso</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de acostarse</label>
                        <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({ ...suenoHoy, hora_acostarse: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de levantarse</label>
                        <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({ ...suenoHoy, hora_levantarse: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Calidad (1-5 ⭐)</label>
                        <select value={suenoHoy.calidad} onChange={(e) => setSuenoHoy({ ...suenoHoy, calidad: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white cursor-pointer">
                          <option value={1}>⭐ 1 - Muy malo</option>
                          <option value={2}>⭐⭐ 2 - Regular</option>
                          <option value={3}>⭐⭐⭐ 3 - Aceptable</option>
                          <option value={4}>⭐⭐⭐⭐ 4 - Bueno</option>
                          <option value={5}>⭐⭐⭐⭐⭐ 5 - Reparador</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Total Sueño Calculado:</span>
                      <span className="text-base font-bold text-indigo-300">{suenoHoy.horas_totales || 8} Horas</span>
                    </div>
                    <button onClick={guardarSueno} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer">💾 Guardar Sueño</button>
                  </div>
                )}
              </div>
            )}

            {/* 7. NOTAS */}
            {seccionActiva === 'notas' && (
              <section className="bg-slate-800/60 p-3.5 sm:p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
                <h2 className="text-xl font-semibold text-indigo-400">📝 Notas del Día</h2>
                <textarea value={notaDiaria} onChange={(e) => setNotaDiaria(e.target.value)} placeholder="Escribe tus reflexiones, recordatorios o pendientes para hoy..." rows={8} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none" />
                <button onClick={guardarNota} disabled={guardandoNota} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50">
                  {guardandoNota ? 'Guardando...' : '💾 Guardar Nota'}
                </button>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}