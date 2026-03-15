import { Outlet } from "react-router-dom";
import EmployeeNavbar from "../../components/employee/EmployeeNavbar";

const EmployeeLayout = () => {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
            {/* The Top Navigation Bar */}
            <EmployeeNavbar />

            {/* The Page Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                {/* <Outlet /> is where the individual pages will render based on the URL */}
                <Outlet />
            </main>
        </div>
    );
};

export default EmployeeLayout;