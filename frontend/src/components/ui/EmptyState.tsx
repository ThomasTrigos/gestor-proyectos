import React from 'react';
export const EmptyState = ({ message = 'No hay datos disponibles' }: any) => (
  <div className="text-center py-12 text-gray-500">{message}</div>
);
