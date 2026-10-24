'use client';

import React from 'react';
import { Check, ChevronDown, AlertCircle } from 'lucide-react';

// ============================================================================
// 1. Text Input (com suporte a ícones, label flutuante/limpa e estados de erro)
// ============================================================================
export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  badge?: string;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, badge, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {label}
              {props.required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {badge}
              </span>
            )}
          </div>
        )}

        <div
          className={`relative flex items-center rounded-xl border bg-slate-50/70 dark:bg-slate-950/70 transition-all duration-200
            ${
              error
                ? 'border-rose-500/80 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:focus-within:ring-emerald-400/20'
            }
            ${props.disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}
          `}
        >
          {leftIcon && (
            <div className="pl-3.5 pr-1 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors
              ${leftIcon ? 'pl-2' : ''}
              ${rightIcon ? 'pr-2' : ''}
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="pr-3.5 pl-1 text-slate-400 dark:text-slate-500 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs text-rose-500 flex items-center gap-1 font-medium animate-in fade-in duration-150">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

// ============================================================================
// 2. Currency / Number Input (com prefixo elegante e micro-controles)
// ============================================================================
export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  currencyPrefix?: string;
  helperText?: string;
  error?: string;
  value: string | number;
  onChange: (value: string) => void;
  badge?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, currencyPrefix = 'R$', helperText, error, value, onChange, badge, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {label}
              {props.required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {badge}
              </span>
            )}
          </div>
        )}

        <div
          className={`relative flex items-center rounded-xl border bg-slate-50/70 dark:bg-slate-950/70 transition-all duration-200
            ${
              error
                ? 'border-rose-500/80 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:focus-within:ring-emerald-400/20'
            }
          `}
        >
          <div className="pl-3.5 pr-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 select-none flex items-center justify-center">
            {currencyPrefix}
          </div>

          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors ${className}`}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

// ============================================================================
// 3. Custom Checkbox (estilizado do zero, animado e com contraste perfeito)
// ============================================================================
export interface CheckboxProps {
  label: React.ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
  className = '',
}: CheckboxProps) {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`group flex items-start gap-3 cursor-pointer select-none transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center pt-0.5">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 transform group-hover:scale-105 active:scale-95 ${
            checked
              ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40 ring-2 ring-emerald-500/20'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover:border-emerald-500/70'
          }`}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[3] transition-transform animate-in zoom-in-50 duration-150" />}
        </div>
      </div>

      <div className="text-left flex-1">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </label>
  );
}

// ============================================================================
// 4. Modern Switch / Toggle (estilo iOS/SaaS com trilha suave e glow)
// ============================================================================
export interface SwitchToggleProps {
  label?: React.ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function SwitchToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
  className = '',
}: SwitchToggleProps) {
  const switchId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`group flex items-center justify-between gap-4 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {(label || description) && (
        <div className="text-left flex-1">
          {label && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
              {label}
            </span>
          )}
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{description}</p>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          checked ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-200 dark:bg-slate-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ============================================================================
// 5. Select Dropdown (wrapper com chevron personalizado e bordas suaves)
// ============================================================================
export interface SelectDropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}

export const SelectDropdown = React.forwardRef<HTMLSelectElement, SelectDropdownProps>(
  ({ label, helperText, error, leftIcon, badge, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {label}
              {props.required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {badge}
              </span>
            )}
          </div>
        )}

        <div
          className={`relative flex items-center rounded-xl border bg-slate-50/70 dark:bg-slate-950/70 transition-all duration-200
            ${
              error
                ? 'border-rose-500/80 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:focus-within:ring-emerald-400/20'
            }
          `}
        >
          {leftIcon && (
            <div className="pl-3.5 pr-1 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            className={`w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none appearance-none cursor-pointer transition-colors
              ${leftIcon ? 'pl-2' : ''}
              pr-9 ${className}
            `}
            {...props}
          >
            {children}
          </select>

          <div className="absolute right-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error ? (
          <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
SelectDropdown.displayName = 'SelectDropdown';

// ============================================================================
// 6. Text Area (para notas, observações e descrições longas)
// ============================================================================
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  badge?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, helperText, error, badge, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {label}
              {props.required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {badge}
              </span>
            )}
          </div>
        )}

        <div
          className={`relative rounded-xl border bg-slate-50/70 dark:bg-slate-950/70 transition-all duration-200
            ${
              error
                ? 'border-rose-500/80 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:focus-within:ring-emerald-400/20'
            }
          `}
        >
          <textarea
            ref={ref}
            id={inputId}
            className={`w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors resize-y min-h-[72px] ${className}`}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';
