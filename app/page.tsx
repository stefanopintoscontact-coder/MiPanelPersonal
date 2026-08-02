'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// FECHA Y HORA FIJA DE LA ÚLTIMA ACTUALIZACIÓN
const ULTIMA_ACTUALIZACION_APP = '2/8/2026';

// TRADUCCIONES Y SISTEMA MULTI-IDIOMA
type Idioma = 'es' | 'en' | 'pt';

const TEXTOS = {
  es: {
    menu: 'Menú',
    general: 'Resumen General',
    perfil: 'Mi Perfil y Objetivos',
    habitos: 'Hábitos Diarios',
    nutricion: 'Nutrición y Entrenamiento',
    extra: 'Extra',
    alertas: 'Alertas',
    actualizaciones: 'Novedades y Soporte',
    modoOscuro: 'Modo Oscuro',
    modoClaro: 'Modo Claro',
    idioma: 'Idioma',
    tema: 'Tema',
    cambiar: 'Cambiar',
    cerrarSesion: 'Cerrar Sesión',
    totalQuemadasHoy: 'Total calorías quemadas hoy:',
    totalIngeridasHoy: 'Total Calorías Ingeridas Hoy:',
    verReferencias: 'Toca aquí para ver las referencias de los colores e indicadores',
    ocultarReferencias: 'Ocultar referencias',
    tituloReferencias: 'Referencias de Indicadores',
    errorAuth: 'Correo y/o contraseña incorrectas',
    cerrar: 'Cerrar',
    datosPersonales: 'Datos Personales',
    miObjetivo: 'Mi Objetivo',
    nombre: 'Nombre',
    fechaNacimiento: 'Fecha Nacimiento',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    guardarPerfil: '💾 Guardar Perfil',
    comidasDelDia: '🥗 Comidas del Día',
    agregarComida: '+ Agregar Comida',
    actividadesRegistradas: '🏋️ Actividades Registradas',
    agregarEjercicio: '+ Agregar Ejercicio',
    gastoBase: 'Gasto Calórico Base (TMB / BMR)',
    gastoBaseDesc: 'Gasto metabólico diario estimado de tu cuerpo',
    balanceCalorico: 'Balance Calórico',
    aguaDiaria: 'Agua Diaria',
    sueno: 'Sueño',
    completado: 'completado',
    listos: 'listos',
    meta: 'meta',
    de: 'de',
    hrs: 'hrs',
    diasAbrev: 'd',
    objetivoPrincipal: 'Objetivo Principal',
    kilosObjetivo: 'Kilos Objetivo',
    plazoMeses: 'Plazo (Meses)',
    probabilidadCumplirse: 'Probabilidad de cumplirse:',
    bajarPeso: '🔥 Bajar de peso',
    mantenerPeso: '⚖️ Mantener peso',
    subirPeso: '💪 Subir de peso',
    muyProbable: 'Muy probable y saludable',
    pocoProbable: 'Poco probable / Poco saludable',
    exigente: 'Exigente, requiere alta disciplina',
    anadir: 'Añadir',
    habitoPlaceholder: 'Ej: Meditar 10 min, Leer 20 págs...',
    habitoDiario: 'Hábito Diario',
    eliminarHabitoConfirm: '¿Eliminar hábito?',
    tipoActividad: 'Tipo de Actividad',
    seleccionarTipo: 'Seleccionar tipo...',
    fuerza: '🏋️ Fuerza / Gimnasio',
    running: '🏃 Running / Carrera',
    ciclismo: '🚴 Ciclismo',
    boxeo: '🥊 Boxeo',
    futbol: '⚽ Fútbol',
    natacion: '🏊 Natación',
    caminata: '🚶 Caminata',
    funcional: '🤸 Funcional / HIIT',
    otro: '⚡ Otro',
    hidratacion: 'Hidratación',
    descanso: 'Descanso',
    progreso: 'Progreso',
    acostarse: 'Acostarse',
    levantarse: 'Levantarse',
    guardarSueno: '💾 Guardar Sueño',
    suenoGuardado: '✅ Sueño guardado',
    perfilGuardado: '✅ Perfil guardado correctamente',
    errorGuardarPerfil: '❌ Error al guardar perfil: ',
    novedades: 'Novedades',
    soporte: 'Soporte',
    versionApp: 'Versión de la app',
    tipoMensajePlaceholder: '-- Tipo de mensaje --',
    sugerencia: '💡 Sugerencia',
    duda: '❓ Duda',
    reporteError: '⚠️ Reporte de error',
    escribeMensaje: 'Escribe tu mensaje...',
    enviarComentario: '✉️ Enviar Comentario',
    alertaSoporte: '⚠️ Completa el formulario',
    refRojoTitulo: 'Rojo y Vacío (0%):',
    refRojoDesc: 'Estás lejos de tu objetivo o en dirección opuesta (ej. estar en déficit calórico cuando buscas subir de peso, o no haber registrado agua/hábitos).',
    refAmarilloTitulo: 'Amarillo a la Mitad (50%):',
    refAmarilloDesc: 'Progreso intermedio o superávit/déficit leve. Vas por buen camino pero aún te falta para la meta óptima del día.',
    refVerdeTitulo: 'Verde Lleno (100%):',
    refVerdeDesc: '¡Meta diaria alcanzada con éxito! Has conseguido el rango ideal para tu balance calórico, hidratación o rutina.',
    msgDeficitLejos: 'Déficit (Lejos del objetivo)',
    msgSuperavitBajo: 'Superávit bajo',
    msgSuperavitOptimo: '¡Superávit óptimo!',
    msgExcesoCalorico: 'Exceso calórico',
    msgDeficitLeve: 'Déficit leve',
    msgDeficitLogrado: '¡Déficit logrado!',
    msgBalancePerfecto: 'Balance perfecto',
    msgDesviacionModerada: 'Desviación moderada',
    msgDesviacionAlta: 'Desviación alta',
    msgAtencion: 'Atención requerida',
    subSeccionNutricion: '🥗 Nutrición',
    subSeccionEntrenamiento: '🏋️ Actividad Física',
    nuevaComida: 'Nueva Comida',
    novedadesItem1: '• Formato automático de fecha de nacimiento (DD/MM/AAAA) integrado.',
    novedadesItem2: '• Modo Claro mejorado con visibilidad optimizada en toda la interfaz.',
    novedadesItem3: '• Traducción completa multilenguaje (Español, Inglés y Portugués).',
    novedadesItem4: '• Nueva pestaña de Alertas para recordatorios inteligentes de comidas, agua, entrenamientos y hábitos.',
    configAlertas: 'Configuración de Alertas',
    activarNotificaciones: '🔔 Activar Notificaciones Navegador',
    alertaLevantarse: '⏰ Hora de Levantarse (+5m recordatorio de registro)',
    alertaEntrenar: '🏋️ Hora de Entrenar (+5m recordatorio de completar números)',
    alertaAgua: '💧 Recordatorio de Agua (cada cuántas horas)',
    alertaDesayuno: '🍳 Horario Desayuno',
    alertaAlmuerzo: '🥗 Horario Almuerzo',
    alertaMerienda: '🍎 Horario Merienda',
    alertaCena: '🍗 Horario Cena',
    guardarAlertas: '💾 Guardar Configuración de Alertas',
  },
  en: {
    menu: 'Menu',
    general: 'General Summary',
    perfil: 'My Profile & Goals',
    habitos: 'Daily Habits',
    nutricion: 'Nutrition & Training',
    extra: 'Extra',
    alertas: 'Alerts',
    actualizaciones: 'Updates & Support',
    modoOscuro: 'Dark Mode',
    modoClaro: 'Light Mode',
    idioma: 'Language',
    tema: 'Theme',
    cambiar: 'Change',
    cerrarSesion: 'Log Out',
    totalQuemadasHoy: 'Total calories burned today:',
    totalIngeridasHoy: 'Total Calories Consumed Today:',
    verReferencias: 'Tap here to view color and indicator references',
    ocultarReferencias: 'Hide references',
    tituloReferencias: 'Indicator References',
    errorAuth: 'Incorrect email and/or password',
    cerrar: 'Close',
    datosPersonales: 'Personal Data',
    miObjetivo: 'My Goal',
    nombre: 'Name',
    fechaNacimiento: 'Date of Birth',
    peso: 'Weight (kg)',
    altura: 'Height (cm)',
    guardarPerfil: '💾 Save Profile',
    comidasDelDia: '🥗 Daily Meals',
    agregarComida: '+ Add Meal',
    actividadesRegistradas: '🏋️ Registered Activities',
    agregarEjercicio: '+ Add Exercise',
    gastoBase: 'Base Metabolic Rate (BMR)',
    gastoBaseDesc: 'Estimated daily metabolic expenditure of your body',
    balanceCalorico: 'Caloric Balance',
    aguaDiaria: 'Daily Water',
    sueno: 'Sleep',
    completado: 'completed',
    listos: 'ready',
    meta: 'target',
    de: 'of',
    hrs: 'hrs',
    diasAbrev: 'd',
    objetivoPrincipal: 'Main Goal',
    kilosObjetivo: 'Target Weight (kg)',
    plazoMeses: 'Timeframe (Months)',
    probabilidadCumplirse: 'Probability of success:',
    bajarPeso: '🔥 Lose weight',
    mantenerPeso: '⚖️ Maintain weight',
    subirPeso: '💪 Gain weight',
    muyProbable: 'Very likely and healthy',
    pocoProbable: 'Unlikely / Unhealthy',
    exigente: 'Challenging, requires high discipline',
    anadir: 'Add',
    habitoPlaceholder: 'e.g., Meditate 10 min, Read 20 pages...',
    habitoDiario: 'Daily Habit',
    eliminarHabitoConfirm: 'Delete habit?',
    tipoActividad: 'Activity Type',
    seleccionarTipo: 'Select type...',
    fuerza: '🏋️ Strength / Gym',
    running: '🏃 Running / Jogging',
    ciclismo: '🚴 Cycling',
    boxeo: '🥊 Boxing',
    futbol: '⚽ Soccer / Football',
    natacion: '🏊 Swimming',
    caminata: '🚶 Walking',
    funcional: '🤸 Functional / HIIT',
    otro: '⚡ Other',
    hidratacion: 'Hydration',
    descanso: 'Rest',
    progreso: 'Progress',
    acostarse: 'Bedtime',
    levantarse: 'Wake up',
    guardarSueno: '💾 Save Sleep',
    suenoGuardado: '✅ Sleep saved',
    perfilGuardado: '✅ Profile saved successfully',
    errorGuardarPerfil: '❌ Error saving profile: ',
    novedades: 'What\'s New',
    soporte: 'Support',
    versionApp: 'App version',
    tipoMensajePlaceholder: '-- Message type --',
    sugerencia: '💡 Suggestion',
    duda: '❓ Question',
    reporteError: '⚠️ Bug report',
    escribeMensaje: 'Type your message...',
    enviarComentario: '✉️ Send Feedback',
    alertaSoporte: '⚠️ Please complete the form',
    refRojoTitulo: 'Red & Empty (0%):',
    refRojoDesc: 'You are far from your goal or moving in the opposite direction (e.g., calorie deficit when trying to gain weight).',
    refAmarilloTitulo: 'Yellow at Half (50%):',
    refAmarilloDesc: 'Intermediate progress or slight surplus/deficit. You\'re on track but short of today\'s optimal target.',
    refVerdeTitulo: 'Full Green (100%):',
    refVerdeDesc: 'Daily goal successfully reached! You achieved the ideal range for calories, hydration, or routine.',
    msgDeficitLejos: 'Deficit (Far from target)',
    msgSuperavitBajo: 'Low surplus',
    msgSuperavitOptimo: 'Optimal surplus!',
    msgExcesoCalorico: 'Calorie excess',
    msgDeficitLeve: 'Slight deficit',
    msgDeficitLogrado: 'Deficit achieved!',
    msgBalancePerfecto: 'Perfect balance',
    msgDesviacionModerada: 'Moderate deviation',
    msgDesviacionAlta: 'High deviation',
    msgAtencion: 'Attention required',
    subSeccionNutricion: '🥗 Nutrition',
    subSeccionEntrenamiento: '🏋️ Physical Activity',
    nuevaComida: 'New Meal',
    novedadesItem1: '• Integrated automatic birth date formatting (DD/MM/YYYY).',
    novedadesItem2: '• Improved Light Mode with optimized visibility across all screens.',
    novedadesItem3: '• Full multilingual support (Spanish, English, and Portuguese).',
    novedadesItem4: '• New Alerts tab with smart reminders for meals, water, workouts, and habits.',
    configAlertas: 'Alerts Configuration',
    activarNotificaciones: '🔔 Enable Browser Notifications',
    alertaLevantarse: '⏰ Wake-up Time (+5m log reminder)',
    alertaEntrenar: '🏋️ Workout Time (+5m log metrics reminder)',
    alertaAgua: '💧 Water Reminder Interval (hours)',
    alertaDesayuno: '🍳 Breakfast Time',
    alertaAlmuerzo: '🥗 Lunch Time',
    alertaMerienda: '🍎 Snack Time',
    alertaCena: '🍗 Dinner Time',
    guardarAlertas: '💾 Save Alert Settings',
  },
  pt: {
    menu: 'Menu',
    general: 'Resumo Geral',
    perfil: 'Meu Perfil e Objetivos',
    habitos: 'Hábitos Diários',
    nutricion: 'Nutrição e Treino',
    extra: 'Extra',
    alertas: 'Alertas',
    actualizaciones: 'Novidades e Suporte',
    modoOscuro: 'Modo Escuro',
    modoClaro: 'Modo Claro',
    idioma: 'Idioma',
    tema: 'Tema',
    cambiar: 'Alterar',
    cerrarSesion: 'Sair',
    totalQuemadasHoy: 'Total de calorias queimadas hoje:',
    totalIngeridasHoy: 'Total de Calorias Ingeridas Hoje:',
    verReferencias: 'Toque aqui para ver as referências de cores e indicadores',
    ocultarReferencias: 'Ocultar referências',
    tituloReferencias: 'Referências dos Indicadores',
    errorAuth: 'E-mail e/ou senha incorretos',
    cerrar: 'Fechar',
    datosPersonales: 'Dados Pessoais',
    miObjetivo: 'Meu Objetivo',
    nombre: 'Nome',
    fechaNacimiento: 'Data de Nascimento',
    peso: 'Peso (kg)',
    altura: 'Altura (cm)',
    guardarPerfil: '💾 Salvar Perfil',
    comidasDelDia: '🥗 Refeições do Dia',
    agregarComida: '+ Adicionar Refeição',
    actividadesRegistradas: '🏋️ Atividades Registradas',
    agregarEjercicio: '+ Adicionar Exercício',
    gastoBase: 'Gasto Calórico Base (TMB / BMR)',
    gastoBaseDesc: 'Gasto metabólico diário estimado do seu corpo',
    balanceCalorico: 'Balanço Calórico',
    aguaDiaria: 'Água Diária',
    sueno: 'Sono',
    completado: 'concluído',
    listos: 'prontos',
    meta: 'meta',
    de: 'de',
    hrs: 'hrs',
    diasAbrev: 'd',
    objetivoPrincipal: 'Objetivo Principal',
    kilosObjetivo: 'Quilos Meta',
    plazoMeses: 'Prazo (Meses)',
    probabilidadCumplirse: 'Probabilidade de sucesso:',
    bajarPeso: '🔥 Perder peso',
    mantenerPeso: '⚖️ Manter peso',
    subirPeso: '💪 Ganhar peso',
    muyProbable: 'Muito provável e saudável',
    pocoProbable: 'Pouco provável / Pouco saudável',
    exigente: 'Exigente, requer alta disciplina',
    anadir: 'Adicionar',
    habitoPlaceholder: 'Ex: Meditar 10 min, Ler 20 pág...',
    habitoDiario: 'Hábito Diário',
    eliminarHabitoConfirm: 'Excluir hábito?',
    tipoActividad: 'Tipo de Atividade',
    seleccionarTipo: 'Selecionar tipo...',
    fuerza: '🏋️ Força / Academia',
    running: '🏃 Corrida',
    ciclismo: '🚴 Ciclismo',
    boxeo: '🥊 Boxe',
    futbol: '⚽ Futebol',
    natacion: '🏊 Natação',
    caminata: '🚶 Caminhada',
    funcional: '🤸 Funcional / HIIT',
    otro: '⚡ Outro',
    hidratacion: 'Hidratação',
    descanso: 'Descanso',
    progreso: 'Progresso',
    acostarse: 'Deitar',
    levantarse: 'Levantar',
    guardarSueno: '💾 Salvar Sono',
    suenoGuardado: '✅ Sono salvo',
    perfilGuardado: '✅ Perfil salvo com sucesso',
    errorGuardarPerfil: '❌ Erro ao salvar perfil: ',
    novedades: 'Novidades',
    soporte: 'Suporte',
    versionApp: 'Versão do app',
    tipoMensajePlaceholder: '-- Tipo de mensagem --',
    sugerencia: '💡 Sugestão',
    duda: '❓ Dúvida',
    reporteError: '⚠️ Relatório de erro',
    escribeMensaje: 'Escreva sua mensagem...',
    enviarComentario: '✉️ Enviar Comentário',
    alertaSoporte: '⚠️ Preencha o formulário',
    refRojoTitulo: 'Vermelho e Vazio (0%):',
    refRojoDesc: 'Você está longe do seu objetivo ou na direção oposta (ex: déficit calórico ao tentar ganhar peso).',
    refAmarilloTitulo: 'Amarelo na Metade (50%):',
    refAmarilloDesc: 'Progreso intermediário ou leve superávit/déficit. Você está no caminho certo, mas ainda falta para a meta.',
    refVerdeTitulo: 'Verde Cheio (100%):',
    refVerdeDesc: 'Meta diária atingida com sucesso! Você alcançou a faixa ideal para calorias, hidratação ou rotina.',
    msgDeficitLejos: 'Déficit (Longe do objetivo)',
    msgSuperavitBajo: 'Superávit baixo',
    msgSuperavitOptimo: 'Superávit ótimo!',
    msgExcesoCalorico: 'Excesso calórico',
    msgDeficitLeve: 'Déficit leve',
    msgDeficitLogrado: 'Déficit alcançado!',
    msgBalancePerfecto: 'Balanço perfeito',
    msgDesviacionModerada: 'Desvio moderado',
    msgDesviacionAlta: 'Desvio alto',
    msgAtencion: 'Atenção necessária',
    subSeccionNutricion: '🥗 Nutrição',
    subSeccionEntrenamiento: '🏋️ Atividade Física',
    nuevaComida: 'Nova Refeição',
    novedadesItem1: '• Formatação automática de data de nascimento (DD/MM/AAAA) integrada.',
    novedadesItem2: '• Modo Claro aprimorado com visibilidade otimizada em todas as telas.',
    novedadesItem3: '• Tradução completa multilíngue (Espanhol, Inglês e Português).',
    novedadesItem4: '• Nova aba de Alertas com lembretes inteligentes para refeições, água, treinos e hábitos.',
    configAlertas: 'Configuração de Alertas',
    activarNotificaciones: '🔔 Ativar Notificações do Navegador',
    alertaLevantarse: '⏰ Hora de Acordar (+5m lembrete de registro)',
    alertaEntrenar: '🏋️ Hora de Treinar (+5m lembrete de registrar números)',
    alertaAgua: '💧 Lembrete de Água (intervalo em horas)',
    alertaDesayuno: '🍳 Horário Café da Manhã',
    alertaAlmuerzo: '🥗 Horário Almoço',
    alertaMerienda: '🍎 Horário Lanche',
    alertaCena: '🍗 Horário Jantar',
    guardarAlertas: '💾 Salvar Configuração de Alertas',
  }
};

