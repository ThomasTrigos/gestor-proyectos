import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Página no encontrada</h1>
      <Link to="/" className="text-primary-600 hover:underline">Volver al inicio</Link>
    </div>
  );
}
