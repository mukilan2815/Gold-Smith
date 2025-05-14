'use client';

import Layout from '@/components/Layout';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface Client {
  id: string; // This will likely be MongoDB's _id as a string
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: Date; 
}

export default function ClientReceiptSelectPage() {
  return (
    <Layout>
      <ClientReceiptSelectContent />
    </Layout>
  );
}

function ClientReceiptSelectContent() {
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
    // Filtering will likely happen server-side with MongoDB for efficiency.
    // This client-side filter can be a fallback or for initial display if all clients are fetched.
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

  const handleClientSelection = (client: Client) => {
    router.push(`/receipt/details?clientId=${client.id}&clientName=${encodeURIComponent(client.clientName)}`);
  };

  const handleDeleteClient = async (clientToDelete: Client) => {
     // TODO: Implement MongoDB data deletion for client
     // Example: await deleteClientFromMongoDB(clientToDelete.id);
     // setClients((prevClients) => prevClients.filter(c => c.id !== clientToDelete.id));
     console.warn(`Delete operation for client ID ${clientToDelete.id} not implemented. Waiting for MongoDB setup.`);
     toast({
         title: "Delete Operation Pending",
         description: `Client ${clientToDelete.clientName} will be deleted once MongoDB is configured. This may also delete associated receipts.`,
         variant: "default"
     });
   };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Client Receipt - Select Client</CardTitle>
           <CardDescription>Filter and select a client. Client data will be loaded from MongoDB once configured.</CardDescription>
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
                     <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
                       <Button onClick={() => handleClientSelection(client)} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md" size="sm">
                         Create Receipt
                       </Button>
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
