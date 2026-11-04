import React from 'react';
export const DatePicker = React.forwardRef<HTMLInputElement, any>(({ className = '', ...props }, ref) => (
  <input type="date" ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`} {...props} />
));
DatePicker.displayName = 'DatePicker';
