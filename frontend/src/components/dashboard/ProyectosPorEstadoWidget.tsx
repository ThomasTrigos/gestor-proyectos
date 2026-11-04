import React, { useEffect, useState } from 'react';
import { getProyectosPorEstado, ProyectoPorEstado } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ESTADO_PROYECTO_LABELS, EstadoProyectoEnum } from '../../types';

// OPORTUNIDAD, TRABAJANDO, PAUSADO, SEGUIMIENTO, CONCRETADO, CAIDO
const COLORS = {
  'OPORTUNIDAD': '#3b82f6', // blue
  'TRABAJANDO': '#22c55e', // green
  'PAUSADO': '#eab308', // yellow
  'SEGUIMIENTO': '#8b5cf6', // purple / violet
  'CONCRETADO': '#10b981', // emerald
  'CAIDO': '#ef4444', // red
};

const ProyectosPorEstadoWidget: React.FC = () => {
  const [data, setData] = useState<ProyectoPorEstado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProyectosPorEstado().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8 h-80"><LoadingSpinner /></Card>;

  const chartData = data.map(d => ({
    name: ESTADO_PROYECTO_LABELS[d.estado as EstadoProyectoEnum] || d.estado,
    value: d.cantidad,
    color: COLORS[d.estado as keyof typeof COLORS] || '#8884d8'
  }));

  return (
    <Card className="p-4 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Proyectos por Estado</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ProyectosPorEstadoWidget;
