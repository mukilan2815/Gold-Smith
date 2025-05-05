'use client';

import {
  BarChart,
  Building2,
  Contact2,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Plus,
  User,
  ShieldCheck, // Added for Admin Receipt
} from 'lucide-react';
import {useRouter} from 'next/navigation';

import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {useToast} from '@/hooks/use-toast'; // Import useToast

export default function SidebarContentComponent() {
  const {setOpen} = useSidebar();
  const router = useRouter();
  const {toast} = useToast(); // Initialize useToast

  const handleNavigation = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    toast({ // Use toast for feedback
      title: 'Logged out successfully!',
      description: 'Redirecting to login page...',
    });
    router.push('/login');
    setOpen(false); // Close sidebar on logout
  };

  return (
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation('/')}>
            <LayoutDashboard />
            <span>Dashboard</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation('/new-client')}>
              <Plus />
              <span>New Client</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation('/receipt')}>
              <FileText />
              <span>Receipt</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation('/bill')}>
              <BarChart />
              <span>Bill</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      {/* Admin Section */}
      <SidebarGroup>
         <SidebarMenu>
           <SidebarMenuItem>
             <SidebarMenuButton onClick={() => handleNavigation('/admin-receipt')}>
               <ShieldCheck />
               <span>Admin Receipt</span>
             </SidebarMenuButton>
           </SidebarMenuItem>
           {/* Add Admin Bill link later here */}
         </SidebarMenu>
       </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation('/customer-details')}>
              <Contact2 />
              <span>Customer Details</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation('/admin-details')}>
              <User />
              <span>Admin Details</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
