"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Home, Users, TrendingUp, Building2, Receipt, Calculator } from "lucide-react"
import { useLocale } from "@/i18n/locale-provider"
import { SimpleLanguageSwitcher } from "@/components/language-switcher"
import { cssAnimations, createStaggeredClasses } from "@/lib/css-animations"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Navigation items will be created inside the component to use translations

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { t } = useLocale()

  const navigationItems = [
    {
      title: t("nav.navigation"),
      items: [
        {
          title: t("nav.overview"),
          url: "/",
          icon: Home,
        },
        {
          title: t("nav.customers"),
          url: "/customers",
          icon: Users,
        },
        {
          title: t("nav.vendors"),
          url: "/vendors",
          icon: Building2,
        },
        {
          title: t("nav.expenses"),
          url: "/expenses",
          icon: Receipt,
        },
        {
          title: t("nav.financials"),
          url: "/financials",
          icon: Calculator,
        },
      ],
    },
  ]

  const { isArabic } = useLocale()

  return (
    <Sidebar side={isArabic ? "right" : "left"} {...props}>
      <SidebarHeader>
        <div className={`flex items-center gap-2 px-2 py-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <TrendingUp className="size-4" />
          </div>
          <div className={`flex flex-col gap-0.5 leading-none ${isArabic ? 'text-right' : ''}`}>
            <span className="font-semibold">{t("dashboard.title")}</span>
            <span className="text-xs text-muted-foreground">{t("dashboard.subtitle")}</span>
          </div>
        </div>
        <div className="px-2 py-2">
          <SimpleLanguageSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className={isArabic ? 'text-right' : ''}>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="sidebar-menu">
                {section.items.map((item, index) => {
                  const isActive = pathname === item.url
                  const staggerDelay = index * 100
                  
                  return (
                    <SidebarMenuItem 
                      key={item.title}
                      className={`motion-safe:${cssAnimations.fadeInLeft} motion-safe:delay-[${staggerDelay}ms]`}
                    >
                      <SidebarMenuButton asChild isActive={isActive}>
                        <a 
                          href={item.url} 
                          className={`nav-item ${isArabic ? 'text-right' : ''} relative block ${cssAnimations.hoverScale} transition-all duration-200`}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-primary/10 rounded-md" />
                          )}
                          <div className={`flex items-center gap-2 w-full relative z-10 ${isArabic ? 'flex-row-reverse' : ''}`}>
                            <div className="transition-transform duration-200 hover:rotate-3">
                              <item.icon />
                            </div>
                            <span>{item.title}</span>
                          </div>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}