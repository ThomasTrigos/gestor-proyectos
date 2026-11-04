import React, { useEffect, useState } from 'react';
import { getTareasPorProgramador, TareaPorProgramador } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TareasPorProgramadorWidget: React.FC = () => {
  const [data, setData] = useState<TareaPorProgramador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTareasPorProgramador().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8 h-80"><LoadingSpinner /></Card>;

  const chartData = data.map(d => ({
    name: `${d.nombre} ${d.apellido[0]}.`,
    Pendientes: d.pendientes,
    'En Progreso': d.en_progreso,
    Completadas: d.completadas
  }));

  return (
    <Card className="p-4 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Tareas por Programador</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Pendientes" stackId="a" fill="#94a3b8" />
            <Bar dataKey="En Progreso" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Completadas" stackId="a" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TareasPorProgramadorWidget;
