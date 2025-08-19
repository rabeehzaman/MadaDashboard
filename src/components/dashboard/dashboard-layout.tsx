"use client"

import * as React from "react"
import { AppSidebar } from "./app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useLocale } from "@/i18n/locale-provider"
import { PanelLeft, PanelRight } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isArabic, t } = useLocale()
  
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className={`flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <SidebarTrigger className={`${isArabic ? '-mr-1' : '-ml-1'}`}>
              {isArabic ? <PanelRight /> : <PanelLeft />}
            </SidebarTrigger>
            <Separator orientation="vertical" className={`h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            <h1 className="font-semibold">{t("dashboard.title")}</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 md:p-6 overflow-x-hidden w-full max-w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}