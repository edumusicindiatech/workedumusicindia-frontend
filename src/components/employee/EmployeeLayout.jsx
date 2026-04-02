import { Outlet } from "react-router-dom";
import EmployeeNavbar from "./EmployeeNavbar";
import { useTranslation } from "react-i18next";

const EmployeeLayout = () => {
    const { t } = useTranslation();

    return (
        // 1. Locked the window with `h-screen overflow-hidden` and added `pt-16` here
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground pt-16 relative">
            <EmployeeNavbar />

            {/* 2. Made this inner container the scrollable area with `overflow-y-auto custom-scrollbar` */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 lg:pb-0 transition-all duration-300">
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full max-w-400 mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default EmployeeLayout;