"use client";

import { ShieldCheckIcon, UsersIcon, WarehouseIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarNavProps {
  pendingPropertiesCount: number;
  pendingRequestsCount: number;
  activeBrokersCount: number;
}

const ITEMS = [
  {
    href: "/admin/propiedades",
    label: "Propiedades pendientes",
    icon: WarehouseIcon,
    key: "propiedades" as const,
  },
  {
    href: "/admin/broker-requests",
    label: "Solicitudes de broker",
    icon: UsersIcon,
    key: "requests" as const,
  },
  {
    href: "/admin/brokers",
    label: "Brokers activos",
    icon: ShieldCheckIcon,
    key: "brokers" as const,
  },
];

export function AdminSidebarNav({
  pendingPropertiesCount,
  pendingRequestsCount,
  activeBrokersCount,
}: AdminSidebarNavProps) {
  const pathname = usePathname();
  const counts: Record<(typeof ITEMS)[number]["key"], number> = {
    propiedades: pendingPropertiesCount,
    requests: pendingRequestsCount,
    brokers: activeBrokersCount,
  };

  return (
    <nav
      aria-label="Secciones del panel"
      className="admin-sidebar flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 max-md:w-full max-md:flex-row max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:p-3"
    >
      {ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const count = counts[item.key];
        const hasUrgentCount = item.key !== "brokers" && count > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-150 ease-out ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-text hover:bg-background hover:text-primary"
            }`}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="grow">{item.label}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                isActive
                  ? "bg-primary-foreground/[0.18] text-primary-foreground"
                  : hasUrgentCount
                    ? "bg-warning-foreground text-warning"
                    : "bg-background text-text-muted"
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
