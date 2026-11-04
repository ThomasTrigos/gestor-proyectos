import React from 'react';
export const TextArea = React.forwardRef<HTMLTextAreaElement, any>(({ className = '', ...props }, ref) => (
  <textarea ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`} {...props} />
));
TextArea.displayName = 'TextArea';
export default TextArea;
