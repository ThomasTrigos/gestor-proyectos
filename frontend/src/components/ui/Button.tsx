import React from 'react';
export const Button = ({ children, className = '', ...props }: any) => (
  <button className={`px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition ${className}`} {...props}>
    {children}
  </button>
);
export default Button;
