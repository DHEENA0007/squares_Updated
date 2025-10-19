import { FC } from "react";

interface TextInputFieldProps {
  label?: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  width?: string;
  className?: string;
  bgClr?: string;
  disBgClr?: string;
}

const TextInputField: FC<TextInputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  minLength,
  maxLength,
  disabled = false,
  width = "w-full",
  className = "",
  bgClr = "",
  disBgClr = "",
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.replace(/^\s+/, ""); // Trim leading spaces
    onChange({ target: { name, value: trimmedValue } } as React.ChangeEvent<HTMLInputElement>);
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
        type="text"
        name={name}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`${width} px-4 py-3 rounded-lg focus:outline-none focus:ring-2 border border-gray-300 ${
          disabled
            ? `${disBackgroundClr} cursor-not-allowed text-gray-500`
            : `${backgroundClr} focus:ring-purple-600`
        } ${className}`}
        {...(typeof minLength === "number" && { minLength })}
        {...(typeof maxLength === "number" && { maxLength })}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default TextInputField;
