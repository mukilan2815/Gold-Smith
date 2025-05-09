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
import { collection, getDocs, query, orderBy, doc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface Client {
  id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: any; // Keep for ordering
}


export default function ReceiptPage() {
  return (
    <Layout>
      <ReceiptContent />
    </Layout>
  );
}

function ReceiptContent() {
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
      const q = query(clientsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const fetchedClients: Client[] = [];
      querySnapshot.forEach((doc) => {
        fetchedClients.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(fetchedClients);
    } catch (error) {
      console.error("Error fetching clients from Firestore:", error);
      toast({ variant: "destructive", title: "Error fetching clients", description: "Could not load clients. This query sorts by 'createdAt'. Ensure all 'ClientDetails' documents have this field as a Firestore Timestamp and a descending index exists on 'createdAt' in your Firestore console." });
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
       currentClients = currentClients.filter((client) =>
         client.shopName?.toLowerCase().includes(debouncedShopName.toLowerCase())
       );
    }
    if (debouncedClientName.trim() !== '') {
        currentClients = currentClients.filter((client) =>
          client.clientName?.toLowerCase().includes(debouncedClientName.toLowerCase())
        );
    }
     if (debouncedPhoneNumber.trim() !== '') {
       currentClients = currentClients.filter((client) =>
         client.phoneNumber?.includes(debouncedPhoneNumber)
       );
     }
    return currentClients;
  }, [debouncedShopName, debouncedClientName, debouncedPhoneNumber, clients]);


  const handleClientSelection = (client: Client) => {
    router.push(`/receipt/details?clientId=${client.id}&clientName=${encodeURIComponent(client.clientName)}`);
  };


  const handleDeleteClient = async (clientToDelete: Client) => {
     try {
       const clientRef = doc(db, 'ClientDetails', clientToDelete.id);
       await deleteDoc(clientRef);
       setClients((prevClients) => prevClients.filter(c => c.id !== clientToDelete.id));
       toast({ title: 'Success', description: `Client ${clientToDelete.clientName} deleted.` });
     } catch (error) {
       console.error("Error deleting client:", error);
       toast({ variant: 'destructive', title: 'Error', description: 'Could not delete client.' });
     }
   };


  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Select Client</CardTitle>
           <CardDescription>Filter and select a client to create or view their receipt.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Filter by Shop Name"
              value={shopNameFilter}
              onChange={(e) => setShopNameFilter(e.target.value)}
              className="rounded-md"
            />
            <Input
              type="text"
              placeholder="Filter by Client Name"
              value={clientNameFilter}
              onChange={(e) => setClientNameFilter(e.target.value)}
              className="rounded-md"
            />
            <Input
              type="text"
              placeholder="Filter by Phone Number"
              value={phoneNumberFilter}
              onChange={(e) => setPhoneNumberFilter(e.target.value)}
              className="rounded-md"
            />
          </div>

           <ScrollArea className="h-[50vh] w-full rounded-md border p-4">
            {loading ? (
              <p className="text-muted-foreground text-center">
                Loading clients... This query sorts by 'createdAt'. For optimal performance, ensure all 'ClientDetails' documents have a 'createdAt' field (Firestore Timestamp type) and that a descending index exists on 'createdAt' in your Firestore console. If loading is slow, these are the primary areas to investigate.
              </p>
            ) : filteredClients.length > 0 ? (
              <ul className="space-y-3">
                {filteredClients.map((client) => (
                  <li
                    key={client.id}
                    className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mb-3 md:mb-0 md:flex-1">
                      <p className="font-semibold text-lg">
                        {client.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Shop: {client.shopName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Phone: {client.phoneNumber}
                      </p>
                       <p className="text-sm text-muted-foreground">
                         Address: {client.address}
                       </p>
                    </div>
                     <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
                       <Button
                         onClick={() => handleClientSelection(client)}
                         className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
                         size="sm"
                       >
                         Select Client
                       </Button>
                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" className="w-full md:w-auto">Delete</Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>
                               Are you absolutely sure?
                             </AlertDialogTitle>
                             <AlertDialogDescription>
                               This action cannot be undone. This will delete
                               the client permanently from the database.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <AlertDialogAction
                                onClick={() => handleDeleteClient(client)}
                                className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                             >
                               Continue
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No clients found matching your criteria. If loading took long, please check Firestore indexes and data consistency for the 'createdAt' field.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
