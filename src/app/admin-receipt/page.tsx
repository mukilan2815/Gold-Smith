
'use client';

import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'; // Added limit
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// Define the Client interface matching Firestore structure
interface Client {
  id: string; // Firestore document ID
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  // Add any other fields if they exist in your Firestore 'ClientDetails' documents
}

export default function AdminReceiptPage() {
  return (
    <Layout>
      <AdminReceiptContent />
    </Layout>
  );
}

function AdminReceiptContent() {
  const [shopNameFilter, setShopNameFilter] = useState('');
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [phoneNumberFilter, setPhoneNumberFilter] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]); // Added state for filtered clients
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

   // --- Fetch Clients ---
   const fetchClients = async () => {
     setLoading(true);
     try {
       const clientsRef = collection(db, 'ClientDetails');
       // Order by creation time, newest first, and limit initial load
       const q = query(clientsRef, orderBy('createdAt', 'desc'), limit(50)); // Limit to 50 for performance
       const querySnapshot = await getDocs(q);
       const fetchedClients: Client[] = [];
       querySnapshot.forEach((doc) => {
         fetchedClients.push({ id: doc.id, ...doc.data() } as Client);
       });
       setClients(fetchedClients);
       // Initialize filtered clients
       // setFilteredClients(fetchedClients); // Moved to useEffect for filtering
     } catch (error) {
       console.error("Error fetching clients from Firestore:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not load clients." });
     } finally {
       setLoading(false);
     }
   };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Changed dependency to [] to fetch on mount

  // --- Filter Logic ---
  useEffect(() => {
     let currentClients = [...clients];

     if (shopNameFilter.trim() !== '') {
        currentClients = currentClients.filter((client) =>
          client.shopName?.toLowerCase().includes(shopNameFilter.toLowerCase())
        );
     }
     if (clientNameFilter.trim() !== '') {
         currentClients = currentClients.filter((client) =>
           client.clientName?.toLowerCase().includes(clientNameFilter.toLowerCase())
         );
     }
      if (phoneNumberFilter.trim() !== '') {
        currentClients = currentClients.filter((client) =>
          client.phoneNumber?.includes(phoneNumberFilter)
        );
      }

     setFilteredClients(currentClients); // Update filtered list based on filters and base clients
   }, [shopNameFilter, clientNameFilter, phoneNumberFilter, clients]); // Rerun when filters or clients change


  const handleClientSelection = (client: Client) => {
    // Navigate to Admin Receipt Details page with client ID and Name
    router.push(`/admin-receipt/details?clientId=${client.id}&clientName=${encodeURIComponent(client.clientName)}`);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Admin Receipt - Select Client</CardTitle>
          <CardDescription>Filter and select a client to create or view their admin receipt.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Filter Inputs */}
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
              type="text" // Changed to text to allow flexible phone number formats
              placeholder="Filter by Phone Number"
              value={phoneNumberFilter}
              onChange={(e) => setPhoneNumberFilter(e.target.value)}
              className="rounded-md"
            />
          </div>

          {/* Client List */}
          <ScrollArea className="h-[50vh] w-full rounded-md border p-4">
            {loading ? (
              <p className="text-muted-foreground text-center">Loading clients...</p>
            ) : filteredClients.length > 0 ? (
              <ul className="space-y-3">
                {filteredClients.map((client) => (
                  <li
                    key={client.id} // Use Firestore document ID as key
                    className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mb-3 md:mb-0 md:flex-1"> {/* Added flex-1 */}
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
                    <Button
                      onClick={() => handleClientSelection(client)}
                      className="mt-2 md:mt-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
                      size="sm" // Smaller button
                    >
                      Select Client
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No clients found matching your criteria.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
