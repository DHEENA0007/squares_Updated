import { useState, useRef, useEffect, useMemo, FC } from "react";
import { ChevronDown } from "lucide-react";

interface OptionType {
  label: string;
  value: string | number;
}

interface SearchableDropdownFieldProps {
  label?: string;
  name: string;
  value: string | number | null;
  onChange: (event: { target: { name: string; value: string | number } }) => void;
  options?: OptionType[];
  error?: string;
  disabled?: boolean;
  className?: string;
  bgClr?: string;
  disBgClr?: string;
  brClr?: string;
}

const SearchableDropdownField: FC<SearchableDropdownFieldProps> = ({
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
  brClr = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ✅ Memoize safeOptions so ESLint and React hooks dependency warnings are avoided
  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []), [options]);

  const filteredOptions = useMemo(
    () =>
      safeOptions.filter((opt) =>
        opt.label?.toLowerCase().includes(search.toLowerCase())
      ),
    [safeOptions, search]
  );

  const selectedLabel =
    safeOptions.find((opt) => opt.value === value)?.label || "";

  const backgroundClr = bgClr || "bg-white";
  const disBackgroundClr = disBgClr || "bg-gray-100";
  const borderClr = brClr || "border-[#ccc]";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string | number) => {
    if (disabled) return;
    onChange({ target: { name, value: val } });
    setIsOpen(false);
    setSearch("");
  };

  const handleToggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={containerRef}>
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

      <div
        onClick={handleToggle}
        className={`flex items-center justify-between px-4 py-3 rounded-lg border focus-within:ring-2 focus-within:ring-purple-600 ${borderClr} ${className} ${
          disabled
            ? `${disBackgroundClr} text-gray-500 cursor-not-allowed`
            : `${backgroundClr} cursor-pointer`
        }`}
      >
        <span className={`${!value ? "text-gray-400" : ""}`}>
          {selectedLabel || `Select ${label || "option"}`}
        </span>
        {!disabled && <ChevronDown size={16} />}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white rounded-lg shadow-lg max-h-60">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border-b border-gray-200 focus:outline-none"
            placeholder="Search..."
            autoFocus
          />
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-4 py-2 hover:bg-purple-100 cursor-pointer ${
                  opt.value === value ? "bg-purple-50 font-medium" : ""
                }`}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">No results found</div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SearchableDropdownField;
