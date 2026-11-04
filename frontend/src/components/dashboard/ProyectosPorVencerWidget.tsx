import React, { useEffect, useState } from 'react';
import { getProyectosPorVencer, ProyectoPorVencer } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

const ProyectosPorVencerWidget: React.FC = () => {
  const [data, setData] = useState<ProyectoPorVencer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProyectosPorVencer().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8 h-80"><LoadingSpinner /></Card>;

  return (
    <Card className="p-4 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Proyectos por Vencer</h3>
      <div className="flex-1 overflow-auto space-y-3">
        {data.map((p) => (
          <div key={p.id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <h4 className="font-medium text-gray-900">{p.nombre}</h4>
              <p className="text-xs text-gray-500">{p.empresa_nombre}</p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-bold ${p.dias_restantes < 0 ? 'bg-red-100 text-red-800' : p.dias_restantes <= 7 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {p.dias_restantes < 0 ? `Vencido (${Math.abs(p.dias_restantes)}d)` : `${p.dias_restantes} días`}
              </span>
              <p className="text-xs text-gray-500 mt-1">{new Date(p.fecha_estimada_fin).toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No hay proyectos cercanos a vencer</p>
        )}
      </div>
    </Card>
  );
};

export default ProyectosPorVencerWidget;
