"use client";

import {
  AwardIcon,
  HouseIcon,
  MessageCircleIcon,
  QuoteIcon,
  ShieldCheckIcon,
  UserRoundSearchIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIdioma } from "@/components/i18n/idioma-provider";

interface AdminSidebarNavProps {
  pendingPropertiesCount: number;
  pendingRequestsCount: number;
  activeBrokersCount: number;
  ownersCount: number;
  // Clientes con una solicitud nueva sin atender o con un recordatorio vencido.
  pendingClientsCount: number;
  // Clientes con mensajes en el chat con Captive que nadie ha leído.
  unreadChatsCount: number;
}

const ITEMS = [
  {
    href: "/admin/propiedades",
    icon: WarehouseIcon,
    key: "propiedades" as const,
  },
  {
    href: "/admin/broker-requests",
    icon: UsersIcon,
    key: "requests" as const,
  },
  {
    href: "/admin/brokers",
    icon: ShieldCheckIcon,
    key: "brokers" as const,
  },
  {
    href: "/admin/duenos",
    icon: HouseIcon,
    key: "duenos" as const,
  },
  {
    href: "/admin/clientes",
    icon: UserRoundSearchIcon,
    key: "clientes" as const,
  },
  {
    href: "/admin/mensajes",
    icon: MessageCircleIcon,
    key: "mensajes" as const,
  },
  {
    href: "/admin/casos-exito",
    icon: AwardIcon,
    key: "casos" as const,
  },
  {
    href: "/admin/testimonio",
    icon: QuoteIcon,
    key: "testimonio" as const,
  },
];

export function AdminSidebarNav({
  pendingPropertiesCount,
  pendingRequestsCount,
  activeBrokersCount,
  ownersCount,
  pendingClientsCount,
  unreadChatsCount,
}: AdminSidebarNavProps) {
  const { t } = useIdioma();
  const pathname = usePathname();
  const counts: Record<(typeof ITEMS)[number]["key"], number> = {
    propiedades: pendingPropertiesCount,
    requests: pendingRequestsCount,
    brokers: activeBrokersCount,
    duenos: ownersCount,
    clientes: pendingClientsCount,
    mensajes: unreadChatsCount,
    // Sin contador: no hay nada "pendiente" que atender en los casos de éxito ni en el testimonio.
    casos: 0,
    testimonio: 0,
  };

  return (
    <nav
      aria-label={t.admin.secciones}
      className="admin-sidebar flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 max-md:w-full max-md:flex-row max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:p-3"
    >
      {ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const count = counts[item.key];
        const hasUrgentCount = item.key !== "brokers" && item.key !== "duenos" && count > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-150 ease-out ${
              isActive
                ? "bg-cta text-cta-foreground"
                : "text-text hover:bg-background hover:text-ink"
            }`}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="grow">{t.admin.nav[item.key]}</span>
            {item.key === "casos" || item.key === "testimonio" ? null : (
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
            )}
          </Link>
        );
      })}
    </nav>
  );
}
