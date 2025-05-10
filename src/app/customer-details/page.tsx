'use client';

import Layout from '@/components/Layout';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore'; // Firebase removed
// import { db } from '@/lib/firebase'; // Firebase removed
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye } from 'lucide-react';

interface Client {
  id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: Date; // Changed from Timestamp
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
    // TODO: Implement SQL data fetching for clients
    // Example: const fetchedClients = await fetchClientsFromSQL();
    // setClients(fetchedClients);
    console.warn("Client data fetching not implemented. Waiting for SQL database setup.");
    toast({
        title: "Data Fetching Pending",
        description: "Client list for customer details will be loaded once the SQL database is configured.",
        variant: "default"
    });
    setClients([]); // Initialize with empty array
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
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

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Customer Details - Select Client</CardTitle>
          <CardDescription>Filter and select a client to view their details and receipts. Data will be loaded from SQL database once configured.</CardDescription>
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
                Loading clients... Please wait for SQL database configuration.
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
                    <Button onClick={() => handleViewClientDetails(client)} className="mt-2 md:mt-0" size="sm" variant="outline">
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No clients found. Waiting for SQL database configuration.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
