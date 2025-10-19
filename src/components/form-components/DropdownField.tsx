import { FC } from "react";
import { ChevronDown } from "lucide-react";

interface OptionType {
  label: string;
  value: string | number;
}

interface DropdownFieldProps {
  label?: string;
  name: string;
  value: string | number | "";
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: OptionType[];
  error?: string;
  disabled?: boolean;
  className?: string;
  bgClr?: string;
  disBgClr?: string;
}

const DropdownField: FC<DropdownFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  className = "",
  bgClr = "",
  disBgClr = "",
}) => {
  const backgroundClr = bgClr || "bg-white";
  const disBackgroundClr = disBgClr || "bg-gray-100";

  return (
    <div>
      {label && (
        <label
          htmlFor={name}
          className={`block mb-1 text-sm font-medium ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-3 pr-8 rounded-lg appearance-none border border-gray-300 focus:outline-none focus:ring-2 ${
            disabled
              ? `${disBackgroundClr} text-gray-500 cursor-not-allowed`
              : `${backgroundClr} focus:ring-purple-600`
          } ${className}`}
        >
          <option value="">{`Select ${label || "option"}`}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron Icon */}
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
          <ChevronDown size={16} />
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default DropdownField;
