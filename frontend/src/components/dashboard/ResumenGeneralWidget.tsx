import React, { useEffect, useState } from 'react';
import { getResumenGeneral, ResumenGeneral } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

const ResumenGeneralWidget: React.FC = () => {
  const [data, setData] = useState<ResumenGeneral | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResumenGeneral().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8"><LoadingSpinner /></Card>;
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4 text-center">
        <h3 className="text-sm font-medium text-gray-500">Total Proyectos</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">{data.total_proyectos}</p>
      </Card>
      <Card className="p-4 text-center">
        <h3 className="text-sm font-medium text-gray-500">Proyectos Activos</h3>
        <p className="mt-2 text-3xl font-bold text-primary-600">{data.proyectos_activos}</p>
      </Card>
      <Card className="p-4 text-center">
        <h3 className="text-sm font-medium text-gray-500">Total Empresas</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">{data.total_empresas}</p>
      </Card>
      <Card className="p-4 text-center">
        <h3 className="text-sm font-medium text-gray-500">Tareas Pendientes</h3>
        <p className="mt-2 text-3xl font-bold text-yellow-600">{data.tareas_pendientes}</p>
      </Card>
    </div>
  );
};

export default ResumenGeneralWidget;
