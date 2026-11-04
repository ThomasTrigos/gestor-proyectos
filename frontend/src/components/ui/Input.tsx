import React from 'react';
export const Input = React.forwardRef<HTMLInputElement, any>(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`} {...props} />
));
Input.displayName = 'Input';
export default Input;
