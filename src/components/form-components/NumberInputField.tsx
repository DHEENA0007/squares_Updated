import { FC } from "react";

interface NumberInputFieldProps {
  label?: string;
  name: string;
  value: number | string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  minValue?: number;
  maxValue?: number;
  disabled?: boolean;
  width?: string;
  className?: string;
  bgClr?: string;
  disBgClr?: string;
}

const NumberInputField: FC<NumberInputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  minValue,
  maxValue,
  disabled = false,
  width = "w-full",
  className = "",
  bgClr = "",
  disBgClr = "",
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({ target: { name, value: val } } as React.ChangeEvent<HTMLInputElement>);
  };

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
      <input
        id={name}
        type="number"
        name={name}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        min={minValue}
        max={maxValue}
        className={`${width} px-4 py-3 rounded-lg focus:outline-none focus:ring-2 border border-gray-300 ${
          disabled
            ? `${disBackgroundClr} cursor-not-allowed text-gray-500`
            : `${backgroundClr} focus:ring-purple-600`
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default NumberInputField;
