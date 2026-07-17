import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useTranslation } from "react-i18next";

const AdminLayout = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground pt-16 relative">

            <AdminSidebar />

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 xl:pb-0 transition-all duration-300">
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full max-w-400 mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;