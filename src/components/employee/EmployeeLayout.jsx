import { Outlet } from "react-router-dom";
import EmployeeNavbar from "./EmployeeNavbar";
import { useTranslation } from "react-i18next";

const EmployeeLayout = () => {
    const { t } = useTranslation(); // <-- Initialize translation function

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <EmployeeNavbar />

            <div className="flex-1 flex flex-col pt-16 pb-16 lg:pb-0 transition-all duration-300">
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full max-w-400 mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default EmployeeLayout;