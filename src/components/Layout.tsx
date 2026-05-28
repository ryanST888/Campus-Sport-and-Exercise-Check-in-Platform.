import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Home, LineChart, ListTodo, History, User } from "lucide-react";
import { Toaster } from "react-hot-toast";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isTabVisible = [
    "/",
    "/admin",
    "/stats",
    "/records",
    "/student",
  ].includes(location.pathname);

  return (
    <div className={cn("mobile-container", isTabVisible ? "pb-[60px]" : "")}>
      <Toaster
        position="top-center"
        toastOptions={{ className: "text-sm rounded-lg shadow-lg" }}
      />
      <main className="flex-1 w-full bg-[#f0f2f5] flex flex-col overflow-x-hidden">
        <Outlet />
      </main>

      {isTabVisible && (
        <div className="fixed bottom-0 w-full max-w-[480px] h-[60px] bg-white border-t border-gray-100 flex items-center justify-around z-50 rounded-t-xl shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <TabItem
            icon={<Home className="w-6 h-6" />}
            label="打卡"
            active={location.pathname === "/"}
            onClick={() => navigate("/")}
          />
          <TabItem
            icon={<History className="w-6 h-6" />}
            label="记录"
            active={location.pathname === "/records"}
            onClick={() => navigate("/records")}
          />
          <TabItem
            icon={<ListTodo className="w-6 h-6" />}
            label="管理"
            active={location.pathname === "/admin"}
            onClick={() => navigate("/admin")}
          />
          <TabItem
            icon={<LineChart className="w-6 h-6" />}
            label="统计"
            active={location.pathname === "/stats"}
            onClick={() => navigate("/stats")}
          />
          <TabItem
            icon={<User className="w-6 h-6" />}
            label="孩子"
            active={location.pathname === "/student"}
            onClick={() => navigate("/student")}
          />
        </div>
      )}
    </div>
  );
}

function TabItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-20 h-full transition-colors",
        active ? "text-[#1677ff]" : "text-gray-400",
      )}
    >
      {icon}
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}
