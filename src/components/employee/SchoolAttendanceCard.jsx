import React, { useState } from "react";
import { MapPin, LogIn, LogOut, CheckCircle } from "lucide-react";

const SchoolAttendanceCard = ({ school }) => {
    // States: 'pending' -> 'checked-in' -> 'completed'
    const [status, setStatus] = useState("pending");
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);

    const handleCheckIn = () => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCheckInTime(time);
        setStatus("checked-in");
    };

    const handleCheckOut = () => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCheckOutTime(time);
        setStatus("completed");
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {school.address}
                </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
                {status === "pending" && (
                    <button
                        onClick={handleCheckIn}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-md flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogIn className="w-5 h-5" />
                        Mark Attendance (Check In)
                    </button>
                )}

                {status === "checked-in" && (
                    <div className="space-y-3">
                        <div className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                            <span className="relative flex h-2.5 w-2.5 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                            </span>
                            Checked in at {checkInTime}
                        </div>
                        <button
                            onClick={handleCheckOut}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium py-2.5 rounded-md flex items-center justify-center gap-2 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Check Out
                        </button>
                    </div>
                )}

                {status === "completed" && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                            <CheckCircle className="w-5 h-5" />
                            Visit Completed
                        </div>
                        <p className="text-xs text-gray-500 pl-7">
                            In: {checkInTime} — Out: {checkOutTime}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchoolAttendanceCard;