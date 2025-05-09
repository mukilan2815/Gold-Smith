
'use client';

import SidebarContentComponent from '@/components/SidebarContent';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <SidebarProvider>
      <div className="md:pl-6">
        {/* Changed from "mx-auto max-w-7xl" to "w-full" to allow content to expand */}
        <div className="w-full"> 
          <div className="sticky top-0 z-40 border-b bg-background md:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <SidebarTrigger />
              <div className="font-semibold">Goldsmith Assistant</div>
            </div>
          </div>
          <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
            <Sidebar className="md:block hidden">
              <SidebarContentComponent />
            </Sidebar>
            <SidebarInset>{children}</SidebarInset>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}


    