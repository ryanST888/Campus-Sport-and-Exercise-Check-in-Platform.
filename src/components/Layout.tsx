import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { History, Home, LineChart, ListTodo, User } from "lucide-react";
import { Toaster } from "react-hot-toast";

const STUDENT_THEME_STORAGE_KEY = "student-profile-theme";
const STUDENT_THEME_CHANGED_EVENT = "student-profile-theme-change";
const NAV_TABS = [
  { path: "/", label: "打卡", icon: <Home className="h-6 w-6" /> },
  { path: "/records", label: "记录", icon: <History className="h-6 w-6" /> },
  { path: "/admin", label: "管理", icon: <ListTodo className="h-6 w-6" /> },
  { path: "/stats", label: "统计", icon: <LineChart className="h-6 w-6" /> },
  { path: "/student", label: "孩子", icon: <User className="h-6 w-6" /> },
] as const;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const navPointerIdRef = useRef<number | null>(null);
  const navStartXRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  const [studentTheme, setStudentTheme] = useState(() =>
    typeof window === "undefined"
      ? "light"
      : window.localStorage.getItem(STUDENT_THEME_STORAGE_KEY) || "light",
  );
  const [navDrag, setNavDrag] = useState<{
    active: boolean;
    index: number;
    xPercent: number;
  } | null>(null);

  const rawActiveIndex = NAV_TABS.findIndex((tab) => tab.path === location.pathname);
  const isTabVisible = rawActiveIndex >= 0;
  const activeIndex = rawActiveIndex >= 0 ? rawActiveIndex : 0;
  const isStudentDarkNav = location.pathname === "/student" && studentTheme === "dark";
  const previewIndex = navDrag?.active ? navDrag.index : activeIndex;
  const pillLeftPercent =
    navDrag?.active
      ? navDrag.xPercent
      : ((activeIndex + 0.5) / NAV_TABS.length) * 100;

  useEffect(() => {
    const syncStudentTheme = () => {
      setStudentTheme(window.localStorage.getItem(STUDENT_THEME_STORAGE_KEY) || "light");
    };

    syncStudentTheme();
    window.addEventListener("storage", syncStudentTheme);
    window.addEventListener(STUDENT_THEME_CHANGED_EVENT, syncStudentTheme);

    return () => {
      window.removeEventListener("storage", syncStudentTheme);
      window.removeEventListener(STUDENT_THEME_CHANGED_EVENT, syncStudentTheme);
    };
  }, [location.pathname]);

  const getNavTarget = (clientX: number) => {
    const rect = navRef.current?.getBoundingClientRect();
    if (!rect) {
      return {
        index: activeIndex,
        xPercent: ((activeIndex + 0.5) / NAV_TABS.length) * 100,
      };
    }

    const rawRatio = (clientX - rect.left) / rect.width;
    const ratio = Math.min(0.98, Math.max(0.02, rawRatio));
    const index = Math.min(
      NAV_TABS.length - 1,
      Math.max(0, Math.floor(ratio * NAV_TABS.length)),
    );

    return {
      index,
      xPercent: ratio * 100,
    };
  };

  const handleNavPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    navPointerIdRef.current = event.pointerId;
    navStartXRef.current = event.clientX;
    setNavDrag({ active: true, ...getNavTarget(event.clientX) });
  };

  const handleNavPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (navPointerIdRef.current !== event.pointerId) return;

    if (Math.abs(event.clientX - navStartXRef.current) > 8) {
      suppressNextClickRef.current = true;
    }
    setNavDrag({ active: true, ...getNavTarget(event.clientX) });
  };

  const finishNavDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (navPointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const target = getNavTarget(event.clientX);
    navPointerIdRef.current = null;
    setNavDrag(null);

    const nextPath = NAV_TABS[target.index]?.path;
    if (nextPath && nextPath !== location.pathname) navigate(nextPath);

    if (suppressNextClickRef.current) {
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 250);
    }
  };

  const cancelNavDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    navPointerIdRef.current = null;
    setNavDrag(null);

    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
  };

  const handleTabClick = (path: string) => {
    if (suppressNextClickRef.current) return;
    if (path !== location.pathname) navigate(path);
  };

  return (
    <div className={cn("mobile-container", isTabVisible ? "pb-[84px]" : "")}>
      <Toaster
        position="top-center"
        toastOptions={{ className: "text-sm rounded-lg shadow-lg" }}
      />
      <main className="flex w-full flex-1 flex-col overflow-x-hidden bg-[#eef5ff]">
        <Outlet />
      </main>

      {isTabVisible && (
        <div
          ref={navRef}
          onPointerDown={handleNavPointerDown}
          onPointerMove={handleNavPointerMove}
          onPointerUp={finishNavDrag}
          onPointerCancel={cancelNavDrag}
          className={cn(
            "fixed bottom-3 left-1/2 z-50 flex h-[64px] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 touch-none select-none items-center justify-around rounded-[28px] border backdrop-blur-2xl",
            isStudentDarkNav
              ? "border-white/15 bg-slate-950/72 shadow-[0_22px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)]"
              : "border-white/60 bg-white/50 shadow-[0_22px_60px_rgba(58,86,124,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 h-[50px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border transition-[left,transform,box-shadow] duration-300 ease-out",
              navDrag?.active ? "scale-[1.06] duration-75" : "",
              isStudentDarkNav
                ? "border-cyan-200/30 bg-white/12 shadow-[0_10px_28px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.18)]"
                : "border-white/65 bg-white/60 shadow-[0_10px_28px_rgba(41,104,186,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]",
            )}
            style={{ left: `${pillLeftPercent}%` }}
          />
          {NAV_TABS.map((tab, index) => (
            <TabItem
              key={tab.path}
              icon={tab.icon}
              label={tab.label}
              active={index === previewIndex}
              dark={isStudentDarkNav}
              dragging={Boolean(navDrag?.active)}
              onClick={() => handleTabClick(tab.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabItem({
  icon,
  label,
  active,
  dark = false,
  dragging = false,
  onClick,
}: {
  key?: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  dark?: boolean;
  dragging?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative z-10 flex h-[50px] w-[72px] flex-col items-center justify-center rounded-[22px] transition-all",
        active
          ? dark
            ? "text-cyan-100"
            : "text-[#1677ff]"
          : dark
            ? "text-white/68 active:bg-white/10"
            : "text-slate-400 active:bg-white/35",
        active && dragging ? "scale-110" : "",
      )}
    >
      {icon}
      <span className="mt-1 text-[10px] font-medium">{label}</span>
    </button>
  );
}
