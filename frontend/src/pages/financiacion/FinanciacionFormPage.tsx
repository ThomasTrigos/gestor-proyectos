import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { financiacionApi } from '../../api/financiacion';
import { proyectosApi } from '../../api/proyectos';
import { empresasApi } from '../../api/empresas';
import { 
  Proyecto, 
  Empresa, 
  CuotaPago, 
  TipoTrabajoFinanciacion, 
  TIPO_TRABAJO_LABELS,
  TipoPagoItem,
  ModalidadPago,
  EstadoCuota,
  ESTADO_PAGO_LABELS,
  FormaPago
} from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { 
  Building2, 
  FolderKanban, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Mail, 
  Bell, 
  CreditCard, 
  PackageCheck, 
  Calculator, 
  ArrowLeft, 
  Layers, 
  Clock, 
  AlertCircle, 
  CheckCheck,
  ListOrdered
} from 'lucide-react';

/**
 * Retorna el último lunes hábil de un mes dado (base 0: 0=Enero, ..., 11=Diciembre).
 */
export function getUltimoLunesDelMes(year: number, monthIndex: number): string {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const d = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());
  while (d.getDay() !== 1) { // 1 = Lunes
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type GeneradorModo = 'CUOTAS' | 'ENTREGABLES';

export interface CuotaItemState {
  id?: string;
  tempId: string;
  numero_cuota: number;
  monto: string | number;
  fecha_pago: string;
  fecha_aviso: string;
  modalidad: ModalidadPago;
  estado: EstadoCuota;
  comprobante?: string;
  pago_en_dolares?: boolean;
  monto_usd?: string | number;
  cotizacion_usd?: string | number;
}

export interface EntregableItemState {
  id?: string;
  tempId: string;
  entregable: string;
  detalle: string;
  monto: string | number;
  monto_pagado: string | number;
  fecha_pago: string;
  fecha_aviso: string;
  modalidad: ModalidadPago;
  estado: EstadoCuota;
}


const MONEDAS = [
  { value: 'ARS', label: 'Pesos Argentinos (ARS)' },
  { value: 'USD', label: 'Dólares Estadounidenses (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
  { value: 'BRL', label: 'Reales Brasileños (BRL)' },
];

const TIPOS_TRABAJO_OPTIONS = [
  { value: TipoTrabajoFinanciacion.DESARROLLO, label: 'Desarrollo de Software' },
  { value: TipoTrabajoFinanciacion.CONSULTORIA, label: 'Consultoría Especializada' },
  { value: TipoTrabajoFinanciacion.IMPLEMENTACION_CAPACITACION, label: 'Implementación + Capacitación' },
  { value: TipoTrabajoFinanciacion.OTRO, label: 'Otro (Especificar)' },
];

const MODALIDADES_OPTIONS = [
  { value: ModalidadPago.VENCIDO, label: 'Por Vencido' },
  { value: ModalidadPago.ADELANTADO, label: 'Por Adelantado (Fija Pagado)' },
];

const ESTADOS_PAGO_OPTIONS = [
  { value: EstadoCuota.EN_ESPERA, label: 'En espera (Previo a fecha)' },
  { value: EstadoCuota.PAGADO, label: 'Pagado (Pago informado)' },
  { value: EstadoCuota.VERIFICANDOSE, label: 'Verificándose (En corroboración)' },
  { value: EstadoCuota.IMPAGO, label: 'Impago (Confirmación no pago)' },
];

export default function FinanciacionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  // Aspectos Generales
  const [empresaId, setEmpresaId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [tipoTrabajo, setTipoTrabajo] = useState<TipoTrabajoFinanciacion>(TipoTrabajoFinanciacion.DESARROLLO);
  const [tipoTrabajoOtro, setTipoTrabajoOtro] = useState('');
  const [dolaresGeneral, setDolaresGeneral] = useState('');
  const [cotizacionGeneral, setCotizacionGeneral] = useState('1250');
  const [montoTotal, setMontoTotal] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [formaPago, setFormaPago] = useState<string>(FormaPago.PLAN_CUOTAS);
  const [fechaAcuerdo, setFechaAcuerdo] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');

  // Regla de Automatización: Dólares -> Monto en Pesos (Aspectos Generales)
  // Si el usuario completa el campo dólares (> 0), se calcula automáticamente el monto en pesos.
  // Si no se completa o es igual a 0, el usuario puede completarlo por su cuenta.
  const isDolaresGeneralActivo = Boolean(
    dolaresGeneral.trim() !== '' && 
    !isNaN(parseFloat(dolaresGeneral)) && 
    parseFloat(dolaresGeneral) > 0
  );

  const handleDolaresGeneralChange = (val: string) => {
    setDolaresGeneral(val);
    const d = parseFloat(val);
    const c = parseFloat(cotizacionGeneral) || 1250;
    if (!isNaN(d) && d > 0 && !isNaN(c) && c > 0) {
      setMontoTotal((d * c).toFixed(2));
      setMoneda('ARS');
      // Sincronizar generador automático si se activa
      setGenEnDolares(true);
      setGenCotizacionUsd(String(c));
    } else if (!val || isNaN(d) || d === 0) {
      // Si no se completa o es igual a 0, el usuario puede completarlo por su cuenta
      // No forzamos sobreescritura para que el usuario escriba libremente en montoTotal (montoEnPesos)
    }
  };

  const handleCotizacionGeneralChange = (val: string) => {
    setCotizacionGeneral(val);
    const d = parseFloat(dolaresGeneral);
    const c = parseFloat(val);
    if (!isNaN(d) && d > 0 && !isNaN(c) && c > 0) {
      setMontoTotal((d * c).toFixed(2));
      setGenCotizacionUsd(String(c));
    }
  };

  // Notificaciones
  const [avisoEmailEmpresa, setAvisoEmailEmpresa] = useState(true);
  const [recordatorioVerificarCobro, setRecordatorioVerificarCobro] = useState(true);

  // Modo de Generación en el panel superior (El usuario solo puede elegir un modo de carga a la vez)
  const [generadorModo, setGeneradorModo] = useState<GeneradorModo>('CUOTAS');

  // Listas de Pagos
  const [cuotas, setCuotas] = useState<CuotaItemState[]>([]);
  const [entregables, setEntregables] = useState<EntregableItemState[]>([]);

  // Parámetros para Generador Automático de Cuotas
  const [genCantidad, setGenCantidad] = useState<number>(3);
  const [genFechaInicio, setGenFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [genEnDolares, setGenEnDolares] = useState<boolean>(false);
  const [genCotizacionUsd, setGenCotizacionUsd] = useState<string>('');

  // Filtro visual en el listado inferior (opcional para el usuario, por defecto muestra AMBOS)
  const [filtroListado, setFiltroListado] = useState<'TODOS' | 'CUOTAS' | 'ENTREGABLES'>('TODOS');

  // Carga inicial
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empresasRes, proyectosRes] = await Promise.all([
          empresasApi.getAll(),
          proyectosApi.getAll()
        ]);
        setEmpresas(empresasRes);
        setProyectos(proyectosRes);

        if (id) {
          const item: any = await financiacionApi.getById(id);
          const pId = typeof item.proyecto === 'object' ? item.proyecto?.id : (item.proyecto || '');
          const eId = item.empresa_id || (typeof item.empresa === 'object' ? item.empresa?.id : item.empresa) || '';

          setEmpresaId(eId);
          setProyectoId(pId);
          setTipoTrabajo(item.tipo_trabajo || TipoTrabajoFinanciacion.DESARROLLO);
          setTipoTrabajoOtro(item.tipo_trabajo_otro || '');
          setDolaresGeneral(item.monto_usd ? String(item.monto_usd) : '');
          setCotizacionGeneral(item.cotizacion_usd ? String(item.cotizacion_usd) : '1250');
          setMontoTotal(item.monto_total ? String(item.monto_total) : '');
          setMoneda(item.moneda || 'ARS');
          setFormaPago(item.forma_pago || FormaPago.PLAN_CUOTAS);
          setFechaAcuerdo(item.fecha_acuerdo || new Date().toISOString().split('T')[0]);
          setNotas(item.notas || '');
          setAvisoEmailEmpresa(Boolean(item.aviso_email_empresa));
          setRecordatorioVerificarCobro(Boolean(item.recordatorio_verificar_cobro));

          if (Array.isArray(item.cuotas)) {
            const rawCuotas: CuotaItemState[] = [];
            const rawEntregables: EntregableItemState[] = [];

            item.cuotas.forEach((c: CuotaPago, idx: number) => {
              if (c.tipo_pago === 'ENTREGABLE') {
                rawEntregables.push({
                  id: c.id,
                  tempId: `loaded-entregable-${idx}`,
                  entregable: c.entregable || '',
                  detalle: c.detalle || '',
                  monto: c.monto,
                  monto_pagado: c.monto_pagado || 0,
                  fecha_pago: c.fecha_pago || c.fecha_vencimiento || '',
                  fecha_aviso: c.fecha_aviso || '',
                  modalidad: (c.modalidad as ModalidadPago) || ModalidadPago.VENCIDO,
                  estado: (c.estado as EstadoCuota) || EstadoCuota.EN_ESPERA,
                });
              } else {
                rawCuotas.push({
                  id: c.id,
                  tempId: `loaded-cuota-${idx}`,
                  numero_cuota: c.numero_cuota || idx + 1,
                  monto: c.monto,
                  fecha_pago: c.fecha_pago || c.fecha_vencimiento || '',
                  fecha_aviso: c.fecha_aviso || '',
                  modalidad: (c.modalidad as ModalidadPago) || ModalidadPago.VENCIDO,
                  estado: (c.estado as EstadoCuota) || EstadoCuota.EN_ESPERA,
                  comprobante: c.comprobante || '',
                  pago_en_dolares: Boolean(c.pago_en_dolares),
                  monto_usd: c.monto_usd !== undefined && c.monto_usd !== null ? c.monto_usd : '',
                  cotizacion_usd: c.cotizacion_usd !== undefined && c.cotizacion_usd !== null ? c.cotizacion_usd : '',
                });
              }
            });

            setCuotas(rawCuotas);
            setEntregables(rawEntregables);

            if (rawEntregables.length > 0 && rawCuotas.length === 0) {
              setGeneradorModo('ENTREGABLES');
            } else {
              setGeneradorModo('CUOTAS');
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar datos de financiación:', err);
        alert('Error al cargar los datos de la financiación.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Helper para extraer de forma robusta e infalible el ID de la empresa de un proyecto
  const getEmpresaIdFromProyecto = (p?: Proyecto | null): string | null => {
    if (!p) return null;
    if (typeof p.empresa === 'string') return p.empresa;
    if (p.empresa && typeof p.empresa === 'object' && 'id' in p.empresa) return (p.empresa as any).id;
    if (p.empresa_id) return p.empresa_id;
    return null;
  };

  // Filtrado de proyectos por empresa seleccionada
  const proyectosFiltrados = useMemo(() => {
    if (!empresaId) return proyectos;
    return proyectos.filter(p => {
      const pEmpresaId = getEmpresaIdFromProyecto(p);
      return pEmpresaId === empresaId;
    });
  }, [proyectos, empresaId]);

  const handleEmpresaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEmpresaId = e.target.value;
    setEmpresaId(newEmpresaId);

    if (newEmpresaId && proyectoId) {
      const currentProj = proyectos.find(p => p.id === proyectoId);
      const currentProjEmpresaId = getEmpresaIdFromProyecto(currentProj);
      if (currentProjEmpresaId && currentProjEmpresaId !== newEmpresaId) {
        setProyectoId('');
      }
    }
  };

  const handleProyectoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjId = e.target.value;
    setProyectoId(newProjId);

    if (newProjId) {
      const selectedProj = proyectos.find(p => p.id === newProjId);
      const projEmpresaId = getEmpresaIdFromProyecto(selectedProj);
      if (projEmpresaId && (!empresaId || empresaId !== projEmpresaId)) {
        setEmpresaId(projEmpresaId);
      }
    }
  };

  // Generador Automático de Cuotas (calcula el último lunes hábil)
  const handleGenerarCuotas = () => {
    const monto = parseFloat(montoTotal);
    if (isNaN(monto) || monto <= 0) {
      alert('Ingrese primero un Monto Total válido en los Aspectos Generales.');
      return;
    }
    if (genCantidad < 1) {
      alert('La cantidad de cuotas debe ser al menos 1.');
      return;
    }

    let baseDate = genFechaInicio ? new Date(genFechaInicio + 'T00:00:00') : new Date();
    if (isNaN(baseDate.getTime())) baseDate = new Date();

    const startYear = baseDate.getFullYear();
    const startMonth = baseDate.getMonth();

    const cuotaBase = Math.floor((monto / genCantidad) * 100) / 100;
    const resto = Number((monto - (cuotaBase * genCantidad)).toFixed(2));

    const nuevasCuotas: CuotaItemState[] = [];
    const cotizInicial = isDolaresGeneralActivo 
      ? (parseFloat(cotizacionGeneral) || 1250) 
      : (genEnDolares ? (parseFloat(genCotizacionUsd) || 1250) : 0);
    const usaDolares = isDolaresGeneralActivo || (genEnDolares && cotizInicial > 0);

    for (let i = 0; i < genCantidad; i++) {
      const targetDate = new Date(startYear, startMonth + i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      // Cálculo de fecha de aviso: Último lunes hábil de mes
      const fechaAviso = getUltimoLunesDelMes(year, month);
      
      // Fecha de pago pactada: fin de mes o día base
      const ultimoDiaMes = new Date(year, month + 1, 0).getDate();
      const diaPago = Math.min(baseDate.getDate() || 10, ultimoDiaMes);
      const fechaPago = `${year}-${String(month + 1).padStart(2, '0')}-${String(diaPago).padStart(2, '0')}`;

      const montoCuota = (i === genCantidad - 1) ? Number((cuotaBase + resto).toFixed(2)) : cuotaBase;
      const cuotaUsd = (usaDolares && cotizInicial > 0) ? Number((montoCuota / cotizInicial).toFixed(2)) : '';

      nuevasCuotas.push({
        tempId: `gen-cuota-${Date.now()}-${i}-${Math.random()}`,
        numero_cuota: i + 1,
        monto: montoCuota,
        fecha_pago: fechaPago,
        fecha_aviso: fechaAviso,
        modalidad: ModalidadPago.VENCIDO,
        estado: EstadoCuota.EN_ESPERA,
        comprobante: '',
        pago_en_dolares: usaDolares && Boolean(cuotaUsd),
        monto_usd: cuotaUsd,
        cotizacion_usd: cotizInicial > 0 ? cotizInicial : (cotizacionGeneral || '1250'),
      });
    }

    setCuotas(nuevasCuotas);
  };

  const handleAddManualCuota = () => {
    const nextNum = cuotas.length + 1;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const fechaAviso = getUltimoLunesDelMes(year, month);
    const fechaPago = today.toISOString().split('T')[0];

    setCuotas(prev => [
      ...prev,
      {
        tempId: `manual-cuota-${Date.now()}-${Math.random()}`,
        numero_cuota: nextNum,
        monto: '',
        fecha_pago: fechaPago,
        fecha_aviso: fechaAviso,
        modalidad: ModalidadPago.VENCIDO,
        estado: EstadoCuota.EN_ESPERA,
        comprobante: '',
        pago_en_dolares: false,
        monto_usd: '',
        cotizacion_usd: cotizacionGeneral || '1250',
      }
    ]);
  };

  const handleCuotaChange = (index: number, field: keyof CuotaItemState, value: any) => {
    setCuotas(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated: CuotaItemState = { ...item, [field]: value };

      if (field === 'monto_usd') {
        const usd = parseFloat(value);
        const currentCotiz = parseFloat(String(item.cotizacion_usd || cotizacionGeneral || '1250')) || 1250;
        if (!item.cotizacion_usd) {
          updated.cotizacion_usd = cotizacionGeneral || '1250';
        }
        if (!isNaN(usd) && usd > 0 && currentCotiz > 0) {
          // REGLA: Si el usuario completa el campo dólares (> 0), automáticamente se rellena montoEnPesos
          updated.monto = Number((usd * currentCotiz).toFixed(2));
          updated.pago_en_dolares = true;
        } else if (!value || isNaN(usd) || usd === 0) {
          // REGLA: Si no se completa o es igual a 0, el usuario puede completarlo por su cuenta
          updated.pago_en_dolares = false;
        }
      } else if (field === 'cotizacion_usd') {
        const cotiz = parseFloat(value);
        const usd = parseFloat(String(item.monto_usd));
        if (!isNaN(cotiz) && cotiz > 0 && !isNaN(usd) && usd > 0) {
          updated.monto = Number((usd * cotiz).toFixed(2));
        }
      } else if (field === 'monto') {
        // Cuando no está en dólares o dólares es 0, el usuario completa el monto por su cuenta
        updated.monto = value;
      } else if (field === 'pago_en_dolares') {
        if (value === true) {
          const cotiz = parseFloat(String(item.cotizacion_usd || cotizacionGeneral || '1250')) || 1250;
          updated.cotizacion_usd = cotiz;
          const currentMonto = parseFloat(String(item.monto));
          if ((!item.monto_usd || Number(item.monto_usd) === 0) && !isNaN(currentMonto) && currentMonto > 0) {
            updated.monto_usd = Number((currentMonto / cotiz).toFixed(2));
          } else if (item.monto_usd && Number(item.monto_usd) > 0) {
            updated.monto = Number((Number(item.monto_usd) * cotiz).toFixed(2));
          }
        } else {
          updated.pago_en_dolares = false;
        }
      }

      return updated;
    }));
  };

  const handleCuotaModalidadChange = (index: number, newModalidad: ModalidadPago) => {
    setCuotas(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        modalidad: newModalidad,
        estado: newModalidad === ModalidadPago.ADELANTADO ? EstadoCuota.PAGADO : item.estado
      };
    }));
  };

  const handleRemoveCuota = (index: number) => {
    setCuotas(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((c, i) => ({ ...c, numero_cuota: i + 1 }));
    });
  };

  // Manejo de Entregables
  const handleAddEntregable = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const fechaAviso = getUltimoLunesDelMes(today.getFullYear(), today.getMonth());
    setEntregables(prev => [
      ...prev,
      {
        tempId: `entregable-${Date.now()}-${Math.random()}`,
        entregable: '',
        detalle: '',
        monto: '',
        monto_pagado: 0,
        fecha_pago: todayStr,
        fecha_aviso: fechaAviso,
        modalidad: ModalidadPago.VENCIDO,
        estado: EstadoCuota.EN_ESPERA,
      }
    ]);
  };

  const handleEntregableChange = (index: number, field: keyof EntregableItemState, value: any) => {
    setEntregables(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleEntregableModalidadChange = (index: number, newModalidad: ModalidadPago) => {
    setEntregables(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        modalidad: newModalidad,
        estado: newModalidad === ModalidadPago.ADELANTADO ? EstadoCuota.PAGADO : item.estado
      };
    }));
  };

  const handleRemoveEntregable = (index: number) => {
    setEntregables(prev => prev.filter((_, idx) => idx !== index));
  };

  // Totales y Balances unificados (ambos tipos a la vez)
  const totalMontoAcordado = parseFloat(montoTotal) || 0;
  const totalCuotas = Number(cuotas.reduce((acc, c) => acc + (Number(c.monto) || 0), 0).toFixed(2));
  const totalEntregables = Number(entregables.reduce((acc, e) => acc + (Number(e.monto) || 0), 0).toFixed(2));
  const totalPlanificado = Number((totalCuotas + totalEntregables).toFixed(2));
  const diferenciaBalance = Number((totalMontoAcordado - totalPlanificado).toFixed(2));

  // Conteo unificado de estados (ambos tipos)
  const conteoEstados = useMemo(() => {
    const todos = [
      ...cuotas.map(c => ({ estado: c.estado })),
      ...entregables.map(e => ({ estado: e.estado }))
    ];
    return {
      pagados: todos.filter(i => i.estado === EstadoCuota.PAGADO).length,
      enEspera: todos.filter(i => i.estado === EstadoCuota.EN_ESPERA).length,
      verificandose: todos.filter(i => i.estado === EstadoCuota.VERIFICANDOSE).length,
      impagos: todos.filter(i => i.estado === EstadoCuota.IMPAGO).length,
      total: todos.length
    };
  }, [cuotas, entregables]);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaId) {
      alert('Debe seleccionar una Empresa.');
      return;
    }
    if (!proyectoId) {
      alert('Debe seleccionar un Proyecto.');
      return;
    }
    if (isNaN(totalMontoAcordado) || totalMontoAcordado <= 0) {
      alert('Debe ingresar un Monto Total válido mayor a cero.');
      return;
    }
    if (!fechaAcuerdo) {
      alert('Debe seleccionar la Fecha del Acuerdo.');
      return;
    }
    if (tipoTrabajo === TipoTrabajoFinanciacion.OTRO && !tipoTrabajoOtro.trim()) {
      alert('Debe especificar el Tipo de Trabajo.');
      return;
    }

    if (cuotas.length === 0 && entregables.length === 0) {
      alert('Debe generar o registrar al menos un pago (por cuotas o por entregables).');
      return;
    }

    // Validar cuotas
    for (const c of cuotas) {
      const cMonto = Number(c.monto);
      if (isNaN(cMonto) || cMonto <= 0) {
        alert(`La Cuota #${c.numero_cuota} tiene un monto inválido.`);
        return;
      }
      if (!c.fecha_pago) {
        alert(`La Cuota #${c.numero_cuota} debe tener una fecha de pago.`);
        return;
      }
    }

    // Validar entregables
    for (let i = 0; i < entregables.length; i++) {
      const ent = entregables[i];
      if (!ent.entregable.trim()) {
        alert(`El entregable #${i + 1} debe tener un título o hito definido.`);
        return;
      }
      const eMonto = Number(ent.monto);
      if (isNaN(eMonto) || eMonto <= 0) {
        alert(`El entregable "${ent.entregable}" tiene un monto inválido.`);
        return;
      }
    }

    // Unificar lista completa de pagos para guardar
    const cuotasPayload = [
      ...cuotas.map((c, idx) => ({
        id: c.id,
        tipo_pago: 'CUOTA',
        numero_cuota: idx + 1,
        monto: Number(c.monto),
        moneda: moneda,
        fecha_pago: c.fecha_pago || null,
        fecha_vencimiento: c.fecha_pago || null,
        fecha_aviso: c.fecha_aviso || null,
        modalidad: c.modalidad,
        estado: c.modalidad === ModalidadPago.ADELANTADO ? EstadoCuota.PAGADO : c.estado,
        comprobante: c.comprobante || null,
        pago_en_dolares: Boolean(c.pago_en_dolares),
        monto_usd: c.pago_en_dolares && c.monto_usd !== '' ? Number(c.monto_usd) : null,
        cotizacion_usd: c.pago_en_dolares && c.cotizacion_usd !== '' ? Number(c.cotizacion_usd) : null,
      })),
      ...entregables.map((e) => ({
        id: e.id,
        tipo_pago: 'ENTREGABLE',
        entregable: e.entregable.trim(),
        detalle: e.detalle ? e.detalle.trim() : null,
        monto: Number(e.monto),
        monto_pagado: Number(e.monto_pagado) || 0,
        moneda: moneda,
        fecha_pago: e.fecha_pago || null,
        fecha_vencimiento: e.fecha_pago || null,
        fecha_aviso: e.fecha_aviso || null,
        modalidad: e.modalidad,
        estado: e.modalidad === ModalidadPago.ADELANTADO ? EstadoCuota.PAGADO : e.estado,
      }))
    ];

    const payload: any = {
      empresa: empresaId,
      proyecto: proyectoId,
      tipo_trabajo: tipoTrabajo,
      tipo_trabajo_otro: tipoTrabajo === TipoTrabajoFinanciacion.OTRO ? tipoTrabajoOtro.trim() : null,
      monto_total: totalMontoAcordado,
      monto_usd: isDolaresGeneralActivo ? Number(dolaresGeneral) : null,
      cotizacion_usd: isDolaresGeneralActivo && cotizacionGeneral ? Number(cotizacionGeneral) : null,
      moneda: moneda,
      forma_pago: formaPago,
      cantidad_cuotas: cuotas.length > 0 ? cuotas.length : null,
      detalle_entregables: entregables.length > 0 ? entregables.map(e => e.entregable).join('; ') : null,
      fecha_acuerdo: fechaAcuerdo,
      notas: notas.trim() || null,
      aviso_email_empresa: avisoEmailEmpresa,
      recordatorio_verificar_cobro: recordatorioVerificarCobro,
      cuotas: cuotasPayload,
    };

    try {
      setSaving(true);
      if (isEditing) {
        await financiacionApi.update(id!, payload);
        alert('Plan de Financiación actualizado correctamente.');
      } else {
        await financiacionApi.create(payload);
        alert('Plan de Financiación registrado exitosamente.');
      }
      await queryClient.invalidateQueries({ queryKey: ['metricas-financieras-proyectos'] });
      await queryClient.invalidateQueries({ queryKey: ['metricas-resumen-financiero'] });
      await queryClient.invalidateQueries({ queryKey: ['financiacion'] });
      await queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      navigate('/financiacion');
    } catch (err: any) {
      console.error('Error al guardar la financiación:', err);
      let errorMsg = 'Error al guardar el plan de financiación.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          errorMsg = Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
        }
      }
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const totalPagosRegistrados = cuotas.length + entregables.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/financiacion" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar Plan de Financiación' : 'Nuevo Plan de Financiación'}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-7">
            Configure los aspectos generales del acuerdo y gestione los pagos generados con sus estados respectivos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* BLOQUE 1: ASPECTOS GENERALES */}
        <Card className="p-6 border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-primary-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">1. Aspectos Generales del Acuerdo</h2>
              <p className="text-xs text-gray-500">Definición de empresa cliente, proyecto vinculado, valores y términos comerciales.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary-500" />
                Empresa <span className="text-red-500">*</span>
              </label>
              <Select
                value={empresaId}
                onChange={handleEmpresaChange}
                required
              >
                <option value="">Seleccione una Empresa...</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre_comercial || emp.razon_social} (CUIT: {emp.cuit})
                  </option>
                ))}
              </Select>
              <span className="text-xs text-gray-400 mt-1 block">Los proyectos disponibles se filtran según la empresa seleccionada.</span>
            </div>

            {/* Proyecto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4 text-primary-500" />
                Proyecto Vinculado <span className="text-red-500">*</span>
              </label>
              <Select
                value={proyectoId}
                onChange={handleProyectoChange}
                required
              >
                <option value="">
                  {empresaId ? 'Seleccione un Proyecto...' : 'Seleccione un Proyecto (o filtre por Empresa)...'}
                </option>
                {proyectosFiltrados.map(p => {
                  const empObj = empresas.find(e => e.id === getEmpresaIdFromProyecto(p));
                  const empNombre = p.empresa_nombre_comercial || p.empresa_razon_social || empObj?.nombre_comercial || empObj?.razon_social;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {empNombre ? `(${empNombre})` : ''}
                    </option>
                  );
                })}
              </Select>
              {empresaId && proyectosFiltrados.length === 0 && (
                <span className="text-xs text-amber-600 mt-1 block">
                  Esta empresa no tiene proyectos registrados.
                </span>
              )}
            </div>

            {/* Tipo de Trabajo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo de Trabajo <span className="text-red-500">*</span>
              </label>
              <Select
                value={tipoTrabajo}
                onChange={(e) => setTipoTrabajo(e.target.value as TipoTrabajoFinanciacion)}
                options={TIPOS_TRABAJO_OPTIONS}
                required
              />
            </div>

            {/* Si es Otro: Especificar */}
            {tipoTrabajo === TipoTrabajoFinanciacion.OTRO && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Especificar Tipo de Trabajo <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={tipoTrabajoOtro}
                  onChange={(e) => setTipoTrabajoOtro(e.target.value)}
                  placeholder="Ej: Auditoría, Mantenimiento de Infraestructura..."
                  required
                />
              </div>
            )}

            {/* Campo Dólares (USD) - Automatización */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Monto en Dólares (USD) <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                </span>
                {isDolaresGeneralActivo && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Regla Activa
                  </span>
                )}
              </label>
              <Input
                type="number"
                value={dolaresGeneral}
                onChange={(e) => handleDolaresGeneralChange(e.target.value)}
                placeholder="Ej: 2500.00 (opcional)"
                min="0"
                step="0.01"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Si completa este campo, se calcula y rellena automáticamente el campo <strong>Monto en Pesos</strong>.
              </span>
            </div>

            {/* Cotización USD */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-primary-600" />
                Cotización USD (ARS por dólar)
              </label>
              <Input
                type="number"
                value={cotizacionGeneral}
                onChange={(e) => handleCotizacionGeneralChange(e.target.value)}
                placeholder="Ej: 1250.00"
                min="0.01"
                step="0.01"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Tipo de cambio para la conversión automática a pesos.
              </span>
            </div>

            {/* Monto Total en Pesos (montoEnPesos) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Monto Total en Pesos (ARS) <span className="text-red-500">*</span>
                </span>
                {isDolaresGeneralActivo ? (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-calculado
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400 font-normal">
                    Completar por cuenta propia
                  </span>
                )}
              </label>
              <Input
                type="number"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value)}
                placeholder="Ej: 350000.00"
                min="0.01"
                step="0.01"
                required
                readOnly={isDolaresGeneralActivo}
                className={isDolaresGeneralActivo ? 'bg-emerald-50/70 border-emerald-300 font-bold text-emerald-950 cursor-not-allowed' : ''}
              />
              {isDolaresGeneralActivo ? (
                <div className="flex flex-wrap items-center justify-between mt-1 text-[11px] text-emerald-700 font-medium gap-1">
                  <span>
                    ⚡ Rellenado automáticamente: ${Number(dolaresGeneral).toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD × ${Number(cotizacionGeneral).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDolaresGeneralChange('')}
                    className="text-primary-600 underline hover:text-primary-800"
                  >
                    Borrar dólares para completar pesos por cuenta propia
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-gray-500 mt-1 block">
                  💡 Como el campo dólar no está completo o es igual a 0, puede completar el monto en pesos por su cuenta.
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Moneda <span className="text-red-500">*</span>
              </label>
              <Select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                options={MONEDAS}
                required
              />
            </div>

            {/* Fecha de Acuerdo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                Fecha del Acuerdo <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={fechaAcuerdo}
                onChange={(e) => setFechaAcuerdo(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notas Adicionales */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notas y Observaciones Adicionales (Opcional)
            </label>
            <TextArea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles sobre cuentas bancarias, condiciones comerciales especiales, retenciones..."
            />
          </div>

          {/* Notificaciones y Avisos */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary-600" />
              Notificaciones y Avisos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={avisoEmailEmpresa}
                  onChange={(e) => setAvisoEmailEmpresa(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary-600" />
                    Enviar aviso previo por correo a la empresa
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Notifica por email a los contactos de la empresa con antelación a cada fecha de aviso / cobro.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={recordatorioVerificarCobro}
                  onChange={(e) => setRecordatorioVerificarCobro(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-primary-600" />
                    Enviar mensaje de recordatorio para verificar cobro
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Alerta interna para que el personal verifique la acreditación efectiva de los pagos.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* BLOQUE 2: MODELO DE EJECUCIÓN Y DETALLE DE PAGOS */}
        <Card className="p-6 border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">2. Modelo de Ejecución y Detalle de Pagos</h2>
              <p className="text-xs text-gray-500">
                Seleccione el modelo para generar o registrar pagos (<strong>elija solo uno a la vez en este panel</strong>). Todos los pagos generados se listarán conjuntamente abajo.
              </p>
            </div>
          </div>

          {/* SELECTOR EXCLUSIVO DEL GENERADOR A USAR (No las dos a la vez) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Opción A: Generar Cuotas */}
            <div
              onClick={() => setGeneradorModo('CUOTAS')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                generadorModo === 'CUOTAS'
                  ? 'border-primary-600 bg-primary-50/40 shadow-sm ring-2 ring-primary-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    generadorModo === 'CUOTAS' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Crear / Generar Cuotas</h3>
                    <span className="text-xs text-gray-500">Generar Plan Automático o Cuotas Manuales</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="generadorModo"
                  checked={generadorModo === 'CUOTAS'}
                  onChange={() => setGeneradorModo('CUOTAS')}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Opción B: Generar por Entregables */}
            <div
              onClick={() => setGeneradorModo('ENTREGABLES')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                generadorModo === 'ENTREGABLES'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    generadorModo === 'ENTREGABLES' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Generar Plan por Entregables / Hitos</h3>
                    <span className="text-xs text-gray-500">Pagos por entregas técnicas</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="generadorModo"
                  checked={generadorModo === 'ENTREGABLES'}
                  onChange={() => setGeneradorModo('ENTREGABLES')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* PANEL ACTIVO SEGÚN EL MODO ELEGIDO */}
          {generadorModo === 'CUOTAS' ? (
            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Generar Plan Automático de Cuotas (Último Lunes Hábil)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad de Cuotas</label>
                    <Input
                      type="number"
                      min="1"
                      value={genCantidad}
                      onChange={(e) => setGenCantidad(parseInt(e.target.value) || 1)}
                      placeholder="Ej: 3, 6, 12..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Inicio / Mes</label>
                    <Input
                      type="date"
                      value={genFechaInicio}
                      onChange={(e) => setGenFechaInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleGenerarCuotas}
                      className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generar Plan Automático
                    </Button>
                  </div>
                </div>

                {/* Opción opcional de cobro en USD para el generador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genEnDolares}
                        onChange={(e) => setGenEnDolares(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        💵 Habilitar cobro en Dólares (USD)
                      </span>
                    </label>
                    {genEnDolares && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Cotización inicial estimada:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={genCotizacionUsd}
                          onChange={(e) => setGenCotizacionUsd(e.target.value)}
                          placeholder="Ej: 1250.00"
                          className="w-28 px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddManualCuota}
                    className="flex items-center gap-1.5 text-xs self-end sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Añadir Cuota Manual
                  </Button>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60">
                  <p className="text-[11px] text-gray-500">
                    💡 Divide el monto acordado equitativamente y calcula la <strong>fecha de aviso como el último lunes hábil de cada mes</strong>. Cada cuota puede configurarse en USD y cotización de forma independiente en la tabla inferior.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    Plan por Entregables / Hitos
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Haga clic en el botón para agregar cada entregable con su monto convenido, fecha y estado de cobro.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddEntregable}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  + Añadir Entregable / Hito
                </Button>
              </div>
            </div>
          )}

          {/* LISTADO DE PAGOS GENERADOS Y SUS ESTADOS (MUESTRA AMBOS TIPOS A LA VEZ) */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-primary-600" />
                  Listado de Pagos Generados y sus Estados
                </h3>
                <p className="text-xs text-gray-500">
                  Visualización consolidada de <strong>todas las cuotas y entregables programados</strong> con sus importes, modalidades y estados.
                </p>
              </div>

              {/* Resumen vivo de estados para ambos tipos */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {conteoEstados.pagados} Pagados
                </span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {conteoEstados.enEspera} En espera
                </span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  {conteoEstados.verificandose} Verificándose
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {conteoEstados.impagos} Impagos
                </span>
              </div>
            </div>

            {/* TABLA CONSOLIDADA QUE MUESTRA AMBOS TIPOS A LA VEZ */}
            {totalPagosRegistrados === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No hay pagos generados todavía</p>
                <p className="text-xs text-gray-500 mt-1">
                  Utilice el panel superior para <strong>generar cuotas</strong> o <strong>añadir entregables</strong>. Aparecerán aquí conjuntamente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-xs">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-slate-50 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 text-left w-24">Tipo / #</th>
                      <th className="px-3 py-3 text-left min-w-[160px]">Concepto / Identificador</th>
                      <th className="px-3 py-3 text-left min-w-[140px]">Detalle / Comprobante</th>
                      <th className="px-3 py-3 text-left min-w-[230px]">Cobro en Dólares (USD)</th>
                      <th className="px-3 py-3 text-left w-36">Monto ({moneda})</th>
                      <th className="px-3 py-3 text-left w-36">Fecha Pago</th>
                      <th className="px-3 py-3 text-left w-36">
                        Fecha Aviso <span className="font-normal text-[10px] text-primary-600">(Último Lunes)</span>
                      </th>
                      <th className="px-3 py-3 text-left w-40">Modalidad</th>
                      <th className="px-3 py-3 text-left w-44">Estado del Pago</th>
                      <th className="px-3 py-3 text-center w-12">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* 1. FILAS DE CUOTAS */}
                    {cuotas.map((c, index) => {
                      const isAdelantado = c.modalidad === ModalidadPago.ADELANTADO;
                      return (
                        <tr key={c.tempId} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Cuota #{c.numero_cuota}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-gray-800">
                            Cuota Mensual #{c.numero_cuota}
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="text"
                              value={c.comprobante || ''}
                              onChange={(e) => handleCuotaChange(index, 'comprobante', e.target.value)}
                              placeholder="Nº Transf. o Ref."
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="space-y-1.5 min-w-[210px]">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(c.pago_en_dolares)}
                                  onChange={(e) => handleCuotaChange(index, 'pago_en_dolares', e.target.checked)}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <span className={c.pago_en_dolares ? "text-emerald-700 font-bold" : "text-gray-500"}>
                                  💵 En Dólares (USD)
                                </span>
                              </label>
                              {c.pago_en_dolares && (
                                <div className="grid grid-cols-2 gap-1.5 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                                  <div>
                                    <span className="block text-[10px] text-gray-500 font-medium">USD</span>
                                    <div className="relative">
                                      <span className="absolute left-1.5 top-1 text-gray-400 text-xs font-bold">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={c.monto_usd ?? ''}
                                        onChange={(e) => handleCuotaChange(index, 'monto_usd', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-4 pr-1 py-1 text-xs border border-emerald-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white font-semibold text-emerald-900"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] text-gray-500 font-medium">Cotización</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      value={c.cotizacion_usd ?? ''}
                                      onChange={(e) => handleCuotaChange(index, 'cotizacion_usd', e.target.value)}
                                      placeholder="Ej: 1250"
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 bg-white"
                                    />
                                  </div>
                                </div>
                              )}
                              {c.pago_en_dolares && Number(c.monto_usd) > 0 && Number(c.cotizacion_usd) > 0 && (
                                <div className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-center font-medium">
                                  ${Number(c.monto_usd).toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD × {Number(c.cotizacion_usd).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {(() => {
                              const usdNum = parseFloat(String(c.monto_usd));
                              const isCuotaDolarValido = Boolean(
                                c.pago_en_dolares && 
                                String(c.monto_usd).trim() !== '' && 
                                !isNaN(usdNum) && 
                                usdNum > 0
                              );
                              return (
                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={c.monto}
                                    onChange={(e) => handleCuotaChange(index, 'monto', e.target.value)}
                                    className={`text-xs font-semibold ${
                                      isCuotaDolarValido 
                                        ? 'bg-emerald-50/70 border-emerald-300 font-bold text-emerald-950 cursor-not-allowed' 
                                        : ''
                                    }`}
                                    readOnly={isCuotaDolarValido}
                                    placeholder="0.00"
                                    required
                                  />
                                  {isCuotaDolarValido ? (
                                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                                      ⚡ Auto: ${usdNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 block mt-0.5">
                                      Completar por cuenta propia
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="date"
                              value={c.fecha_pago}
                              onChange={(e) => handleCuotaChange(index, 'fecha_pago', e.target.value)}
                              className="text-xs"
                              required
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="date"
                              value={c.fecha_aviso}
                              onChange={(e) => handleCuotaChange(index, 'fecha_aviso', e.target.value)}
                              className="text-xs bg-blue-50 border-blue-200 font-medium text-blue-900"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={c.modalidad}
                              onChange={(e) => handleCuotaModalidadChange(index, e.target.value as ModalidadPago)}
                              className="text-xs"
                            >
                              {MODALIDADES_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            {isAdelantado ? (
                              <div className="flex items-center gap-1 py-1">
                                <Badge variant="success">Pagado (Adelantado)</Badge>
                              </div>
                            ) : (
                              <Select
                                value={c.estado}
                                onChange={(e) => handleCuotaChange(index, 'estado', e.target.value as EstadoCuota)}
                                className="text-xs"
                              >
                                {ESTADOS_PAGO_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </Select>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveCuota(index)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                              title="Eliminar cuota"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* 2. FILAS DE ENTREGABLES */}
                    {entregables.map((ent, index) => {
                      const isAdelantado = ent.modalidad === ModalidadPago.ADELANTADO;
                      return (
                        <tr key={ent.tempId} className="hover:bg-emerald-50/30 transition-colors bg-emerald-50/10">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Hito #{index + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="text"
                              value={ent.entregable}
                              onChange={(e) => handleEntregableChange(index, 'entregable', e.target.value)}
                              placeholder="Ej: Entrega de Prototipo UI"
                              className="text-xs font-semibold"
                              required
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="text"
                              value={ent.detalle}
                              onChange={(e) => handleEntregableChange(index, 'detalle', e.target.value)}
                              placeholder="Alcance o especificación..."
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-400 text-xs">
                            <span className="text-gray-300">—</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={ent.monto}
                              onChange={(e) => handleEntregableChange(index, 'monto', e.target.value)}
                              placeholder="0.00"
                              className="text-xs font-semibold"
                              required
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="date"
                              value={ent.fecha_pago}
                              onChange={(e) => handleEntregableChange(index, 'fecha_pago', e.target.value)}
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="date"
                              value={ent.fecha_aviso || ''}
                              onChange={(e) => handleEntregableChange(index, 'fecha_aviso', e.target.value)}
                              className="text-xs bg-emerald-50 border-emerald-200 font-medium text-emerald-900"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={ent.modalidad}
                              onChange={(e) => handleEntregableModalidadChange(index, e.target.value as ModalidadPago)}
                              className="text-xs"
                            >
                              {MODALIDADES_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            {isAdelantado ? (
                              <div className="flex items-center gap-1 py-1">
                                <Badge variant="success">Pagado (Adelantado)</Badge>
                              </div>
                            ) : (
                              <Select
                                value={ent.estado}
                                onChange={(e) => handleEntregableChange(index, 'estado', e.target.value as EstadoCuota)}
                                className="text-xs"
                              >
                                {ESTADOS_PAGO_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </Select>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEntregable(index)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                              title="Eliminar entregable"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* BLOQUE 3: BALANCE Y CONTROL FINANCIERO CONSOLIDADO */}
        <Card className="p-6 border border-gray-200 shadow-sm rounded-xl bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">3. Control y Cuadratura Financiera Consolidada</h2>
              <p className="text-xs text-gray-500">
                Balance global comparativo entre el monto total acordado y la suma de todas las cuotas y entregables generados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-medium text-gray-500 block mb-1">Monto Total Acordado</span>
              <span className="text-lg font-bold text-gray-900">
                {totalMontoAcordado.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-medium text-gray-500 block mb-1">Subtotal en Cuotas ({cuotas.length})</span>
              <span className="text-lg font-bold text-blue-700">
                {totalCuotas.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-medium text-gray-500 block mb-1">Subtotal en Entregables ({entregables.length})</span>
              <span className="text-lg font-bold text-emerald-700">
                {totalEntregables.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-medium text-gray-500 block mb-1">Total Planificado ({totalPagosRegistrados})</span>
              <span className="text-lg font-bold text-indigo-700">
                {totalPlanificado.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}
              </span>
            </div>
          </div>

          {/* Banner de Estado del Balance */}
          {totalMontoAcordado > 0 && (
            <div>
              {diferenciaBalance === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-sm font-bold">¡Plan Financiero Cuadrado al 100%!</span>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      La suma de todas las cuotas y pagos por entregables coincide exactamente con el monto total acordado.
                    </p>
                  </div>
                </div>
              ) : diferenciaBalance > 0 ? (
                <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-sm font-bold">Saldo Pendiente de Asignar</span>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Faltan asignar <strong>{diferenciaBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}</strong> para cubrir el total pactado.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const fechaAviso = getUltimoLunesDelMes(today.getFullYear(), today.getMonth());
                      setCuotas(prev => [
                        ...prev,
                        {
                          tempId: `restante-${Date.now()}`,
                          numero_cuota: prev.length + 1,
                          monto: diferenciaBalance,
                          fecha_pago: today.toISOString().split('T')[0],
                          fecha_aviso: fechaAviso,
                          modalidad: ModalidadPago.VENCIDO,
                          estado: EstadoCuota.EN_ESPERA,
                          comprobante: '',
                        }
                      ]);
                    }}
                    className="text-xs shrink-0"
                  >
                    + Asignar saldo restante como Cuota
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="text-sm font-bold">Monto Planificado Excedido</span>
                    <p className="text-xs text-rose-700 mt-0.5">
                      La suma de pagos supera el monto total acordado por <strong>{Math.abs(diferenciaBalance).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Acciones Inferiores */}
        <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={() => navigate('/financiacion')}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={saving}
            className="flex items-center gap-2 px-6"
          >
            {saving ? <LoadingSpinner /> : <CheckCircle2 className="w-4 h-4" />}
            {isEditing ? 'Guardar Cambios' : 'Registrar Financiación'}
          </Button>
        </div>
      </form>
    </div>
  );
}
