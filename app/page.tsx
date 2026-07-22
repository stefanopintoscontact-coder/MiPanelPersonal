'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// --- INTERFACES ---
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
}

interface RegistroSueno {
  id?: number;
  fecha: string;
  hora_acostarse: string;
  hora_levantarse: string;
  horas_totales: number;
  calidad: number;
}

interface RegistroPeso {
  id?: number;
  fecha: string;
  peso: number;
}

interface MetaMensual {
  id: number;
  mes: string;
  titulo: string;
  progreso_actual: number;
  progreso_objetivo: number;
  unidad: string;
  completado: boolean;
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

export default function Home() {
  // Pestaña Activa
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'finanzas' | 'habitos' | 'nutricion' | 'extra' | 'notas'>('general');
  const [subSeccionExtra, setSubSeccionExtra] = useState<'agua' | 'sueno' | 'peso' | 'metas' | 'pomodoro'>('agua');
  const [sidebarAbierto, setSidebarAbierto] = useState(true);

  // Hora actual en vivo
  const [horaVivo, setHoraVivo] = useState<string>('');

  // Fecha activa
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Clima y Ubicación
  const [clima, setClima] = useState<ClimaData | null>(null);

  // Hábitos y Rachas
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
  const [baseMetabolismo, setBaseMetabolismo] = useState<number>(1513);
  const [ejercicios, setEjercicios] = useState<ItemCalorico[]>([]);
  const [comidas, setComidas] = useState<ItemCalorico[]>(COMIDAS_POR_DEFECTO);
  const [guardandoCalorias, setGuardandoCalorias] = useState(false);

  // Novedades: Hidratación (Agua)
  const [aguaMl, setAguaMl] = useState<number>(0);
  const metaAguaMl = 2500; // Objetivo de 2.5 Litros diario

  // Novedades: Sueño
  const [suenoHoy, setSuenoHoy] = useState<RegistroSueno>({
    fecha: fechaSeleccionada,
    hora_acostarse: '23:00',
    hora_levantarse: '07:00',
    horas_totales: 8,
    calidad: 4,
  });

  // Novedades: Peso
  const [historialPeso, setHistorialPeso] = useState<RegistroPeso[]>([]);
  const [nuevoPeso, setNuevoPeso] = useState<string>('');

  // Novedades: Metas (OKRs)
  const [metas, setMetas] = useState<MetaMensual[]>([]);
  const [nuevaMetaTitulo, setNuevaMetaTitulo] = useState('');
  const [nuevaMetaObjetivo, setNuevaMetaObjetivo] = useState('100');

  // Novedades: Temporizador Pomodoro
  const [pomodoroSegundos, setPomodoroSegundos] = useState<number>(25 * 60);
  const [pomodoroActivo, setPomodoroActivo] = useState<boolean>(false);
  const [pomodoroModo, setPomodoroModo] = useState<'trabajo' | 'descanso'>('trabajo');

  // Notas
  const [notaDiaria, setNotaDiaria] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  const [cargando, setCargando] = useState(true);

  // Reloj en tiempo real
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

  // Temporizador Pomodoro Effect
  useEffect(() => {
    let interval: any = null;
    if (pomodoroActivo && pomodoroSegundos > 0) {
      interval = setInterval(() => setPomodoroSegundos((s) => s - 1), 1000);
    } else if (pomodoroSegundos === 0 && pomodoroActivo) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(pomodoroModo === 'trabajo' ? '¡Tiempo de descanso!' : '¡Tiempo de enfocarse!');
      }
      if (pomodoroModo === 'trabajo') {
        setPomodoroModo('descanso');
        setPomodoroSegundos(5 * 60);
      } else {
        setPomodoroModo('trabajo');
        setPomodoroSegundos(25 * 60);
      }
      setPomodoroActivo(false);
    }
    return () => clearInterval(interval);
  }, [pomodoroActivo, pomodoroSegundos, pomodoroModo]);

  useEffect(() => {
    obtenerClimaYUbicacion();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const obtenerClimaYUbicacion = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const resClima = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            );
            const dataClima = await resClima.json();

            let textoUbicacion = 'Tu ubicación';
            try {
              const resGeo = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
              );
              const dataGeo = await resGeo.json();
              const ciudad = dataGeo.city || dataGeo.locality || dataGeo.principalSubdivision || '';
              const pais = dataGeo.countryName || '';
              if (ciudad && pais) textoUbicacion = `${ciudad}, ${pais}`;
              else if (pais) textoUbicacion = pais;
            } catch (geoErr) {
              console.error('Error al obtener la ciudad/país', geoErr);
            }

            if (dataClima.current_weather) {
              const temp = Math.round(dataClima.current_weather.temperature);
              const code = dataClima.current_weather.weathercode;
              let desc = 'Despejado';
              let rec = 'Día ideal para realizar tus tareas.';

              if (code >= 1 && code <= 3) desc = 'Parcialmente Nublado';
              else if (code >= 45 && code <= 48) desc = 'Neblina';
              else if (code >= 51 && code <= 67) {
                desc = 'Lluvia / Llovizna';
                rec = '⚠️ Lluvia en tu zona. Recordá llevar paraguas si salís.';
              } else if (code >= 80 && code <= 82) {
                desc = 'Chubascos';
                rec = '⚠️ Probabilidad de chaparrones.';
              }

              if (temp >= 26) rec += ' Hace calor, hidrátate bien.';
              else if (temp <= 12) rec += ' Hace frío, salí abrigado.';

              setClima({
                temp,
                codigoClima: code,
                descripcion: desc,
                recomendacion: rec,
                ubicacion: textoUbicacion,
              });
            }
          } catch (e) {
            console.error('Error al obtener clima', e);
          }
        },
        () => {
          setClima({
            temp: 18,
            codigoClima: 0,
            descripcion: 'Templado',
            recomendacion: 'Recuerda llevar ropa cómoda según tus actividades.',
            ubicacion: 'Ubicación local',
          });
        }
      );
    }
  };

  const calcularRachas = async (listaHabitos: Habito[]) => {
    // Calcula la racha consecutiva de cada hábito en base al historial
    const { data: historial } = await supabase
      .from('registro_habitos')
      .select('habito_id, fecha, completado')
      .eq('completado', true)
      .order('fecha', { ascending: false });

    if (!historial) return;

    const mapaRachas: Record<number, number> = {};
    listaHabitos.forEach((h) => {
      const registrosDeHabito = historial.filter((r) => r.habito_id === h.id);
      let racha = 0;
      let fechaActual = new Date();

      for (let i = 0; i < 30; i++) {
        const strFecha = fechaActual.toISOString().split('T')[0];
        const exist = registrosDeHabito.some((r) => r.fecha === strFecha);
        if (exist) {
          racha++;
          fechaActual.setDate(fechaActual.getDate() - 1);
        } else if (i === 0) {
          // Si hoy no se ha marcado aún, verificar si ayer sí se cumplió
          fechaActual.setDate(fechaActual.getDate() - 1);
        } else {
          break;
        }
      }
      mapaRachas[h.id] = racha;
    });

    setRachasHabitos(mapaRachas);
  };

  const cargarDatos = async () => {
    setCargando(true);

    // 1. Hábitos
    const { data: datosHabitos } = await supabase.from('habitos').select('*').order('id', { ascending: true });
    if (datosHabitos) {
      setHabitos(datosHabitos);
      calcularRachas(datosHabitos);
    }

    // 2. Registros de hábitos
    const { data: datosRegistros } = await supabase.from('registro_habitos').select('*').eq('fecha', fechaSeleccionada);
    const mapaRegistros: Record<number, RegistroHabito> = {};
    if (datosRegistros) {
      datosRegistros.forEach((reg) => {
        mapaRegistros[reg.habito_id] = reg;
      });
    }
    setRegistrosHoy(mapaRegistros);

    // 3. Transacciones
    const { data: datosTransacciones } = await supabase.from('transacciones').select('*').order('fecha', { ascending: false });
    if (datosTransacciones) setTransacciones(datosTransacciones);

    // 4. Calorías & Agua
    const { data: datosCalorias } = await supabase.from('registro_calorias').select('*').eq('fecha', fechaSeleccionada).maybeSingle();
    if (datosCalorias) {
      setBaseMetabolismo(datosCalorias.base ?? 1513);
      setAguaMl(datosCalorias.agua_ml ?? 0);

      if (datosCalorias.ejercicios && Array.isArray(datosCalorias.ejercicios)) {
        setEjercicios(datosCalorias.ejercicios);
      } else {
        const viejosEjercicios: ItemCalorico[] = [];
        if (datosCalorias.fuerza) viejosEjercicios.push({ id: 'fuerza', nombre: 'Fuerza', calorias: datosCalorias.fuerza });
        if (datosCalorias.boxeo) viejosEjercicios.push({ id: 'boxeo', nombre: 'Boxeo', calorias: datosCalorias.boxeo });
        if (datosCalorias.running) viejosEjercicios.push({ id: 'running', nombre: 'Running', calorias: datosCalorias.running });
        setEjercicios(viejosEjercicios);
      }

      if (datosCalorias.comidas && Array.isArray(datosCalorias.comidas) && datosCalorias.comidas.length > 0) {
        setComidas(datosCalorias.comidas);
      } else {
        setComidas([
          { id: '1', nombre: 'Desayuno', calorias: datosCalorias.desayuno || 0 },
          { id: '2', nombre: 'Almuerzo', calorias: datosCalorias.almuerzo || 0 },
          { id: '3', nombre: 'Merienda', calorias: datosCalorias.merienda || 0 },
          { id: '4', nombre: 'Cena', calorias: datosCalorias.cena || 0 },
          { id: '5', nombre: 'Extra', calorias: datosCalorias.extra || 0 },
        ]);
      }
    } else {
      setBaseMetabolismo(1513);
      setAguaMl(0);
      setEjercicios([]);
      setComidas(COMIDAS_POR_DEFECTO);
    }

    // 5. Sueño
    const { data: datosSueno } = await supabase.from('registro_sueno').select('*').eq('fecha', fechaSeleccionada).maybeSingle();
    if (datosSueno) {
      setSuenoHoy(datosSueno);
    } else {
      setSuenoHoy({ fecha: fechaSeleccionada, hora_acostarse: '23:00', hora_levantarse: '07:00', horas_totales: 8, calidad: 4 });
    }

    // 6. Peso Histórico
    const { data: datosPeso } = await supabase.from('registro_peso').select('*').order('fecha', { ascending: false }).limit(10);
    if (datosPeso) setHistorialPeso(datosPeso);

    // 7. Metas Mensuales
    const mesActual = fechaSeleccionada.slice(0, 7);
    const { data: datosMetas } = await supabase.from('metas_mensuales').select('*').eq('mes', mesActual);
    if (datosMetas) setMetas(datosMetas);

    // 8. Notas
    const { data: datosNota } = await supabase.from('notas_diarias').select('contenido').eq('fecha', fechaSeleccionada).maybeSingle();
    setNotaDiaria(datosNota?.contenido || '');

    setCargando(false);
  };

  // --- MÉTODOS HÁBITOS ---
  const agregarHabito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHabito.trim()) return;

    const { data, error } = await supabase
      .from('habitos')
      .insert([{ texto: nuevoHabito, hora_objetivo: horaObjetivo }])
      .select();

    if (!error && data) {
      setHabitos([...habitos, data[0]]);
      setNuevoHabito('');
    }
  };

  const alternarHabito = async (habitoId: number) => {
    const estaCompletado = !!registrosHoy[habitoId]?.completado;
    const horaActual = obtenerHora24();

    if (!estaCompletado) {
      const { error } = await supabase.from('registro_habitos').upsert({
        habito_id: habitoId,
        fecha: fechaSeleccionada,
        completado: true,
        hora_completado: horaActual,
      });

      if (!error) {
        setRegistrosHoy((prev) => ({
          ...prev,
          [habitoId]: { habito_id: habitoId, completado: true, hora_completado: horaActual },
        }));
        calcularRachas(habitos);
      }
    } else {
      const { error } = await supabase.from('registro_habitos').delete().eq('habito_id', habitoId).eq('fecha', fechaSeleccionada);

      if (!error) {
        setRegistrosHoy((prev) => {
          const copia = { ...prev };
          delete copia[habitoId];
          return copia;
        });
        calcularRachas(habitos);
      }
    }
  };

  const eliminarHabito = async (id: number) => {
    const { error } = await supabase.from('habitos').delete().eq('id', id);
    if (!error) {
      setHabitos(habitos.filter((h) => h.id !== id));
    }
  };

  // --- MÉTODOS FINANZAS ---
  const agregarTransaccion = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0 || !descripcion.trim()) return;

    const fechaHora = new Date(`${fechaSeleccionada}T${obtenerHora24()}:00`).toISOString();

    const { data, error } = await supabase
      .from('transacciones')
      .insert([{ descripcion, monto: numMonto, tipo, categoria, es_fijo: esFijo, fecha: fechaHora }])
      .select();

    if (!error && data) {
      setTransacciones([data[0], ...transacciones]);
      setMonto('');
      setDescripcion('');
      setEsFijo(false);
    }
  };

  const eliminarTransaccion = async (id: number) => {
    const { error } = await supabase.from('transacciones').delete().eq('id', id);
    if (!error) {
      setTransacciones(transacciones.filter((t) => t.id !== id));
    }
  };

  // --- MÉTODOS NUTRICIÓN & AGUA ---
  const agregarEjercicio = () => {
    setEjercicios([
      ...ejercicios,
      { id: Date.now().toString(), nombre: 'Nuevo Entrenamiento', calorias: 0 }
    ]);
  };

  const actualizarEjercicio = (id: string, campo: 'nombre' | 'calorias', valor: any) => {
    setEjercicios(
      ejercicios.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const eliminarEjercicio = (id: string) => {
    setEjercicios(ejercicios.filter((item) => item.id !== id));
  };

  const agregarComida = () => {
    setComidas([
      ...comidas,
      { id: Date.now().toString(), nombre: 'Nueva Comida', calorias: 0 }
    ]);
  };

  const actualizarComida = (id: string, campo: 'nombre' | 'calorias', valor: any) => {
    setComidas(
      comidas.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const eliminarComida = (id: string) => {
    setComidas(comidas.filter((item) => item.id !== id));
  };

  const modificarAgua = async (deltaMl: number) => {
    const nuevaCantidad = Math.max(0, aguaMl + deltaMl);
    setAguaMl(nuevaCantidad);
    await supabase.from('registro_calorias').upsert(
      { fecha: fechaSeleccionada, agua_ml: nuevaCantidad, base: baseMetabolismo, ejercicios, comidas },
      { onConflict: 'fecha' }
    );
  };

  const guardarCalorias = async () => {
    setGuardandoCalorias(true);
    await supabase.from('registro_calorias').upsert(
      {
        fecha: fechaSeleccionada,
        base: baseMetabolismo,
        agua_ml: aguaMl,
        ejercicios,
        comidas,
      },
      { onConflict: 'fecha' }
    );
    setGuardandoCalorias(false);
  };

  // --- MÉTODOS EXTRAS (SUEÑO, PESO, METAS) ---
  const guardarSueno = async () => {
    const [hA, mA] = suenoHoy.hora_acostarse.split(':').map(Number);
    const [hL, mL] = suenoHoy.hora_levantarse.split(':').map(Number);
    let minAcostado = hA * 60 + mA;
    let minLevantado = hL * 60 + mL;
    if (minLevantado < minAcostado) minLevantado += 24 * 60;
    const duracionHoras = parseFloat(((minLevantado - minAcostado) / 60).toFixed(1));

    const datosGuardar = { ...suenoHoy, fecha: fechaSeleccionada, horas_totales: duracionHoras };
    await supabase.from('registro_sueno').upsert(datosGuardar, { onConflict: 'fecha' });
    setSuenoHoy(datosGuardar);
  };

  const guardarPeso = async () => {
    const num = parseFloat(nuevoPeso);
    if (isNaN(num) || num <= 0) return;
    const { data } = await supabase.from('registro_peso').upsert({ fecha: fechaSeleccionada, peso: num }, { onConflict: 'fecha' }).select();
    if (data) {
      setHistorialPeso([data[0], ...historialPeso.filter((p) => p.fecha !== fechaSeleccionada)]);
      setNuevoPeso('');
    }
  };

  const agregarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMetaTitulo.trim()) return;
    const mesActual = fechaSeleccionada.slice(0, 7);
    const obj = parseInt(nuevaMetaObjetivo, 10) || 100;

    const { data } = await supabase.from('metas_mensuales').insert([{
      mes: mesActual,
      titulo: nuevaMetaTitulo,
      progreso_actual: 0,
      progreso_objetivo: obj,
      unidad: '%'
    }]).select();

    if (data) {
      setMetas([...metas, data[0]]);
      setNuevaMetaTitulo('');
    }
  };

  const actualizarProgresoMeta = async (id: number, nuevoValor: number) => {
    const meta = metas.find((m) => m.id === id);
    if (!meta) return;
    const completado = nuevoValor >= meta.progreso_objetivo;
    await supabase.from('metas_mensuales').update({ progreso_actual: nuevoValor, completado }).eq('id', id);
    setMetas(metas.map((m) => (m.id === id ? { ...m, progreso_actual: nuevoValor, completado } : m)));
  };

  const pedirPermisoNotificaciones = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') alert('¡Notificaciones activadas con éxito!');
      });
    }
  };

  const guardarNota = async () => {
    setGuardandoNota(true);
    await supabase.from('notas_diarias').upsert({ fecha: fechaSeleccionada, contenido: notaDiaria }, { onConflict: 'fecha' });
    setGuardandoNota(false);
  };

  // --- CÁLCULOS ---
  const transaccionesDelDia = transacciones.filter((t) => t.fecha && t.fecha.startsWith(fechaSeleccionada));
  const totalIngresos = transacciones.filter((t) => t.tipo === 'ingreso').reduce((acc, t) => acc + Number(t.monto), 0);
  const totalGastosFijos = transacciones.filter((t) => t.tipo === 'gasto' && t.es_fijo).reduce((acc, t) => acc + Number(t.monto), 0);
  const totalGastosTotales = transacciones.filter((t) => t.tipo === 'gasto').reduce((acc, t) => acc + Number(t.monto), 0);
  const balanceFinanciero = totalIngresos - totalGastosTotales;

  let pctGastoMensual = 0;
  if (totalIngresos > 0) {
    pctGastoMensual = Math.min(100, Math.round((totalGastosTotales / totalIngresos) * 100));
  } else if (totalGastosTotales > 0) {
    pctGastoMensual = 100;
  }

  const presupuestoDiario = Math.max(0, (totalIngresos - totalGastosFijos) / 30);
  const gastosVariablesHoy = transaccionesDelDia.filter((t) => t.tipo === 'gasto' && !t.es_fijo).reduce((acc, t) => acc + Number(t.monto), 0);

  let pctGastoDiario = 0;
  if (presupuestoDiario > 0) {
    pctGastoDiario = Math.min(100, Math.round((gastosVariablesHoy / presupuestoDiario) * 100));
  } else if (gastosVariablesHoy > 0) {
    pctGastoDiario = 100;
  }

  const totalCompletados = habitos.filter((h) => registrosHoy[h.id]?.completado).length;
  const porcentajeHabitos = habitos.length > 0 ? Math.round((totalCompletados / habitos.length) * 100) : 0;

  const totalGastoEjercicios = ejercicios.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const totalGastadoCal = Number(baseMetabolismo || 0) + totalGastoEjercicios;
  const totalIngeridoCal = comidas.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const balanceCalorico = totalIngeridoCal - totalGastadoCal;

  let diagnosticoCalorico = '';
  if (balanceCalorico < -800) {
    diagnosticoCalorico = '⚠️ Déficit calórico extremo. Cuidado: un déficit tan marcado puede llevar a pérdida de masa muscular, fatiga y bajo rendimiento.';
  } else if (balanceCalorico < -100) {
    diagnosticoCalorico = '🔥 Déficit calórico moderado. Excelente rango para perder grasa de forma saludable conservando masa muscular.';
  } else if (balanceCalorico >= -100 && balanceCalorico <= 100) {
    diagnosticoCalorico = '⚖️ Balance neutro (mantenimiento). Tu ingesta calórica emparejó exactamente tu gasto del día.';
  } else if (balanceCalorico > 100 && balanceCalorico <= 600) {
    diagnosticoCalorico = '📈 Superávit calórico moderado. Aporte adicional de energía para recuperación muscular o ganancia de masa.';
  } else {
    diagnosticoCalorico = '⚠️ Superávit calórico elevado. Consumiste un volumen alto de calorías por encima de tu gasto diario.';
  }

  const diaNumero = parseInt(fechaSeleccionada.split('-')[2] || '1', 10);
  const fraseDelDia = FRASES_MOTIVACIONALES[diaNumero % FRASES_MOTIVACIONALES.length];

  const minPomodoro = Math.floor(pomodoroSegundos / 60);
  const segPomodoro = String(pomodoroSegundos % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex font-sans">
      
      {/* BARRA LATERAL */}
      <aside className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between ${sidebarAbierto ? 'w-64' : 'w-20'}`}>
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-800">
            {sidebarAbierto && <h1 className="font-bold text-lg text-indigo-400 tracking-wide">Panel Personal</h1>}
            <button
              onClick={() => setSidebarAbierto(!sidebarAbierto)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition mx-auto cursor-pointer"
            >
              {sidebarAbierto ? '◀' : '▶'}
            </button>
          </div>

          <nav className="p-3 space-y-1.5">
            {[
              { id: 'general', label: 'General', icon: '📊' },
              { id: 'finanzas', label: 'Finanzas', icon: '💵' },
              { id: 'habitos', label: 'Hábitos diarios', icon: '⚡' },
              { id: 'nutricion', label: 'Nutrición', icon: '🔥' },
              { id: 'extra', label: 'Extra', icon: '✨' },
              { id: 'notas', label: 'Notas', icon: '📝' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSeccionActiva(item.id as any)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                  seccionActiva === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarAbierto && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {sidebarAbierto && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Fecha Activa</label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
            <button
              onClick={pedirPermisoNotificaciones}
              className="w-full text-left text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
            >
              <span>🔔</span> Activar Alertas Navegador
            </button>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        
        {/* HEADER TOP BAR CON FECHA, RELOJ, POMODORO Y CLIMA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 capitalize">
              {seccionActiva === 'general' && '📊 Resumen General'}
              {seccionActiva === 'finanzas' && '💵 Control Financiero'}
              {seccionActiva === 'habitos' && '⚡ Hábitos Diarios'}
              {seccionActiva === 'nutricion' && '🔥 Nutrición y Calorías'}
              {seccionActiva === 'extra' && '✨ Módulos Extra'}
              {seccionActiva === 'notas' && '📝 Notas'}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                <span>📅</span> {formatearFechaLarga(fechaSeleccionada)}
              </span>

              <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-800 flex items-center gap-1">
                <span>🕒</span> {horaVivo || '00:00:00'}
              </span>

              {/* Pomodoro widget en header */}
              <button
                onClick={() => { setSeccionActiva('extra'); setSubSeccionExtra('pomodoro'); }}
                className="text-xs font-mono font-bold bg-amber-950/60 text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-800 flex items-center gap-1.5 hover:bg-amber-900/50 transition cursor-pointer"
              >
                <span>⏱️ Pomodoro:</span> {minPomodoro}:{segPomodoro} {pomodoroActivo ? '▶️' : '⏸️'}
              </button>
            </div>
          </div>

          {/* Clima */}
          {clima && (
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-3">
              <span className="text-2xl">🌦️</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">{clima.temp}°C</span>
                  <span className="text-xs text-slate-400">• {clima.descripcion}</span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span>📍</span> {clima.ubicacion}
                </p>
                <p className="text-[10px] text-amber-400 font-medium max-w-xs mt-0.5">{clima.recomendacion}</p>
              </div>
            </div>
          )}
        </header>

        {/* Frase Motivacional */}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* Card Calorías */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase text-slate-400">Balance Calórico</span>
                      <span className="text-base">⚖️</span>
                    </div>
                    <p className={`text-2xl font-extrabold ${balanceCalorico < 0 ? 'text-amber-400' : balanceCalorico === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico} <span className="text-xs font-normal text-slate-400">kcal</span>
                    </p>
                  </div>

                  {/* Card Agua */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase text-slate-400">Agua Diaria</span>
                      <span className="text-base">💧</span>
                    </div>
                    <p className="text-2xl font-extrabold text-cyan-400">
                      {(aguaMl / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ 2.5 L</span>
                    </p>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min(100, (aguaMl / metaAguaMl) * 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Card Hábitos */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase text-slate-400">Hábitos Cumplidos</span>
                      <span className="text-base">⚡</span>
                    </div>
                    <p className="text-2xl font-extrabold text-indigo-400">{porcentajeHabitos}%</p>
                    <p className="text-xs text-slate-400 mt-1">{totalCompletados} de {habitos.length} metas</p>
                  </div>

                  {/* Card Finanzas */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase text-slate-400">Gastos Hoy</span>
                      <span className="text-base">💵</span>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-400">${formatearMonto(gastosVariablesHoy)}</p>
                  </div>

                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">📌 Nota rápida del día</h3>
                  <p className="text-xs text-slate-300 italic">{notaDiaria || 'Sin notas registradas para este día.'}</p>
                </div>
              </div>
            )}

            {/* 2. FINANZAS */}
            {seccionActiva === 'finanzas' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-emerald-400 flex items-center justify-between">
                  <span>💵 Resumen Financiero</span>
                  <span className="text-sm font-mono font-bold text-slate-300">
                    Balance: <span className={balanceFinanciero < 0 ? 'text-rose-400' : 'text-emerald-400'}>${formatearMonto(balanceFinanciero)}</span>
                  </span>
                </h2>

                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-400 font-medium">Fondo Mensual Consumido:</span>
                    <span className={`font-mono font-bold ${pctGastoMensual >= 100 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {pctGastoMensual}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pctGastoMensual >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pctGastoMensual}%` }}
                    ></div>
                  </div>
                </div>

                <form onSubmit={agregarTransaccion} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Descripción (ej. Luz, Alquiler, Super)..."
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      placeholder="Monto"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="w-28 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as 'ingreso' | 'gasto')}
                      className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="gasto">Gasto 🔻</option>
                      <option value="ingreso">Ingreso 🟢</option>
                    </select>

                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {(tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                </form>

                {/* Lista de Transacciones */}
                <div className="space-y-2 mt-4">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Historial de Transacciones</h3>
                  {transacciones.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No hay transacciones registradas.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {transacciones.map((t) => (
                        <div key={t.id} className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{t.tipo === 'ingreso' ? '🟢' : '🔻'}</span>
                            <div>
                              <p className="font-semibold text-slate-200">{t.descripcion}</p>
                              <p className="text-[10px] text-slate-400">{t.categoria}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold text-sm ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}${formatearMonto(t.monto)}
                            </span>
                            <button
                              onClick={() => eliminarTransaccion(t.id)}
                              className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 3. HÁBITOS */}
            {seccionActiva === 'habitos' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-indigo-400">⚡ Hábitos Diarios</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                    {totalCompletados}/{habitos.length} Completados ({porcentajeHabitos}%)
                  </span>
                </div>

                <form onSubmit={agregarHabito} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nuevo hábito..."
                    value={nuevoHabito}
                    onChange={(e) => setNuevoHabito(e.target.value)}
                    className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="time"
                    value={horaObjetivo}
                    onChange={(e) => setHoraObjetivo(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
                  >
                    ➕ Añadir
                  </button>
                </form>

                <div className="space-y-2">
                  {habitos.map((h) => {
                    const reg = registrosHoy[h.id];
                    const completado = !!reg?.completado;
                    const racha = rachasHabitos[h.id] || 0;
                    return (
                      <div
                        key={h.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                          completado ? 'bg-indigo-950/40 border-indigo-800/60 text-slate-300' : 'bg-slate-900/70 border-slate-800 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => alternarHabito(h.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                              completado ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 hover:border-indigo-400'
                            }`}
                          >
                            {completado && '✓'}
                          </button>
                          <div>
                            <p className={`text-sm font-medium ${completado ? 'line-through text-slate-400' : ''}`}>
                              {h.texto}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Objetivo: {h.hora_objetivo} hs
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Contador de Racha */}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center gap-1">
                            🔥 {racha} {racha === 1 ? 'día' : 'días'}
                          </span>
                          <button onClick={() => eliminarHabito(h.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. NUTRICIÓN */}
            {seccionActiva === 'nutricion' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-amber-400">🔥 Nutrición y Balance Calórico</h2>

                {/* Metabolismo Base */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Metabolismo Basal (BMR)</p>
                    <p className="text-[10px] text-slate-500">Gasto calórico en reposo absoluto</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={baseMetabolismo}
                      onChange={(e) => setBaseMetabolismo(Number(e.target.value))}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500 text-right"
                    />
                    <span className="text-xs text-slate-400">kcal</span>
                  </div>
                </div>

                {/* Ejercicios */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🏃 Ejercicios (+Gasto)</h3>
                    <button onClick={agregarEjercicio} className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer">
                      + Agregar Ejercicio
                    </button>
                  </div>
                  {ejercicios.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => actualizarEjercicio(item.id, 'nombre', e.target.value)}
                        className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="number"
                        value={item.calorias}
                        onChange={(e) => actualizarEjercicio(item.id, 'calorias', Number(e.target.value))}
                        className="w-24 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-400">kcal</span>
                      <button onClick={() => eliminarEjercicio(item.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {/* Comidas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">🥗 Comidas del día (+Ingesta)</h3>
                    <button onClick={agregarComida} className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer">
                      + Agregar Comida
                    </button>
                  </div>
                  {comidas.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)}
                        className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="number"
                        value={item.calorias}
                        onChange={(e) => actualizarComida(item.id, 'calorias', Number(e.target.value))}
                        className="w-24 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-400">kcal</span>
                      <button onClick={() => eliminarComida(item.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {/* Diagnóstico */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                  <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                    {diagnosticoCalorico}
                  </p>
                </div>

                <button
                  onClick={guardarCalorias}
                  disabled={guardandoCalorias}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {guardandoCalorias ? 'Guardando...' : '💾 Guardar Registro Calórico'}
                </button>
              </section>
            )}

            {/* 5. SECCIÓN EXTRA (Nuevos Módulos Integrados) */}
            {seccionActiva === 'extra' && (
              <div className="space-y-6">
                {/* Submenú Navegación Extras */}
                <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                  {[
                    { id: 'agua', label: '💧 Hidratación', color: 'cyan' },
                    { id: 'sueno', label: '😴 Sueño y Descanso', color: 'indigo' },
                    { id: 'peso', label: '⚖️ Peso y Medidas', color: 'emerald' },
                    { id: 'metas', label: '🎯 Metas Mensuales', color: 'amber' },
                    { id: 'pomodoro', label: '⏱️ Pomodoro', color: 'rose' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubSeccionExtra(sub.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        subSeccionExtra === sub.id
                          ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                          : 'text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* SUB 1: HIDRATACIÓN */}
                {subSeccionExtra === 'agua' && (
                  <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-cyan-400 flex items-center justify-between">
                      <span>💧 Control de Hidratación</span>
                      <span className="text-sm font-mono font-bold text-slate-300">
                        {aguaMl} / {metaAguaMl} ml ({Math.round((aguaMl / metaAguaMl) * 100)}%)
                      </span>
                    </h3>

                    <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (aguaMl / metaAguaMl) * 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => modificarAgua(250)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        ➕ 🥤 +250 ml (Vaso)
                      </button>
                      <button
                        onClick={() => modificarAgua(500)}
                        className="bg-cyan-700 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        ➕ 🍾 +500 ml (Botella)
                      </button>
                      <button
                        onClick={() => modificarAgua(-250)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer"
                      >
                        ➖ 250 ml
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB 2: SUEÑO Y DESCANSO */}
                {subSeccionExtra === 'sueno' && (
                  <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-indigo-400">😴 Registro de Sueño y Descanso</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de acostarse</label>
                        <input
                          type="time"
                          value={suenoHoy.hora_acostarse}
                          onChange={(e) => setSuenoHoy({ ...suenoHoy, hora_acostarse: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Hora de levantarse</label>
                        <input
                          type="time"
                          value={suenoHoy.hora_levantarse}
                          onChange={(e) => setSuenoHoy({ ...suenoHoy, hora_levantarse: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Calidad del Sueño (1-5 ⭐)</label>
                        <select
                          value={suenoHoy.calidad}
                          onChange={(e) => setSuenoHoy({ ...suenoHoy, calidad: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white cursor-pointer"
                        >
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

                    <button
                      onClick={guardarSueno}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition cursor-pointer"
                    >
                      💾 Guardar Sueño
                    </button>
                  </div>
                )}

                {/* SUB 3: PESO Y MEDIDAS */}
                {subSeccionExtra === 'peso' && (
                  <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-emerald-400">⚖️ Registro de Peso Corporal</h3>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Tu peso en kg (ej. 75.5)..."
                        value={nuevoPeso}
                        onChange={(e) => setNuevoPeso(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={guardarPeso}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
                      >
                        💾 Anotar Peso
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-slate-400">Últimos Registros:</h4>
                      {historialPeso.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Sin registros de peso guardados.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {historialPeso.map((p) => (
                            <div key={p.fecha} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between text-xs">
                              <span className="text-slate-300 font-medium">📅 {p.fecha}</span>
                              <span className="font-mono font-bold text-emerald-400 text-sm">{p.peso} kg</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB 4: METAS Y OKRs */}
                {subSeccionExtra === 'metas' && (
                  <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
                    <h3 className="text-lg font-semibold text-amber-400">🎯 Metas y Objetivos del Mes (OKRs)</h3>

                    <form onSubmit={agregarMeta} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Objetivo principal del mes..."
                        value={nuevaMetaTitulo}
                        onChange={(e) => setNuevaMetaTitulo(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="number"
                        placeholder="Meta %"
                        value={nuevaMetaObjetivo}
                        onChange={(e) => setNuevaMetaObjetivo(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
                      >
                        ➕ Crear
                      </button>
                    </form>

                    <div className="space-y-3">
                      {metas.map((m) => {
                        const pct = Math.min(100, Math.round((m.progreso_actual / m.progreso_objetivo) * 100));
                        return (
                          <div key={m.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-200">{m.titulo}</span>
                              <span className="font-mono text-amber-400 font-bold">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-[10px] text-slate-500">Ajustar avance:</span>
                              <input
                                type="range"
                                min={0}
                                max={m.progreso_objetivo}
                                value={m.progreso_actual}
                                onChange={(e) => actualizarProgresoMeta(m.id, Number(e.target.value))}
                                className="w-1/2 accent-amber-500 cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUB 5: POMODORO */}
                {subSeccionExtra === 'pomodoro' && (
                  <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl text-center space-y-6">
                    <h3 className="text-lg font-semibold text-rose-400">⏱️ Temporizador Pomodoro de Enfoque</h3>

                    <div className="py-6">
                      <span className="text-6xl font-mono font-extrabold text-slate-100 tracking-wider">
                        {minPomodoro}:{segPomodoro}
                      </span>
                      <p className="text-xs uppercase tracking-widest text-slate-400 mt-2">
                        Modo actual: <b className="text-rose-400">{pomodoroModo === 'trabajo' ? '💻 Enfoque Trabajo (25m)' : '☕ Descanso (5m)'}</b>
                      </p>
                    </div>

                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setPomodoroActivo(!pomodoroActivo)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
                          pomodoroActivo ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        {pomodoroActivo ? '⏸️ Pausar' : '▶️ Iniciar'}
                      </button>
                      <button
                        onClick={() => { setPomodoroActivo(false); setPomodoroSegundos(pomodoroModo === 'trabajo' ? 25 * 60 : 5 * 60); }}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
                      >
                        🔄 Reiniciar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. NOTAS */}
            {seccionActiva === 'notas' && (
              <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
                <h2 className="text-xl font-semibold text-indigo-400">📝 Notas del Día</h2>
                <textarea
                  value={notaDiaria}
                  onChange={(e) => setNotaDiaria(e.target.value)}
                  placeholder="Escribe tus reflexiones, recordatorios o pendientes para hoy..."
                  rows={8}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                />
                <button
                  onClick={guardarNota}
                  disabled={guardandoNota}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
                >
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