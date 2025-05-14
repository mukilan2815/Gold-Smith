'use client';

import Layout from '@/components/Layout';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Client {
  id: string; // MongoDB _id as string
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: Date; 
}

export default function CustomerDetailsListPage() {
  return (
    <Layout>
      <CustomerDetailsListContent />
    </Layout>
  );
}

function CustomerDetailsListContent() {
  const [shopNameFilter, setShopNameFilter] = useState('');
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [phoneNumberFilter, setPhoneNumberFilter] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const debouncedShopName = useDebounce(shopNameFilter, 300);
  const debouncedClientName = useDebounce(clientNameFilter, 300);
  const debouncedPhoneNumber = useDebounce(phoneNumberFilter, 300);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params for filtering if needed
      const queryParams = new URLSearchParams();
      if (debouncedShopName) queryParams.append('shopName', debouncedShopName);
      if (debouncedClientName) queryParams.append('clientName', debouncedClientName);
      if (debouncedPhoneNumber) queryParams.append('phoneNumber', debouncedPhoneNumber);
      
      // Fetch clients from API
      const response = await fetch(`/api/clients?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data = await response.json();
      
      // Transform MongoDB _id to id for frontend use
      setClients(data.map((client: any) => ({
        ...client,
        id: client._id ? client._id.toString() : `temp-${Math.random().toString(36).substr(2, 9)}`
      })));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        variant: 'destructive',
        title: 'Error Fetching Clients',
        description: 'There was a problem loading client data. Please try again.'
      });
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [toast, debouncedShopName, debouncedClientName, debouncedPhoneNumber]);


  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    // Client-side filtering as fallback, server-side preferred with MongoDB
    let currentClients = [...clients];
    if (debouncedShopName.trim() !== '') {
      currentClients = currentClients.filter((client) => client.shopName?.toLowerCase().includes(debouncedShopName.toLowerCase()));
    }
    if (debouncedClientName.trim() !== '') {
      currentClients = currentClients.filter((client) => client.clientName?.toLowerCase().includes(debouncedClientName.toLowerCase()));
    }
    if (debouncedPhoneNumber.trim() !== '') {
      currentClients = currentClients.filter((client) => client.phoneNumber?.includes(debouncedPhoneNumber));
    }
    return currentClients;
  }, [debouncedShopName, debouncedClientName, debouncedPhoneNumber, clients]);

  const handleViewClientDetails = (client: Client) => {
    router.push(`/customer-details/view?clientId=${client.id}&clientName=${encodeURIComponent(client.clientName)}`);
  };

  const handleDeleteClient = async (clientToDelete: Client) => {
    try {
      // Call API to delete the client
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      toast({ 
        title: 'Client Deleted', 
        description: `Client ${clientToDelete.clientName} has been successfully deleted.`,
        variant: 'default'
      });
      
      // Update the client list
      setClients(prevClients => prevClients.filter(client => client.id !== clientToDelete.id));
    } catch (error) {
      console.error(`Error deleting client ID ${clientToDelete.id}:`, error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'There was a problem deleting the client. Please try again.'
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Customer Details - Select Client</CardTitle>
          <CardDescription>Filter and select a client to view their details and receipts. Data will be loaded from MongoDB once configured.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input type="text" placeholder="Filter by Shop Name" value={shopNameFilter} onChange={(e) => setShopNameFilter(e.target.value)} className="rounded-md"/>
            <Input type="text" placeholder="Filter by Client Name" value={clientNameFilter} onChange={(e) => setClientNameFilter(e.target.value)} className="rounded-md"/>
            <Input type="text" placeholder="Filter by Phone Number" value={phoneNumberFilter} onChange={(e) => setPhoneNumberFilter(e.target.value)} className="rounded-md"/>
          </div>
          <ScrollArea className="h-[50vh] w-full rounded-md border p-4">
            {loading ? (
              <p className="text-muted-foreground text-center">
                Loading clients... Please wait for MongoDB configuration.
              </p>
            ) : filteredClients.length > 0 ? (
              <ul className="space-y-3">
                {filteredClients.map((client) => (
                  <li key={client.id} className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors">
                    <div className="mb-3 md:mb-0 md:flex-1">
                      <p className="font-semibold text-lg">{client.clientName}</p>
                      <p className="text-sm text-muted-foreground">Shop: {client.shopName}</p>
                      <p className="text-sm text-muted-foreground">Phone: {client.phoneNumber}</p>
                      <p className="text-sm text-muted-foreground">Address: {client.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleViewClientDetails(client)} className="mt-2 md:mt-0" size="sm" variant="outline">
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="mt-2 md:mt-0 flex items-center gap-1">
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the client {client.clientName} and all associated data.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteClient(client)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No clients found. Waiting for MongoDB configuration.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
