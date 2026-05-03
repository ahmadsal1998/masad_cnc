interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}

export function FormField({ label, required, children, error }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 mr-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
        error ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
    />
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function TextArea({ className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      rows={3}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition ${className}`}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition ${className}`}
    >
      {children}
    </select>
  );
}
