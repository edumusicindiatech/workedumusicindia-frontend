import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, options = [], disabled = false, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Find the current option to display its label
    const selectedOption = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
    const displayLabel = selectedOption ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label) : "Select";

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* The Select Trigger (Input Box) */}
            <div
                className={`flex items-center justify-between w-full py-2.5 pr-3 text-sm transition-all duration-200 rounded-lg border h-11
                ${Icon ? "pl-9" : "pl-3"} 
                ${disabled ? "opacity-50 cursor-not-allowed bg-muted/50 border-border" : "cursor-pointer"}
                ${!disabled && isOpen ? "bg-card border-primary ring-2 ring-primary/10 shadow-sm" : ""}
                ${!disabled && !isOpen ? "bg-card border-border hover:border-primary/50 hover:bg-muted/30" : ""}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {/* Optional Icon */}
                {Icon && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                        <Icon className="w-4 h-4" />
                    </div>
                )}

                <span className={`truncate ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {displayLabel}
                </span>

                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </div>

            {/* The Dropdown Menu */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1.5 p-1 bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="flex flex-col gap-0.5">
                        {options.map((option, idx) => {
                            // Support both ["String", "String"] and [{value: "val", label: "lbl"}]
                            const optValue = typeof option === 'string' ? option : option.value;
                            const optLabel = typeof option === 'string' ? option : option.label;
                            const isSelected = value === optValue;

                            return (
                                <li
                                    key={optValue || idx}
                                    onClick={() => {
                                        if (onChange) onChange(optValue);
                                        setIsOpen(false);
                                    }}
                                    className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center
                                    ${isSelected
                                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    {optLabel}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;