import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

const CustomSelect = ({ value, onChange, options = [], disabled = false, icon: Icon, onOpen, isLoading = false }) => {
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

    const handleToggle = () => {
        if (!disabled) {
            const nextState = !isOpen;
            setIsOpen(nextState);
            // Trigger the fetch function whenever the menu is opened
            if (nextState && onOpen) {
                onOpen();
            }
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* The Select Trigger (Input Box) */}
            <div
                className={`flex items-center justify-between w-full py-2.5 pr-3 text-sm transition-all duration-200 rounded-lg border h-11
                ${Icon ? "pl-9" : "pl-3"} 
                ${disabled ? "opacity-50 cursor-not-allowed bg-muted/50 border-border" : "cursor-pointer"}
                ${!disabled && isOpen ? "bg-card border-primary ring-2 ring-primary/10 shadow-sm" : ""}
                ${!disabled && !isOpen ? "bg-card border-border hover:border-primary/50 hover:bg-muted/30" : ""}`}
                onClick={handleToggle}
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
                <div className="absolute z-50 w-full mt-1.5 p-1 bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                    <ul className="flex flex-col gap-0.5">
                        {isLoading ? (
                            <li className="px-3 py-4 text-sm text-muted-foreground flex justify-center items-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                            </li>
                        ) : options.length > 0 ? (
                            options.map((option, idx) => {
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
                            })
                        ) : (
                            <li className="px-3 py-3 text-sm text-muted-foreground text-center">
                                No options available
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;