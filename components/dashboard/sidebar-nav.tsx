"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  FileText,
  Home,
  LogOut,
  PlusCircle,
  Settings,
  User,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { UserRole } from "@/lib/types/database"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Visao Geral", href: "/dashboard/admin", icon: BarChart3 },
    { label: "Agenda", href: "/dashboard/admin/schedule", icon: CalendarDays },
    { label: "Agendamentos", href: "/dashboard/admin/bookings", icon: BookOpen },
    { label: "Conteudos", href: "/dashboard/admin/content", icon: FileText },
    { label: "Vagas", href: "/dashboard/admin/jobs", icon: Briefcase },
    { label: "Mentorados", href: "/dashboard/admin/mentees", icon: Users },
    { label: "Configuracoes", href: "/dashboard/admin/settings", icon: Settings },
  ],
  mentee: [
    { label: "Visao Geral", href: "/dashboard/mentee", icon: Home },
    { label: "Perfil", href: "/dashboard/mentee/profile", icon: User },
    { label: "Agendamentos", href: "/dashboard/mentee/bookings", icon: BookOpen },
    { label: "Nova Mentoria", href: "/dashboard/mentee/bookings/new", icon: PlusCircle },
  ],
  hr: [
    { label: "Visao Geral", href: "/dashboard/hr", icon: Home },
    { label: "Vagas", href: "/dashboard/hr/jobs", icon: Briefcase },
    { label: "Nova Vaga", href: "/dashboard/hr/jobs/new", icon: PlusCircle },
    { label: "Mentorados", href: "/dashboard/hr/mentees", icon: Users },
  ],
}

interface SidebarNavProps {
  role: UserRole
  userName: string
}

export function SidebarNav({ role, userName }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const items = NAV_ITEMS[role] || NAV_ITEMS.mentee

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            AM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Mentoria</span>
            <span className="text-xs text-muted-foreground capitalize">{role}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== `/dashboard/${role}` &&
                    pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
