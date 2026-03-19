import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* The Navbar component handles both Desktop Top Nav & Mobile Header/Bottom Nav */}
            <AdminSidebar />

            {/* pt-16 = Padding for the Top Nav/Header (always active)
              pb-16 = Padding for Mobile/Tablet Bottom Nav
              xl:pb-0 = Removes bottom padding on Desktop (1280px+) since there is no bottom nav
            */}
            <div className="flex-1 flex flex-col pt-16 pb-16 xl:pb-0 transition-all duration-300">
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full max-w-400 mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;