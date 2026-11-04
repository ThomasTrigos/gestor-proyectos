import React, { useEffect, useState } from 'react';
import { getResumenFinanciero, ResumenFinanciero } from '../../api/metricas';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

const ResumenFinancieroWidget: React.FC = () => {
  const [data, setData] = useState<ResumenFinanciero[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResumenFinanciero().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="flex justify-center p-8 h-80"><LoadingSpinner /></Card>;

  return (
    <Card className="p-4 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Resumen Financiero</h3>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Moneda</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acordado</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cobrado</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.moneda}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.moneda}</td>
                <td className="px-4 py-3 text-right text-gray-500">{row.total_acordado.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-green-600">{row.total_cobrado.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-orange-600">{row.total_pendiente.toLocaleString()}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-gray-500">Sin datos financieros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ResumenFinancieroWidget;
