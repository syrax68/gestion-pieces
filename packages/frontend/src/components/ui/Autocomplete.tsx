import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";
import { ChevronDown } from "lucide-react";

interface AutocompleteOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Autocomplete({ options, value, onChange, placeholder, className, disabled }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const selected = options.find((opt) => opt.value === value);
    if (selected) {
      setSearchTerm(selected.label);
    } else {
      setSearchTerm("");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Restaurer la valeur affichée si on ferme sans sélection
        const selected = options.find((opt) => opt.value === value);
        if (selected) {
          setSearchTerm(selected.label);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options]);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) || option.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleSelectOption = (option: AutocompleteOption) => {
    onChange(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder || "Rechercher..."}
          disabled={disabled}
          className="pr-8"
        />
        <ChevronDown
          className={cn(
            "absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-background border rounded-md shadow-lg">
          {filteredOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelectOption(option)}
              className={cn("px-3 py-2 cursor-pointer hover:bg-accent transition-colors", option.value === value && "bg-accent")}
            >
              <div className="font-medium">{option.label}</div>
              {option.subtitle && <div className="text-sm text-muted-foreground">{option.subtitle}</div>}
            </div>
          ))}
        </div>
      )}

      {isOpen && filteredOptions.length === 0 && searchTerm && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
          Aucun résultat trouvé
        </div>
      )}
    </div>
  );
}
