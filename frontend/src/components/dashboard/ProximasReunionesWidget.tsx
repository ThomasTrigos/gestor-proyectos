import React, { useEffect, useState } from 'react';
import { getProximasReuniones, ProximaReunion } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Calendar, Video, MapPin, Phone } from 'lucide-react';

const ProximasReunionesWidget: React.FC = () => {
  const [data, setData] = useState<ProximaReunion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProximasReuniones().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8 h-80"><LoadingSpinner /></Card>;

  return (
    <Card className="p-4 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Próximas Reuniones</h3>
      <div className="flex-1 overflow-auto space-y-3">
        {data.map((r) => (
          <div key={r.id} className="border-l-4 border-primary-500 bg-gray-50 p-3 rounded-r">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-gray-900 line-clamp-1">{r.motivo}</h4>
              <span className="text-xs font-semibold text-primary-600 whitespace-nowrap ml-2">
                {new Date(r.fecha_hora).toLocaleDateString('es-ES')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{r.proyecto_nombre} - {r.empresa_nombre}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              {r.modalidad === 'VIRTUAL' ? <Video size={14} /> : r.modalidad === 'PRESENCIAL' ? <MapPin size={14} /> : <Phone size={14} />}
              <span>{r.modalidad}</span>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No hay reuniones próximas</p>
        )}
      </div>
    </Card>
  );
};

export default ProximasReunionesWidget;
