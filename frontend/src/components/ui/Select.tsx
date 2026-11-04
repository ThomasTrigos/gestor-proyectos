import React from 'react';
export const Select = React.forwardRef<HTMLSelectElement, any>(({ className = '', children, options, ...props }, ref) => (
  <select ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${className}`} {...props}>
    {options ? options.map((opt: any) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    )) : children}
  </select>
));
Select.displayName = 'Select';
export default Select;
