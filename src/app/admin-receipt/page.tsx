'use client';

import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the Client interface based on localStorage structure
interface Client {
  id: string; // Assuming clients have a unique ID when stored
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load clients from localStorage on component mount
    try {
      const storedClients = localStorage.getItem('clients');
      if (storedClients) {
        // Assuming clients are stored as an array, add IDs for navigation key
        const parsedClients = JSON.parse(storedClients).map((client: any, index: number) => ({
          ...client,
          // Generate a simple unique ID based on index if none exists
          // In a real Firestore scenario, Firestore document ID would be used
          id: client.id || `${client.clientName}-${client.phoneNumber}-${index}`
        }));
        setClients(parsedClients.sort((a: Client, b: Client) => a.clientName.localeCompare(b.clientName))); // Sort initially
      }
    } catch (error) {
      console.error("Error loading clients from localStorage:", error);
      // Handle error appropriately, maybe show a toast message
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredClients = clients.filter((client) => {
    const shopNameMatch = client.shopName?.toLowerCase().includes(shopNameFilter.toLowerCase()) ?? true;
    const clientNameMatch = client.clientName?.toLowerCase().includes(clientNameFilter.toLowerCase()) ?? true;
    const phoneNumberMatch = client.phoneNumber?.includes(phoneNumberFilter) ?? true;
    return shopNameMatch && clientNameMatch && phoneNumberMatch;
  });

  const handleClientSelection = (client: Client) => {
    // Navigate to Admin Receipt Page 2 with client ID
    // Replace '/admin-receipt/details' with the actual path for page 2
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
              type="number" // Use number type for phone number consistency
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
                    key={client.id} // Use unique ID as key
                    className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mb-3 md:mb-0">
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
