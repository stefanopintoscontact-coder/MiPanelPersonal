'use client';

import { useState } from 'react';

interface Habito {
  id: number;
  texto: string;
  completado: boolean;
}

interface Transaccion {
  id: number;
  monto: number;
  tipo: 'ingreso' | 'gasto';
  descripcion: string;
}

export default function Home() {
  // --- ESTADO DE HÁBITOS ---
  const [habitos, setHabitos] = useState<Habito[]>([
    { id: 1, texto: 'Estudiar programación 30 min', completado: false },
    { id: 2, texto: 'Practicar inglés 15 min', completado: false },
  ]);
  const [nuevoHabito, setNuevoHabito] = useState('');

  // --- ESTADO DE FINANZAS ---
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>('gasto');

  // Funciones de Hábitos
  const agregarHabito = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoHabito.trim()) return;

    setHabitos([
      ...habitos,
      { id: Date.now(), texto: nuevoHabito, completado: false },
    ]);
    setNuevoHabito('');
  };

  const alternarHabito = (id: number) => {
    setHabitos(
      habitos.map((h) =>
        h.id === id ? { ...h, completado: !h.completado } : h
      )
    );
  };

  const eliminarHabito = (id: number) => {
    setHabitos(habitos.filter((h) => h.id !== id));
  };

  // Funciones de Finanzas
  const agregarTransaccion = (e: React.FormEvent) => {
    e.preventDefault();
    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0 || !descripcion.trim()) return;

    setTransacciones([
      ...transacciones,
      { id: Date.now(), monto: numMonto, tipo, descripcion },
    ]);
    setMonto('');
    setDescripcion('');
  };

  // Cálculos automáticos
  const totalIngresos = transacciones
    .filter((t) => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + t.monto, 0);

  const totalGastos = transacciones
    .filter((t) => t.tipo === 'gasto')
    .reduce((acc, t) => acc + t.monto, 0);

  const balance = totalIngresos - totalGastos;

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      {/* Encabezado */}
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-indigo-400">Mi Panel Personal</h1>
        <p className="text-slate-400 text-sm mt-1">
          Gestor de Hábitos y Finanzas — Proyecto Inicial
        </p>
      </header>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECCIÓN FINANZAS */}
        <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2">
              💵 Resumen Financiero
            </h2>

            {/* Totales */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block">Ingresos</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  ${totalIngresos.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block">Gastos</span>
                <span className="font-mono text-rose-400 font-bold text-sm">
                  ${totalGastos.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block">Balance</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    balance >= 0 ? 'text-indigo-400' : 'text-rose-500'
                  }`}
                >
                  ${balance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Formulario Finanzas */}
            <form onSubmit={agregarTransaccion} className="space-y-3 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Descripción (ej. Café, Sueldo)..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  placeholder="Monto"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-24 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'ingreso' | 'gasto')}
                  className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="gasto">Gasto 🔻</option>
                  <option value="ingreso">Ingreso 🟢</option>
                </select>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-xl transition cursor-pointer"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>

          {/* Historial rápido */}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {transacciones.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-800 text-xs"
              >
                <span className="text-slate-300">{t.descripcion}</span>
                <span
                  className={`font-mono font-bold ${
                    t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN HÁBITOS */}
        <section className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-indigo-400 flex items-center gap-2">
              ⚡ Hábitos de Hoy
            </h2>

            <form onSubmit={agregarHabito} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Escribe un nuevo hábito..."
                value={nuevoHabito}
                onChange={(e) => setNuevoHabito(e.target.value)}
                className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Agregar
              </button>
            </form>

            <div className="space-y-3">
              {habitos.map((habito) => (
                <div
                  key={habito.id}
                  className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 transition"
                >
                  <label className="flex items-center space-x-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={habito.completado}
                      onChange={() => alternarHabito(habito.id)}
                      className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                    />
                    <span
                      className={`text-slate-200 text-sm ${
                        habito.completado ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {habito.texto}
                    </span>
                  </label>
                  <button
                    onClick={() => eliminarHabito(habito.id)}
                    className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 transition cursor-pointer"
                    title="Eliminar hábito"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}