import React, { useEffect, useState } from 'react';
import { getCargaTrabajo, CargaTrabajo } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CargaTrabajoWidget: React.FC = () => {
  const [data, setData] = useState<CargaTrabajo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCargaTrabajo().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8 h-80"><LoadingSpinner /></Card>;

  const chartData = data.map(d => ({
    name: d.nombre,
    'Proyectos Activos': d.proyectos_activos,
    'Tareas Pendientes': d.tareas_pendientes,
    'Tareas Vencidas': d.tareas_vencidas,
  }));

  return (
    <Card className="p-4 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Carga de Trabajo</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Proyectos Activos" fill="#8b5cf6" />
            <Bar dataKey="Tareas Pendientes" fill="#3b82f6" />
            <Bar dataKey="Tareas Vencidas" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CargaTrabajoWidget;
