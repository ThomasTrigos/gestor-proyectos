import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProyectoKanban from '../../components/kanban/ProyectoKanban';

export const ProyectoKanbanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="p-8 text-center text-gray-500">ID de proyecto no especificado.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to={`/proyectos/${id}`}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a la ficha del proyecto
        </Link>
      </div>

      <ProyectoKanban proyectoId={id} />
    </div>
  );
};

export default ProyectoKanbanPage;
