import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react'; // Using the same icon library as your sidebar

const CustomSelect = ({ value, onChange, options = ["Teacher", "Admin"] }) => {
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

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* The Select Trigger (Input Box) */}
            <div
                className={`flex items-center justify-between w-full px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer rounded-lg border
                ${isOpen
                        ? "bg-card border-primary ring-2 ring-primary/10 shadow-sm"
                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`truncate ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {value || "Select Role"}
                </span>

                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </div>

            {/* The Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 p-1 bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="flex flex-col gap-0.5">
                        {options.map((option) => {
                            const isSelected = value === option;

                            return (
                                <li
                                    key={option}
                                    onClick={() => {
                                        if (onChange) onChange(option);
                                        setIsOpen(false);
                                    }}
                                    className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center
                                    ${isSelected
                                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    {option}
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