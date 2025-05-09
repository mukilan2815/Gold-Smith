'use client';

import Layout from '@/components/Layout';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye } from 'lucide-react';

interface Client {
  id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: Timestamp; 
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
      const clientsRef = collection(db, 'ClientDetails');
      // Querying by 'createdAt' (desc) requires an index.
      const q = query(clientsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const fetchedClients: Client[] = [];
      querySnapshot.forEach((doc) => {
        fetchedClients.push({ id: doc.id, ...(doc.data() as Omit<Client, 'id'>) });
      });
      setClients(fetchedClients);
    } catch (error) {
      console.error("Error fetching clients for Customer Details:", error);
      toast({ 
        variant: "destructive", 
        title: "Error Fetching Clients", 
        description: "Could not load clients. This often means Firestore indexes are missing. Please ensure an index on 'ClientDetails' collection for 'createdAt' (descending) exists. Check console and firestore.indexes.md." 
      });
    } finally {
      setLoading(false);
    }
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
          <CardDescription>Filter and select a client to view their details and receipts. Slow loading? Check Firestore index for 'ClientDetails' on 'createdAt' (descending). See firestore.indexes.md.</CardDescription>
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
                Loading clients... If slow, ensure a Firestore index on 'ClientDetails' for 'createdAt' (descending) is active. Refer to firestore.indexes.md.
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
              <p className="text-muted-foreground text-center">No clients found. If clients exist but are not displayed, or loading is slow, check Firestore indexes for 'ClientDetails' on 'createdAt' (descending). Refer to firestore.indexes.md.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
