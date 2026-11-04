import React from 'react';
export const Badge = ({ children, variant = 'gray' }: any) => {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 border border-gray-200',
    green: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    blue: 'bg-blue-100 text-blue-800 border border-blue-200',
    yellow: 'bg-amber-100 text-amber-800 border border-amber-200',
    orange: 'bg-orange-100 text-orange-800 border border-orange-200',
    red: 'bg-rose-100 text-rose-800 border border-rose-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
  };
  return <span className={`px-2.5 py-0.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${colors[variant] || colors.gray}`}>{children}</span>;
};
export default Badge;
