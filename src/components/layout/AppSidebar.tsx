import * as React from "react"
import {
  LayoutDashboard,
  Server,
  Network,
  ShieldAlert,
  Settings,
  Activity,
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
} from "../ui/sidebar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "#dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Inventory",
    url: "#inventory",
    icon: Server,
  },
  {
    title: "Network Map",
    url: "#map",
    icon: Network,
  },
  {
    title: "Security Events",
    url: "#events",
    icon: ShieldAlert,
  },
  {
    title: "Users",
    url: "#users",
    icon: Users,
  },
  {
    title: "Settings",
    url: "#settings",
    icon: Settings,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function AppSidebar({ activeView, onNavigate, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-600 text-sidebar-primary-foreground">
                <Activity className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">SOC Dashboard</span>
                <span className="truncate text-xs">Enterprise Security</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={activeView === item.url.replace('#', '')}
                    onClick={() => onNavigate(item.url.replace('#', ''))}
                    tooltip={item.title}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground/50 text-center">
            v1.0.4 Connected
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