// LISTA DE SECCIONES
const SECCIONES = [
  { id: 'general', icon: '📊' },
  { id: 'perfil', icon: '👤' },
  { id: 'habitos', icon: '⚡' },
  { id: 'nutricion', icon: '🔥' },
  { id: 'extra', icon: '✨' },
  { id: 'alertas', icon: '🔔' },
  { id: 'actualizaciones', icon: '🚀' },
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

interface ConfigAlertas {
  horaLevantarse: string;
  horaEntrenar: string;
  horaDesayuno: string;
  horaAlmuerzo: string;
  horaMerienda: string;
  horaCena: string;
  intervaloAguaHoras: number;
  notificacionesPermitidas: boolean;
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

const calcularEdad = (fechaStr: string): number => {
  if (!fechaStr) return 25;
  let fecha: Date;
  if (fechaStr.includes('/')) {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      fecha = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    } else {
      fecha = new Date(fechaStr);
    }
  } else {
    fecha = new Date(fechaStr);
  }
  if (isNaN(fecha.getTime())) return 25;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
    edad--;
  }
  return edad > 0 ? edad : 25;
};

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
  // SPLASH SCREEN LOGO INICIAL
  const [mostrarSplash, setMostrarSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // CONFIGURACIÓN DE TEMA E IDIOMA
  const [modoOscuro, setModoOscuro] = useState(true);
  const [idioma, setIdioma] = useState<Idioma>('es');
  const T = TEXTOS[idioma];

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

  // NAVEGACIÓN Y CONTROL DE CARGA DE DATOS
  const [datosCargados, setDatosCargados] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<'general' | 'perfil' | 'habitos' | 'nutricion' | 'extra' | 'alertas' | 'actualizaciones'>('general');
  const [subSeccionPerfil, setSubSeccionPerfil] = useState<'perfil' | 'objetivo'>('perfil');
  const [subSeccionNutricion, setSubSeccionNutricion] = useState<'nutricion' | 'entrenamiento'>('nutricion');
  const [subSeccionExtra, setSubSeccionExtra] = useState<'agua' | 'sueno'>('agua');
  const [subSeccionActualizaciones, setSubSeccionActualizaciones] = useState<'novedades' | 'soporte'>('novedades');
  const [mostrarReferencias, setMostrarReferencias] = useState(false);

  // ALERTAS Y NOTIFICACIONES
  const [configAlertas, setConfigAlertas] = useState<ConfigAlertas>({
    horaLevantarse: '07:00',
    horaEntrenar: '18:00',
    horaDesayuno: '08:00',
    horaAlmuerzo: '13:00',
    horaMerienda: '17:00',
    horaCena: '21:00',
    intervaloAguaHoras: 1,
    notificacionesPermitidas: false,
  });

  // SOPORTE
  const [tipoSoporte, setTipoSoporte] = useState('');
  const [mensajeSoporte, setMensajeSoporte] = useState('');

  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [fechaSeleccionada] = useState<string>(obtenerFechaLogica());

  // PERFIL
  const [perfil, setPerfil] = useState<PerfilUsuario>({
    nombre: '',
    fecha_nacimiento: '01/01/2000',
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

  // ESTILOS DINÁMICOS
  const bgApp = modoOscuro ? "bg-[#0b0f17] text-slate-100" : "bg-slate-100 text-slate-900";
  const bgCard = modoOscuro ? "bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 shadow-2xl transition-all duration-300" : "bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-5 shadow-xl text-slate-800 transition-all duration-300";
  const bgInnerCard = modoOscuro ? "bg-slate-950/80 border-slate-800/80 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900 shadow-sm";
  const bgInnerCardSubtle = modoOscuro ? "bg-slate-950/60 border-slate-800/80 text-slate-100" : "bg-slate-100/80 border-slate-200 text-slate-900 shadow-sm";
  const bgTrack = modoOscuro ? "bg-slate-950 border-slate-800/80" : "bg-slate-200 border-slate-300";
  const textMuted = modoOscuro ? "text-slate-400" : "text-slate-500";
  const timeInputStyle = modoOscuro ? "bg-slate-900 border-slate-800 text-indigo-300 [color-scheme:dark]" : "bg-white border-slate-300 text-indigo-600 [color-scheme:light]";

  const bgInput = modoOscuro 
    ? "w-full min-w-0 box-border bg-slate-950/80 border border-slate-800/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 transition-all duration-200 placeholder:text-slate-600 outline-none hover:border-slate-700 font-medium [color-scheme:dark]" 
    : "w-full min-w-0 box-border bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 transition-all duration-200 placeholder:text-slate-400 outline-none hover:border-slate-400 font-medium [color-scheme:light]";
  
  const btnPrimary = "w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2";

  const manejarFechaNacimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);

    let formatted = val;
    if (val.length > 2 && val.length <= 4) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    } else if (val.length > 4) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    }

    setPerfil(prev => ({ ...prev, fecha_nacimiento: formatted }));
  };

  const ordenarHabitosPorHora = (lista: Habito[]): Habito[] => {
    return [...lista].sort((a, b) => (a.hora_objetivo || '00:00').localeCompare(b.hora_objetivo || '00:00'));
  };

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

  const solicitarPermisosNotificacion = async () => {
    if ('Notification' in window) {
      const permiso = await Notification.requestPermission();
      if (permiso === 'granted') {
        setConfigAlertas(prev => ({ ...prev, notificacionesPermitidas: true }));
        new Notification('FitCero Alertas', { body: '¡Notificaciones activadas con éxito!' });
      } else {
        alert('Permiso de notificaciones denegado en el navegador.');
      }
    } else {
      alert('Tu navegador no soporta notificaciones web.');
    }
  };

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
      setErrorAuth(T.errorAuth);
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
    setDatosCargados(false);

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

    setDatosCargados(true);
  };

  const bmrCalculado = useMemo(() => {
    if (!perfil.peso || !perfil.altura) return 1500;
    const edad = calcularEdad(perfil.fecha_nacimiento);
    let bmr = (10 * perfil.peso) + (6.25 * perfil.altura) - (5 * edad);
    return Math.round(perfil.sexo === 'masculino' ? bmr + 5 : bmr - 161);
  }, [perfil]);

  const guardarCaloriasDB = async (nuevosEjercicios = ejercicios, nuevasComidas = comidas, nuevaAgua = aguaMl) => {
    if (!session?.user || !datosCargados) return;
    await supabase.from('registro_calorias').upsert({
      user_id: session.user.id,
      fecha: fechaSeleccionada,
      base: bmrCalculado,
      agua_ml: nuevaAgua,
      ejercicios: nuevosEjercicios,
      comidas: nuevasComidas
    }, { onConflict: 'user_id,fecha' });
  };

  useEffect(() => {
    if (!session?.user || !datosCargados) return;
    const timer = setTimeout(() => guardarCaloriasDB(), 600);
    return () => clearTimeout(timer);
  }, [comidas, ejercicios, aguaMl, fechaSeleccionada, session, datosCargados]);

  useEffect(() => {
    if (!session?.user || !datosCargados) return;
    const timer = setTimeout(() => {
      supabase.from('perfil_usuario').upsert({ user_id: session.user.id, ...perfil }, { onConflict: 'user_id' });
    }, 1000);
    return () => clearTimeout(timer);
  }, [perfil, session, datosCargados]);

  useEffect(() => {
    if (!session?.user || !datosCargados) return;
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
  }, [suenoHoy, fechaSeleccionada, session, datosCargados]);

  const guardarPerfil = async () => {
    if (!session?.user) return;
    setGuardandoPerfil(true);
    try {
      const { error } = await supabase.from('perfil_usuario').upsert({ user_id: session.user.id, ...perfil }, { onConflict: 'user_id' });
      if (error) throw error;
      alert(T.perfilGuardado);
    } catch (err: any) {
      alert(T.errorGuardarPerfil + err.message);
    } finally {
      setGuardandoPerfil(false);
    }
  };

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
    if (!session?.user || !window.confirm(T.eliminarHabitoConfirm)) return;
    const { error } = await supabase.from('habitos').delete().eq('user_id', session.user.id).eq('id', id);
    if (!error) setHabitos(habitos.filter(h => h.id !== id));
  };

  const agregarComida = () => {
    const nuevas = [...comidas, { id: Date.now().toString(), nombre: T.nuevaComida, calorias: 0 }];
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
    if (!error) { setSuenoHoy(datos); alert(T.suenoGuardado); }
  };

  const enviarSoporte = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoSoporte || !mensajeSoporte.trim()) return alert(T.alertaSoporte);
    window.location.href = `mailto:stefanopintos.contact@gmail.com?subject=${encodeURIComponent(`[FitCero] ${tipoSoporte}`)}&body=${encodeURIComponent(mensajeSoporte)}`;
    setMensajeSoporte('');
  };

  // CÁLCULOS GENERALES
  const totalCompletados = habitos.filter(h => registrosHoy[h.id]?.completado).length;
  const porcentajeHabitos = habitos.length > 0 ? Math.round((totalCompletados / habitos.length) * 100) : 0;
  const totalGastoEjercicios = ejercicios.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const totalIngresoCalorias = comidas.reduce((acc, item) => acc + Number(item.calorias || 0), 0);
  const balanceCalorico = totalIngresoCalorias - (bmrCalculado + totalGastoEjercicios);

  const evaluarEstadoCalorias = () => {
    let pct = 0;
    let colorBarra = "bg-rose-500 shadow-rose-500/50";
    let colorTexto = "text-rose-400";
    let mensaje = T.msgAtencion;

    if (perfil.objetivo === 'subir') {
      if (balanceCalorico <= 0) {
        pct = 0;
        colorBarra = "bg-rose-500 shadow-rose-500/50";
        colorTexto = "text-rose-400";
        mensaje = T.msgDeficitLejos;
      } else if (balanceCalorico < 300) {
        pct = Math.round((balanceCalorico / 300) * 100);
        colorBarra = "bg-amber-500 shadow-amber-500/50";
        colorTexto = "text-amber-400";
        mensaje = T.msgSuperavitBajo;
      } else {
        pct = 100;
        colorBarra = "bg-emerald-500 shadow-emerald-500/50";
        colorTexto = "text-emerald-400";
        mensaje = T.msgSuperavitOptimo;
      }
    } else if (perfil.objetivo === 'bajar') {
      if (balanceCalorico > 0) {
        pct = 0;
        colorBarra = "bg-rose-500 shadow-rose-500/50";
        colorTexto = "text-rose-400";
        mensaje = T.msgExcesoCalorico;
      } else if (balanceCalorico > -200) {
        pct = 50;
        colorBarra = "bg-amber-500 shadow-amber-500/50";
        colorTexto = "text-amber-400";
        mensaje = T.msgDeficitLeve;
      } else {
        pct = 100;
        colorBarra = "bg-emerald-500 shadow-emerald-500/50";
        colorTexto = "text-emerald-400";
        mensaje = T.msgDeficitLogrado;
      }
    } else {
      const diff = Math.abs(balanceCalorico);
      if (diff < 150) {
        pct = 100;
        colorBarra = "bg-emerald-500 shadow-emerald-500/50";
        colorTexto = "text-emerald-400";
        mensaje = T.msgBalancePerfecto;
      } else if (diff < 350) {
        pct = 50;
        colorBarra = "bg-amber-500 shadow-amber-500/50";
        colorTexto = "text-amber-400";
        mensaje = T.msgDesviacionModerada;
      } else {
        pct = 0;
        colorBarra = "bg-rose-500 shadow-rose-500/50";
        colorTexto = "text-rose-400";
        mensaje = T.msgDesviacionAlta;
      }
    }
    return { pct, colorBarra, colorTexto, mensaje };
  };

  const estadoCalorico = evaluarEstadoCalorias();

  const calcularProbabilidadObjetivo = (kilos: number, meses: number, objetivo: string) => {
    if (!meses || meses <= 0 || !kilos || kilos <= 0) return 100;
    if (objetivo === 'mantener') return 100;

    const kgPorMes = kilos / meses;
    let pct = 100;

    if (objetivo === 'subir') {
      if (kgPorMes <= 1.5) pct = 95;
      else if (kgPorMes <= 2.5) pct = 75;
      else if (kgPorMes <= 4.0) pct = 40;
      else if (kgPorMes <= 6.0) pct = 20;
      else pct = 5;
    } else if (objetivo === 'bajar') {
      if (kgPorMes <= 3.0) pct = 95;
      else if (kgPorMes <= 4.5) pct = 70;
      else if (kgPorMes <= 6.0) pct = 40;
      else if (kgPorMes <= 8.0) pct = 20;
      else pct = 5;
    }
    return pct;
  };

  const getDynamicColor = (porcentaje: number) => {
    if (porcentaje >= 80) return { bar: "bg-emerald-500 shadow-emerald-500/50", text: "text-emerald-400" };
    if (porcentaje >= 40) return { bar: "bg-amber-500 shadow-amber-500/50", text: "text-amber-400" };
    return { bar: "bg-rose-500 shadow-rose-500/50", text: "text-rose-400" };
  };

  const indiceSeccionActual = SECCIONES.findIndex(s => s.id === seccionActiva);

  const irSeccionAnterior = () => {
    if (indiceSeccionActual > 0) {
      setSeccionActiva(SECCIONES[indiceSeccionActual - 1].id as any);
    }
  };

  const irSeccionSiguiente = () => {
    if (indiceSeccionActual < SECCIONES.length - 1) {
      setSeccionActiva(SECCIONES[indiceSeccionActual + 1].id as any);
    }
  };

  // 1. SPLASH SCREEN (LOGO AL ABRIR LA APP)
  if (mostrarSplash) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${modoOscuro ? 'bg-[#0b0f17] text-white' : 'bg-slate-900 text-white'} transition-all duration-500 p-4 text-center`}>
        <img src="/logo.png" alt="FitCero Logo" className="w-48 h-48 sm:w-64 sm:h-64 object-contain rounded-3xl shadow-2xl mb-6 animate-pulse" />
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">FitCero</h1>
        <p className="text-sm font-medium text-slate-400 mt-2 tracking-wide">Tu cambio, desde cero</p>
      </div>
    );
  }

  if (cargandoSesion) return <div className="min-h-screen bg-slate-950 text-indigo-400 flex items-center justify-center font-sans animate-pulse text-sm">⚡ Cargando FitCero...</div>;

  // 2. MENÚ DE INICIAR SESIÓN CON LOGO, FITCERO, MODO CLARO/OSCURO E IDIOMAS
  if (!session) {
    return (
      <div className={`min-h-screen ${bgApp} flex items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-300`}>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className={`${bgCard} p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl relative z-10`}>
          
          {/* OPCIONES DE TEMA E IDIOMA EN EL INICIO DE SESIÓN */}
          <div className="flex justify-between items-center w-full pb-2">
            <button
              onClick={() => setModoOscuro(!modoOscuro)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                modoOscuro ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              {modoOscuro ? '🌙 ' + T.modoOscuro : '☀️ ' + T.modoClaro}
            </button>

            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value as Idioma)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                modoOscuro ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <option value="es">🇪🇸 ES</option>
              <option value="en">🇺🇸 EN</option>
              <option value="pt">🇧🇷 PT</option>
            </select>
          </div>

          <div className="text-center space-y-2">
            <img src="/logo.png" alt="FitCero Logo" className="w-24 h-24 mx-auto rounded-2xl shadow-xl object-contain mb-2" />
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">FitCero</h1>
            <p className={`text-xs ${textMuted} font-medium`}>Tu cambio, desde cero</p>
          </div>

          {errorAuth && <div className="bg-rose-950/60 text-rose-300 text-xs p-3.5 rounded-2xl border border-rose-800/80 text-center font-medium">⚠️ {errorAuth}</div>}

          {pasoOTP ? (
            <form onSubmit={verificarCodigoOTP} className="space-y-4">
              <input type="text" required value={codigoOTP} onChange={(e) => setCodigoOTP(e.target.value)} placeholder="Código de 6 dígitos" className={`${bgInput} text-center font-mono text-base tracking-widest`} />
              <button type="submit" disabled={cargandoAuth} className={btnPrimary}>{cargandoAuth ? 'Verificando...' : 'Confirmar Código'}</button>
              <button type="button" onClick={() => setPasoOTP(false)} className={`w-full text-xs ${textMuted} hover:text-indigo-400 transition`}>← Volver al formulario</button>
            </form>
          ) : (
            <form onSubmit={manejarAuth} className="space-y-4">
              <input type="email" required value={emailAuth} onChange={(e) => setEmailAuth(e.target.value)} placeholder="tu@email.com" className={bgInput} />
              
              <div className="relative">
                <input type={mostrarPassword ? "text" : "password"} required value={passwordAuth} onChange={(e) => setPasswordAuth(e.target.value)} placeholder="Contraseña" className={bgInput} />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className={`absolute right-3.5 top-3 text-xs ${textMuted} transition`}>
                  {mostrarPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {esRegistro && (
                <input type={mostrarPassword ? "text" : "password"} required value={confirmPasswordAuth} onChange={(e) => setConfirmPasswordAuth(e.target.value)} placeholder="Confirmar contraseña" className={bgInput} />
              )}

              <button type="submit" disabled={cargandoAuth} className={btnPrimary}>
                {cargandoAuth ? 'Procesando...' : esRegistro ? 'Registrarse' : 'Iniciar Sesión'}
              </button>
            </form>
          )}

          {!pasoOTP && (
            <button onClick={() => alternarModoAuth(!esRegistro)} className={`w-full text-center text-xs ${textMuted} hover:text-indigo-400 transition font-medium`}>
              {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgApp} flex flex-col md:flex-row font-sans transition-colors duration-300 selection:bg-indigo-500 selection:text-white`}>
      
      <style jsx global>{`
        @keyframes fadeInTab {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animar-pestana {
          animation: fadeInTab 0.25s ease-out forwards;
        }
      `}</style>

      {/* MENÚ LATERAL Y CABECERA CON "FITCERO" ENTRE MENÚ Y USUARIO */}
      <aside className={`${modoOscuro ? 'bg-slate-900/90 border-slate-800/80 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'} backdrop-blur-xl border-b md:border-b-0 md:border-r transition-all duration-300 flex flex-col justify-between shrink-0 ${sidebarAbierto ? 'fixed inset-0 z-50 w-full h-full md:relative md:w-64' : 'w-full md:w-20'}`}>
        <div>
          <div className={`p-4 flex items-center justify-between border-b ${modoOscuro ? 'border-slate-800/80' : 'border-slate-200'} gap-2`}>
            
            {/* BOTÓN MENÚ */}
            <button 
              onClick={() => setSidebarAbierto(!sidebarAbierto)} 
              className="px-3 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span className="text-base font-black tracking-tighter leading-none">{sidebarAbierto ? '✕' : '☰'}</span>
              <span className="text-xs font-black uppercase tracking-wider">{T.menu}</span>
            </button>
            
            {/* FITCERO ENTRE EL MENÚ Y EL NOMBRE DEL USUARIO */}
            <div className="flex items-center gap-1.5 font-black text-indigo-500 text-sm sm:text-base tracking-tight">
              <img src="/logo.png" alt="FitCero" className="w-6 h-6 rounded-lg object-contain" />
              <span>FitCero</span>
            </div>

            {/* NOMBRE DE USUARIO */}
            <div className={`text-xs font-bold ${modoOscuro ? 'text-slate-200 bg-slate-950/80 border-slate-800/80' : 'text-slate-800 bg-slate-100 border-slate-300'} px-3 py-2 rounded-xl border truncate max-w-[120px] sm:max-w-[150px] shadow-inner`}>
              👤 {perfil.nombre.trim() || session?.user?.email?.split('@')[0] || 'Usuario'}
            </div>
          </div>

          <nav className="p-3 text-center flex flex-col items-center justify-center space-y-3">
            {sidebarAbierto ? (
              <div className="w-full flex flex-col space-y-2">
                {SECCIONES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSeccionActiva(item.id as any); setSidebarAbierto(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 w-full justify-start ${
                      seccionActiva === item.id 
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30' 
                        : modoOscuro 
                          ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{T[item.id as keyof typeof T] || item.id}</span>
                  </button>
                ))}

                <div className={`pt-4 mt-2 border-t ${modoOscuro ? 'border-slate-800/80' : 'border-slate-200'} space-y-3 text-left`}>
                  <div className="px-2">
                    <label className={`text-[10px] ${textMuted} font-bold uppercase block mb-1.5`}>{T.tema}</label>
                    <button
                      onClick={() => setModoOscuro(!modoOscuro)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border ${modoOscuro ? 'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-indigo-500'} text-xs font-semibold transition`}
                    >
                      <span>{modoOscuro ? '🌙 ' + T.modoOscuro : '☀️ ' + T.modoClaro}</span>
                      <span className="text-[10px] bg-indigo-600/30 text-indigo-500 px-2 py-0.5 rounded-md font-bold">{T.cambiar}</span>
                    </button>
                  </div>

                  <div className="px-2">
                    <label className={`text-[10px] ${textMuted} font-bold uppercase block mb-1.5`}>{T.idioma}</label>
                    <select
                      value={idioma}
                      onChange={(e) => setIdioma(e.target.value as Idioma)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${modoOscuro ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'} outline-none focus:border-indigo-500`}
                    >
                      <option value="es">🇪🇸 Español</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="pt">🇧🇷 Português</option>
                    </select>
                  </div>
                </div>

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
          <div className={`p-4 border-t ${modoOscuro ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'} space-y-3 mt-auto text-center`}>
            <button onClick={cerrarSesion} className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold py-2.5 rounded-xl text-xs transition active:scale-95">🚪 {T.cerrarSesion}</button>
            <div className={`text-[10px] ${textMuted} font-mono`}>🚀 v{ULTIMA_ACTUALIZACION_APP}</div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        <header className={`${bgCard} flex justify-between items-center mb-8 p-4 sm:p-5 text-center shadow-xl`}>
          {indiceSeccionActual > 0 ? (
            <button 
              onClick={irSeccionAnterior} 
              className={`p-2 sm:p-2.5 rounded-2xl ${modoOscuro ? 'bg-slate-800/80 hover:bg-slate-700 text-indigo-400 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-300'} transition active:scale-90 font-bold text-sm sm:text-base border cursor-pointer shrink-0 shadow-sm`}
            >
              ◀
            </button>
          ) : (
            <div className="w-9 sm:w-10 shrink-0" />
          )}

          <h2 className="text-lg sm:text-2xl font-black text-center flex-1 flex items-center justify-center gap-2.5 px-2">
            <span>{SECCIONES.find(s => s.id === seccionActiva)?.icon}</span>
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {T[seccionActiva as keyof typeof T]}
            </span>
            <span>{SECCIONES.find(s => s.id === seccionActiva)?.icon}</span>
          </h2>

          {indiceSeccionActual < SECCIONES.length - 1 ? (
            <button 
              onClick={irSeccionSiguiente} 
              className={`p-2 sm:p-2.5 rounded-2xl ${modoOscuro ? 'bg-slate-800/80 hover:bg-slate-700 text-indigo-400 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-300'} transition active:scale-90 font-bold text-sm sm:text-base border cursor-pointer shrink-0 shadow-sm`}
            >
              ▶
            </button>
          ) : (
            <div className="w-9 sm:w-10 shrink-0" />
          )}
        </header>

        <div key={seccionActiva} className="animar-pestana">
          
          {/* RESUMEN GENERAL */}
          {seccionActiva === 'general' && (
            <div className="space-y-6">
              
              <div className="text-center pb-2">
                <button 
                  onClick={() => setMostrarReferencias(!mostrarReferencias)} 
                  className={`text-xs ${modoOscuro ? 'bg-slate-900/60 text-indigo-400 border-slate-800/80' : 'bg-white text-indigo-600 border-slate-200'} hover:underline font-medium cursor-pointer transition flex items-center justify-center gap-1.5 mx-auto px-4 py-2.5 rounded-xl border shadow-md`}
                >
                  <span>🔍</span>
                  <span>{mostrarReferencias ? T.ocultarReferencias : T.verReferencias}</span>
                </button>
              </div>

              {mostrarReferencias && (
                <div className={`${bgCard} p-5 rounded-3xl border space-y-4 animar-pestana shadow-xl`}>
                  <div className={`flex justify-between items-center border-b ${modoOscuro ? 'border-slate-800' : 'border-slate-200'} pb-3`}>
                    <h3 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
                      <span>📖</span>
                      <span>{T.tituloReferencias}</span>
                    </h3>
                    <button 
                      onClick={() => setMostrarReferencias(false)}
                      className="text-xs font-bold px-3 py-1 rounded-xl bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition"
                    >
                      ✕ {T.cerrar}
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className={`flex items-start gap-3 ${bgInnerCardSubtle} p-3 rounded-2xl border`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0 mt-0.5 shadow-md shadow-rose-500/50"></div>
                      <div>
                        <span className="font-bold text-rose-500 block mb-0.5">{T.refRojoTitulo}</span>
                        {T.refRojoDesc}
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 ${bgInnerCardSubtle} p-3 rounded-2xl border`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0 mt-0.5 shadow-md shadow-amber-500/50"></div>
                      <div>
                        <span className="font-bold text-amber-500 block mb-0.5">{T.refAmarilloTitulo}</span>
                        {T.refAmarilloDesc}
                      </div>
                    </div>

                    <div className={`flex items-start gap-3 ${bgInnerCardSubtle} p-3 rounded-2xl border`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 mt-0.5 shadow-md shadow-emerald-500/50"></div>
                      <div>
                        <span className="font-bold text-emerald-500 block mb-0.5">{T.refVerdeTitulo}</span>
                        {T.refVerdeDesc}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                
                <div onClick={() => setSeccionActiva('nutricion')} className={`${bgCard} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-center w-full">{T.balanceCalorico} 🔥</span>
                  <p className={`text-3xl font-black my-2 text-center w-full transition-colors ${estadoCalorico.colorTexto}`}>
                    {balanceCalorico > 0 ? `+${balanceCalorico}` : balanceCalorico} <span className={`text-xs ${textMuted} font-medium`}>kcal</span>
                  </p>
                  <div className="w-full space-y-1.5 mt-2 text-center">
                    <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                      <div className={`h-full rounded-full transition-all duration-500 ${estadoCalorico.colorBarra}`} style={{ width: `${estadoCalorico.pct}%` }}></div>
                    </div>
                    <div className={`flex justify-between items-center text-[10px] ${textMuted} font-semibold px-1 text-center w-full`}>
                      <span className="w-full text-center">{estadoCalorico.mensaje} ({estadoCalorico.pct}%)</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const pctAgua = Math.min(100, Math.round((aguaMl / metaAguaMl) * 100));
                  const colors = getDynamicColor(pctAgua);
                  return (
                    <div onClick={() => setSeccionActiva('extra')} className={`${bgCard} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                      <span className="text-xs font-bold uppercase tracking-wider text-center">{T.aguaDiaria} 💧</span>
                      <p className={`text-3xl font-black my-2 text-center transition-colors ${colors.text}`}>
                        {(aguaMl / 1000).toFixed(2)}L <span className={`text-xs ${textMuted} font-medium`}>/ 2.5L</span>
                      </p>
                      <div className="w-full space-y-1.5 mt-2">
                        <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                          <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${pctAgua}%` }}></div>
                        </div>
                        <span className={`text-[10px] ${textMuted} font-semibold`}>{pctAgua}% {T.completado}</span>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const colors = getDynamicColor(porcentajeHabitos);
                  return (
                    <div onClick={() => setSeccionActiva('habitos')} className={`${bgCard} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                      <span className="text-xs font-bold uppercase tracking-wider text-center">{T.habitos} ⚡</span>
                      <p className={`text-3xl font-black my-2 text-center transition-colors ${colors.text}`}>{porcentajeHabitos}%</p>
                      <div className="w-full space-y-1.5 mt-2">
                        <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                          <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${porcentajeHabitos}%` }}></div>
                        </div>
                        <span className={`text-[10px] ${textMuted} font-semibold`}>{totalCompletados} {T.de} {habitos.length} {T.listos}</span>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const pctSueno = Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100));
                  const colors = getDynamicColor(pctSueno);
                  return (
                    <div onClick={() => setSeccionActiva('extra')} className={`${bgCard} cursor-pointer text-center flex flex-col justify-between items-center group hover:scale-[1.02]`}>
                      <span className="text-xs font-bold uppercase tracking-wider text-center">{T.sueno} 😴</span>
                      <p className={`text-3xl font-black my-2 text-center transition-colors ${colors.text}`}>
                        {suenoHoy.horas_totales} <span className={`text-xs ${textMuted} font-medium`}>{T.hrs}</span>
                      </p>
                      <div className="w-full space-y-1.5 mt-2">
                        <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                          <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${pctSueno}%` }}></div>
                        </div>
                        <span className={`text-[10px] ${textMuted} font-semibold`}>{pctSueno}% {T.meta} (8 {T.hrs})</span>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>
          )}

          {/* PERFIL */}
          {seccionActiva === 'perfil' && (
            <section className={`${bgCard} max-w-xl mx-auto space-y-6`}>
              <div className={`flex border-b ${modoOscuro ? 'border-slate-800/80' : 'border-slate-200'} pb-3 gap-6 justify-center`}>
                <button onClick={() => setSubSeccionPerfil('perfil')} className={`text-xs font-bold pb-2 transition ${subSeccionPerfil === 'perfil' ? 'text-indigo-500 border-b-2 border-indigo-500' : `${textMuted} hover:text-slate-800`}`}>👤 {T.datosPersonales}</button>
                <button onClick={() => setSubSeccionPerfil('objetivo')} className={`text-xs font-bold pb-2 transition ${subSeccionPerfil === 'objetivo' ? 'text-indigo-500 border-b-2 border-indigo-500' : `${textMuted} hover:text-slate-800`}`}>🎯 {T.miObjetivo}</button>
              </div>

              {subSeccionPerfil === 'perfil' ? (
                <div className="space-y-4 max-w-md mx-auto text-center">
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.nombre}</label>
                      <input type="text" value={perfil.nombre} onChange={(e) => setPerfil({...perfil, nombre: e.target.value})} className={`${bgInput} text-center`} />
                    </div>
                    <div>
                      <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.fechaNacimiento}</label>
                      <input 
                        type="text" 
                        placeholder="DD/MM/AAAA"
                        value={perfil.fecha_nacimiento} 
                        onChange={manejarFechaNacimientoChange} 
                        className={`${bgInput} text-center font-mono w-full`} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.peso}</label>
                      <CleanNumberInput step="0.1" value={perfil.peso} onChange={(v: number) => setPerfil({...perfil, peso: v})} className={`${bgInput} text-center font-bold`} />
                    </div>
                    <div>
                      <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.altura}</label>
                      <CleanNumberInput value={perfil.altura} onChange={(v: number) => setPerfil({...perfil, altura: v})} className={`${bgInput} text-center font-bold`} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto text-center">
                  <div className="max-w-[220px] mx-auto text-center">
                    <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.objetivoPrincipal}</label>
                    <select value={perfil.objetivo} onChange={(e) => setPerfil({...perfil, objetivo: e.target.value as any})} className={`${bgInput} text-center font-bold`}>
                      <option value="bajar">{T.bajarPeso}</option>
                      <option value="mantener">{T.mantenerPeso}</option>
                      <option value="subir">{T.subirPeso}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.kilosObjetivo}</label>
                      <CleanNumberInput value={perfil.kilos_objetivo} onChange={(v: number) => setPerfil({...perfil, kilos_objetivo: v})} className={`${bgInput} text-center font-bold`} />
                    </div>
                    <div>
                      <label className={`text-xs ${textMuted} font-medium block mb-1 text-center`}>{T.plazoMeses}</label>
                      <CleanNumberInput value={perfil.tiempo_objetivo_meses} onChange={(v: number) => setPerfil({...perfil, tiempo_objetivo_meses: v})} className={`${bgInput} text-center font-bold`} />
                    </div>
                  </div>

                  {(() => {
                    const prob = calcularProbabilidadObjetivo(perfil.kilos_objetivo, perfil.tiempo_objetivo_meses, perfil.objetivo);
                    let colorBar = "bg-emerald-500 shadow-emerald-500/50";
                    let colorTxt = "text-emerald-500";
                    let msg = T.muyProbable;

                    if (prob < 30) {
                      colorBar = "bg-rose-500 shadow-rose-500/50";
                      colorTxt = "text-rose-500";
                      msg = T.pocoProbable;
                    } else if (prob < 75) {
                      colorBar = "bg-amber-500 shadow-amber-500/50";
                      colorTxt = "text-amber-500";
                      msg = T.exigente;
                    }

                    return (
                      <div className={`p-3.5 ${bgInnerCard} rounded-2xl border space-y-2 mt-4 text-center`}>
                        <div className="flex justify-between items-center text-xs font-semibold px-1">
                          <span className={textMuted}>{T.probabilidadCumplirse}</span>
                          <span className={`font-bold ${colorTxt}`}>{prob}% ({msg})</span>
                        </div>
                        <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                          <div className={`h-full rounded-full transition-all duration-500 ${colorBar}`} style={{ width: `${prob}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              )}

              <button onClick={guardarPerfil} disabled={guardandoPerfil} className={`${btnPrimary} max-w-xs mx-auto block`}>
                {guardandoPerfil ? '...' : T.guardarPerfil}
              </button>
            </section>
          )}

          {/* HÁBITOS */}
          {seccionActiva === 'habitos' && (
            <section className={`${bgCard} space-y-6 max-w-2xl mx-auto`}>
              <form onSubmit={agregarHabito} className={`flex gap-2 ${bgInnerCard} p-2.5 rounded-2xl border items-center shadow-inner`}>
                <input 
                  type="text" 
                  placeholder={T.habitoPlaceholder} 
                  value={nuevoHabito} 
                  onChange={(e) => setNuevoHabito(e.target.value)} 
                  className={`${bgInput} flex-1`} 
                />
                <input 
                  type="time" 
                  value={horaObjetivo} 
                  onChange={(e) => setHoraObjetivo(e.target.value)} 
                  className={`${timeInputStyle} rounded-xl px-2 py-2.5 text-xs font-mono w-20 text-center shrink-0 outline-none focus:border-indigo-500 font-bold`} 
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shrink-0 transition active:scale-95 shadow-lg shadow-indigo-600/30">
                  {T.anadir}
                </button>
              </form>

              <div className="space-y-3">
                {habitos.map((h) => {
                  const completado = !!registrosHoy[h.id]?.completado;
                  const racha = rachasHabitos[h.id] || 0;
                  return (
                    <div key={h.id} className={`p-3.5 rounded-2xl border ${bgInnerCardSubtle} flex flex-col gap-2 transition hover:border-slate-400`}>
                      <div className={`flex items-center justify-between border-b ${modoOscuro ? 'border-slate-800/50' : 'border-slate-200'} pb-2`}>
                        <span className={`text-[10px] ${textMuted} font-semibold uppercase tracking-wider`}>{T.habitoDiario}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                            <span>🔥</span>
                            <span>{racha}{T.diasAbrev}</span>
                          </span>
                          <span className="text-indigo-500 font-mono text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <span>⏰</span>
                            <span>{h.hora_objetivo}</span>
                          </span>
                          <button onClick={() => eliminarHabito(h.id)} className="text-rose-500 hover:text-rose-400 text-xs p-0.5 transition hover:scale-110 ml-1">
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button onClick={() => alternarHabito(h.id)} className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-all ${completado ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-500 shadow-md shadow-indigo-600/40' : 'border-slate-400 hover:border-indigo-500'}`}>
                          {completado && '✓'}
                        </button>
                        <span className={`text-xs font-bold break-words flex-1 leading-normal ${completado ? 'line-through text-slate-400' : modoOscuro ? 'text-slate-100' : 'text-slate-800'}`}>
                          {h.texto}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* NUTRICIÓN */}
          {seccionActiva === 'nutricion' && (
            <section className={`${bgCard} max-w-3xl mx-auto space-y-6`}>
              <div className={`flex border-b ${modoOscuro ? 'border-slate-800/80' : 'border-slate-200'} pb-3 gap-6 justify-center`}>
                <button onClick={() => setSubSeccionNutricion('nutricion')} className={`text-xs font-bold pb-2 transition ${subSeccionNutricion === 'nutricion' ? 'text-amber-500 border-b-2 border-amber-500' : `${textMuted} hover:text-slate-800`}`}>{T.subSeccionNutricion}</button>
                <button onClick={() => setSubSeccionNutricion('entrenamiento')} className={`text-xs font-bold pb-2 transition ${subSeccionNutricion === 'entrenamiento' ? 'text-indigo-500 border-b-2 border-indigo-500' : `${textMuted} hover:text-slate-800`}`}>{T.subSeccionEntrenamiento}</button>
              </div>

              {subSeccionNutricion === 'nutricion' ? (
                <div className="space-y-3">
                  <div className={`${modoOscuro ? 'bg-slate-950/90 border-amber-500/30' : 'bg-amber-50/90 border-amber-300/60 shadow-sm'} border p-3.5 rounded-2xl flex justify-between items-center mb-4`}>
                    <span className="text-xs text-amber-500 font-bold flex items-center gap-1.5">
                      <span>🔥</span>
                      <span>{T.totalIngeridasHoy}</span>
                    </span>
                    <span className="text-base font-black text-amber-500 font-mono">{totalIngresoCalorias} <span className={`text-xs ${textMuted}`}>kcal</span></span>
                  </div>

                  <div className="flex justify-between items-center">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>{T.comidasDelDia}</h3>
                    <button onClick={agregarComida} className="text-xs text-amber-500 font-bold hover:underline transition">{T.agregarComida}</button>
                  </div>
                  
                  {comidas.map((item, index) => (
                    <div key={item.id} className={`${bgInnerCardSubtle} p-3 rounded-2xl border flex items-center gap-2 sm:gap-3 transition hover:border-slate-400`}>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moverComida(index, 'arriba')} disabled={index === 0} className={`text-[10px] ${modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'} hover:opacity-80 disabled:opacity-30 px-1.5 py-0.5 rounded transition`}>▲</button>
                        <button onClick={() => moverComida(index, 'abajo')} disabled={index === comidas.length - 1} className={`text-[10px] ${modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'} hover:opacity-80 disabled:opacity-30 px-1.5 py-0.5 rounded transition`}>▼</button>
                      </div>

                      <input type="text" value={item.nombre} onChange={(e) => actualizarComida(item.id, 'nombre', e.target.value)} className={bgInput} />
                      
                      <div className="w-24 shrink-0 text-center">
                        <label className={`text-[10px] ${textMuted} block mb-0.5 font-medium`}>kcal</label>
                        <CleanNumberInput value={item.calorias} onChange={(v: number) => actualizarComida(item.id, 'calorias', v)} className={`${bgInput} text-center font-bold`} />
                      </div>

                      <button onClick={() => eliminarComida(item.id)} className="text-rose-500 hover:text-rose-400 text-xs p-1 shrink-0 transition hover:scale-110">🗑️</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`${modoOscuro ? 'bg-slate-950/90 border-indigo-500/30' : 'bg-indigo-50/90 border-indigo-300/60 shadow-sm'} border p-3.5 rounded-2xl flex justify-between items-center mb-4`}>
                    <span className="text-xs text-indigo-500 font-bold flex items-center gap-1.5">
                      <span>🏃</span>
                      <span>{T.totalQuemadasHoy}</span>
                    </span>
                    <span className="text-base font-black text-indigo-500 font-mono">{bmrCalculado + totalGastoEjercicios} <span className={`text-xs ${textMuted}`}>kcal</span></span>
                  </div>

                  <div className="flex justify-between items-center">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>{T.actividadesRegistradas}</h3>
                    <button onClick={agregarEjercicio} className="text-xs text-indigo-500 font-bold hover:underline transition">{T.agregarEjercicio}</button>
                  </div>

                  <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">⚡</span>
                      <div>
                        <span className="text-xs font-bold block">{T.gastoBase}</span>
                        <span className="text-[10px] text-violet-100">{T.gastoBaseDesc}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono">{bmrCalculado}</span>
                      <span className="text-[10px] block">kcal</span>
                    </div>
                  </div>

                  {ejercicios.map((item, index) => (
                    <div key={item.id} className={`${bgInnerCardSubtle} p-3 rounded-2xl border flex items-center justify-between gap-2 sm:gap-3 transition hover:border-slate-400`}>
                      <div className="flex flex-col gap-0.5 shrink-0 mt-3">
                        <button onClick={() => moverEjercicio(index, 'arriba')} disabled={index === 0} className={`text-[10px] ${modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'} hover:opacity-80 disabled:opacity-30 px-1.5 py-0.5 rounded transition`}>▲</button>
                        <button onClick={() => moverEjercicio(index, 'abajo')} disabled={index === ejercicios.length - 1} className={`text-[10px] ${modoOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'} hover:opacity-80 disabled:opacity-30 px-1.5 py-0.5 rounded transition`}>▼</button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <label className={`text-[10px] ${textMuted} block text-center mb-1 font-medium`}>{T.tipoActividad}</label>
                        <select value={item.tipo} onChange={(e) => actualizarEjercicio(item.id, 'tipo', e.target.value as TipoEjercicio)} className={`${bgInput} w-full text-center truncate font-semibold`}>
                          <option value="">{T.seleccionarTipo}</option>
                          <option value="fuerza">{T.fuerza}</option>
                          <option value="running">{T.running}</option>
                          <option value="ciclismo">{T.ciclismo}</option>
                          <option value="boxeo">{T.boxeo}</option>
                          <option value="futbol">{T.futbol}</option>
                          <option value="natacion">{T.natacion}</option>
                          <option value="caminata">{T.caminata}</option>
                          <option value="funcional">{T.funcional}</option>
                          <option value="otro">{T.otro}</option>
                        </select>
                      </div>

                      <div className="w-20 shrink-0 text-center">
                        <label className="text-[10px] text-amber-500 block text-center mb-1 font-bold">Kcal</label>
                        <CleanNumberInput value={item.calorias} onChange={(v: number) => actualizarEjercicio(item.id, 'calorias', v)} className={`${bgInput} text-center font-bold px-1`} />
                      </div>

                      <button onClick={() => eliminarEjercicio(item.id)} className="text-rose-500 hover:text-rose-400 text-xs p-1 shrink-0 mt-4 transition hover:scale-110">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* EXTRA (AGUA Y SUEÑO) */}
          {seccionActiva === 'extra' && (
            <section className={`${bgCard} max-w-md mx-auto space-y-6`}>
              <div className={`flex border-b ${modoOscuro ? 'border-slate-800/80' : 'border-slate-200'} pb-3 gap-6 justify-center`}>
                <button onClick={() => setSubSeccionExtra('agua')} className={`text-xs font-bold pb-2 transition ${subSeccionExtra === 'agua' ? 'text-cyan-500 border-b-2 border-cyan-500' : `${textMuted} hover:text-slate-800`}`}>💧 {T.hidratacion}</button>
                <button onClick={() => setSubSeccionExtra('sueno')} className={`text-xs font-bold pb-2 transition ${subSeccionExtra === 'sueno' ? 'text-violet-500 border-b-2 border-violet-500' : `${textMuted} hover:text-slate-800`}`}>😴 {T.descanso}</button>
              </div>

              {subSeccionExtra === 'agua' ? (
                <div className="space-y-5 text-center">
                  <p className="text-4xl font-black text-cyan-500 drop-shadow-md">{(aguaMl / 1000).toFixed(2)} <span className={`text-sm font-semibold ${textMuted}`}>/ 2.50 L</span></p>

                  <div className="space-y-1.5">
                    <div className={`flex justify-between text-xs ${textMuted} font-semibold px-1`}>
                      <span>{T.progreso}</span>
                      <span>{Math.min(100, Math.round((aguaMl / metaAguaMl) * 100))}%</span>
                    </div>
                    <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                      <div className="bg-cyan-500 h-full rounded-full transition-all duration-300 shadow-cyan-500/50" style={{ width: `${Math.min(100, (aguaMl / metaAguaMl) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-2.5 pt-2">
                    <button onClick={() => modificarAgua(250)} className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-500 font-bold px-3.5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-md">+250 ml</button>
                    <button onClick={() => modificarAgua(500)} className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-500 font-bold px-3.5 py-2.5 rounded-xl text-xs transition active:scale-95 shadow-md">+500 ml</button>
                    <button onClick={() => modificarAgua(-250)} className={`border ${modoOscuro ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'} font-bold px-3.5 py-2.5 rounded-xl text-xs transition active:scale-95`}>-250 ml</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-center">
                  <p className="text-4xl font-black text-violet-500 drop-shadow-md">{suenoHoy.horas_totales} <span className={`text-sm font-semibold ${textMuted}`}>/ 8.0 {T.hrs}</span></p>

                  <div className="space-y-1.5">
                    <div className={`flex justify-between text-xs ${textMuted} font-semibold px-1`}>
                      <span>{T.progreso}</span>
                      <span>{Math.min(100, Math.round((suenoHoy.horas_totales / 8) * 100))}%</span>
                    </div>
                    <div className={`w-full ${bgTrack} rounded-full h-3 overflow-hidden p-0.5`}>
                      <div className="bg-violet-500 h-full rounded-full transition-all duration-300 shadow-violet-500/50" style={{ width: `${Math.min(100, (suenoHoy.horas_totales / 8) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 items-center pt-2">
                    <div>
                      <label className={`text-[10px] ${textMuted} font-medium block mb-1`}>{T.acostarse}</label>
                      <input type="time" value={suenoHoy.hora_acostarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_acostarse: e.target.value})} className={`${timeInputStyle} rounded-xl px-3 py-2 text-xs font-mono outline-none w-28 text-center font-bold`} />
                    </div>
                    <div>
                      <label className={`text-[10px] ${textMuted} font-medium block mb-1`}>{T.levantarse}</label>
                      <input type="time" value={suenoHoy.hora_levantarse} onChange={(e) => setSuenoHoy({...suenoHoy, hora_levantarse: e.target.value})} className={`${timeInputStyle} rounded-xl px-3 py-2 text-xs font-mono outline-none w-28 text-center font-bold`} />
                    </div>
                  </div>

                  <button onClick={guardarSueno} className={btnPrimary}>{T.guardarSueno}</button>
                </div>
              )}
            </section>
          )}

          {/* 3. NUEVA PESTAÑA: ALERTAS Y NOTIFICACIONES */}
          {seccionActiva === 'alertas' && (
            <section className={`${bgCard} max-w-lg mx-auto space-y-5`}>
              <h3 className="text-sm font-bold text-center uppercase tracking-wider">{T.configAlertas}</h3>
              
              <button onClick={solicitarPermisosNotificacion} className={`${btnPrimary} bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500`}>
                {T.activarNotificaciones}
              </button>

              <div className="space-y-3.5 pt-2">
                
                <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                  <label className={`text-xs font-bold block ${textMuted}`}>{T.alertaLevantarse}</label>
                  <input type="time" value={configAlertas.horaLevantarse} onChange={(e) => setConfigAlertas({...configAlertas, horaLevantarse: e.target.value})} className={`${timeInputStyle} w-full rounded-xl p-2 text-xs font-mono text-center font-bold`} />
                </div>

                <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                  <label className={`text-xs font-bold block ${textMuted}`}>{T.alertaEntrenar}</label>
                  <input type="time" value={configAlertas.horaEntrenar} onChange={(e) => setConfigAlertas({...configAlertas, horaEntrenar: e.target.value})} className={`${timeInputStyle} w-full rounded-xl p-2 text-xs font-mono text-center font-bold`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                    <label className={`text-[10px] font-bold block ${textMuted}`}>{T.alertaDesayuno}</label>
                    <input type="time" value={configAlertas.horaDesayuno} onChange={(e) => setConfigAlertas({...configAlertas, horaDesayuno: e.target.value})} className={`${timeInputStyle} w-full rounded-xl p-2 text-xs font-mono text-center font-bold`} />
                  </div>
                  <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                    <label className={`text-[10px] font-bold block ${textMuted}`}>{T.alertaAlmuerzo}</label>
                    <input type="time" value={configAlertas.horaAlmuerzo} onChange={(e) => setConfigAlertas({...configAlertas, horaAlmuerzo: e.target.value})} className={`${timeInputStyle} w-full rounded-xl p-2 text-xs font-mono text-center font-bold`} />
                  </div>
                  <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                    <label className={`text-[10px] font-bold block ${textMuted}`}>{T.alertaMerienda}</label>
                    <input type="time" value={configAlertas.horaMerienda} onChange={(e) => setConfigAlertas({...configAlertas, horaMerienda: e.target.value})} className={`${timeInputStyle} w-full rounded-xl p-2 text-xs font-mono text-center font-bold`} />
                  </div>
                  <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                    <label className={`text-[10px] font-bold block ${textMuted}`}>{T.alertaCena}</label>
                    <input type="time" value={configAlertas.horaCena} onChange={(e) => setConfigAlertas({...configAlertas, horaCena: e.target.value})} className={`${timeInputStyle} w-full rounded-xl p-2 text-xs font-mono text-center font-bold`} />
                  </div>
                </div>

                <div className={`${bgInnerCardSubtle} p-3 rounded-2xl border space-y-1`}>
                  <label className={`text-xs font-bold block ${textMuted}`}>{T.alertaAgua}</label>
                  <select value={configAlertas.intervaloAguaHoras} onChange={(e) => setConfigAlertas({...configAlertas, intervaloAguaHoras: Number(e.target.value)})} className={`${bgInput} font-bold text-center`}>
                    <option value={1}>Cada 1 hora</option>
                    <option value={2}>Cada 2 horas</option>
                    <option value={3}>Cada 3 horas</option>
                  </select>
                </div>

              </div>

              <button onClick={() => alert('✅ Configuración de alertas guardada exitosamente.')} className={btnPrimary}>
                {T.guardarAlertas}
              </button>
            </section>
          )}

          {/* NOVEDADES Y SOPORTE CON TRADUCCIONES COMPLETAS */}
          {seccionActiva === 'actualizaciones' && (
            <section className={`${bgCard} max-w-lg mx-auto space-y-6`}>
              <div className={`flex border-b ${modoOscuro ? 'border-slate-800/80' : 'border-slate-200'} pb-3 gap-6 justify-center`}>
                <button onClick={() => setSubSeccionActualizaciones('novedades')} className={`text-xs font-bold pb-2 transition ${subSeccionActualizaciones === 'novedades' ? 'text-indigo-500 border-b-2 border-indigo-500' : `${textMuted} hover:text-slate-800`}`}>🚀 {T.novedades}</button>
                <button onClick={() => setSubSeccionActualizaciones('soporte')} className={`text-xs font-bold pb-2 transition ${subSeccionActualizaciones === 'soporte' ? 'text-indigo-500 border-b-2 border-indigo-500' : `${textMuted} hover:text-slate-800`}`}>💬 {T.soporte}</button>
              </div>

              {subSeccionActualizaciones === 'novedades' ? (
                <div className={`${bgInnerCard} p-5 rounded-2xl border text-xs space-y-2.5`}>
                  <p className="font-bold text-sm">{T.versionApp}: {ULTIMA_ACTUALIZACION_APP}</p>
                  <p>{T.novedadesItem1}</p>
                  <p>{T.novedadesItem2}</p>
                  <p>{T.novedadesItem3}</p>
                  <p>{T.novedadesItem4}</p>
                </div>
              ) : (
                <form onSubmit={enviarSoporte} className={`${bgInnerCard} p-5 rounded-2xl border space-y-4`}>
                  <select value={tipoSoporte} onChange={(e) => setTipoSoporte(e.target.value)} className={`${bgInput} font-semibold`}>
                    <option value="" disabled>{T.tipoMensajePlaceholder}</option>
                    <option value="Sugerencia">{T.sugerencia}</option>
                    <option value="Duda">{T.duda}</option>
                    <option value="Error">{T.reporteError}</option>
                  </select>
                  <textarea rows={4} value={mensajeSoporte} onChange={(e) => setMensajeSoporte(e.target.value)} placeholder={T.escribeMensaje} className={bgInput} required />
                  <button type="submit" className={btnPrimary}>{T.enviarComentario}</button>
                </form>
              )}
            </section>
          )}

        </div>

      </main>
    </div>
  );
}