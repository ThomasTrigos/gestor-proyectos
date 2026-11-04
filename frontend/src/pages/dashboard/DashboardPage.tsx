import React from 'react';
import ResumenGeneralWidget from '../../components/dashboard/ResumenGeneralWidget';
import ProyectosPorEstadoWidget from '../../components/dashboard/ProyectosPorEstadoWidget';
import TareasPorProgramadorWidget from '../../components/dashboard/TareasPorProgramadorWidget';
import ResumenFinancieroWidget from '../../components/dashboard/ResumenFinancieroWidget';
import ProximasReunionesWidget from '../../components/dashboard/ProximasReunionesWidget';
import CargaTrabajoWidget from '../../components/dashboard/CargaTrabajoWidget';
import ProyectosPorVencerWidget from '../../components/dashboard/ProyectosPorVencerWidget';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tablero de Control</h1>
      
      {/* 1. Resumen General */}
      <ResumenGeneralWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Proyectos por Estado */}
        <ProyectosPorEstadoWidget />
        
        {/* 3. Tareas por Programador */}
        <TareasPorProgramadorWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Resumen Financiero */}
        <ResumenFinancieroWidget />

        {/* 5. Próximas Reuniones */}
        <ProximasReunionesWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. Carga de Trabajo */}
        <CargaTrabajoWidget />

        {/* 7. Proyectos por Vencer */}
        <ProyectosPorVencerWidget />
      </div>
    </div>
  );
}
