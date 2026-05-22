import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Header } from "./ui/Header";
import { canManageSettings, currentAccount } from "../lib/accessControl";

export function TopLevelGuard({ children }: { children: ReactNode }) {
  if (canManageSettings()) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f8]">
      <Header title="无权限" showBack />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full rounded-lg border border-gray-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-[18px] font-bold text-gray-950">
            仅 Top level 可进入管理配置
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-gray-500">
            当前账号：{currentAccount.name}。管理模块用于分类、项目、人员减免等配置，只开放给校长或体育主管。
          </p>
        </div>
      </div>
    </div>
  );
}
