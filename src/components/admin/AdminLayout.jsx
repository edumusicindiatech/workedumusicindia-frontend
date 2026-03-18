import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = () => {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* The Sidebar component now smartly handles Desktop Side Nav AND Mobile Bottom/Top Navs */}
            <AdminSidebar />

            {/* pt-16 pb-20 = Padding for Mobile Top & Bottom bars. 
              md:pt-0 md:pb-0 md:ml-64 = Resets padding and adds margin for Desktop Sidebar. 
            */}
            <div className="flex-1 flex flex-col min-h-screen pt-16 pb-20 md:pt-0 md:pb-0 md:ml-64 transition-all duration-300">
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;