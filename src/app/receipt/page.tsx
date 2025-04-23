'use client';

import Layout from '@/components/Layout';
import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

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
  const [clients, setClients] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load clients from localStorage
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
      setClients(JSON.parse(storedClients));
    }
  }, []);

  const filteredClients = clients.filter((client) => {
    return (
      client.shopName.toLowerCase().includes(shopNameFilter.toLowerCase()) &&
      client.clientName.toLowerCase().includes(clientNameFilter.toLowerCase()) &&
      client.phoneNumber.includes(phoneNumberFilter)
    );
  });

  const handleClientSelection = (client: any) => {
    // Navigate to Receipt Page 2 with client details
    router.push(`/receipt/details?clientName=${client.clientName}`);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Select Client</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Shop Name"
              value={shopNameFilter}
              onChange={(e) => setShopNameFilter(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Client Name"
              value={clientNameFilter}
              onChange={(e) => setClientNameFilter(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Phone Number"
              value={phoneNumberFilter}
              onChange={(e) => setPhoneNumberFilter(e.target.value)}
            />
          </div>

          {/* Client List */}
          <div>
            {filteredClients.length > 0 ? (
              <ul>
                {filteredClients.map((client, index) => (
                  <li
                    key={index}
                    className="border rounded-md p-4 mb-2 flex justify-between items-center"
                  >
                    <div>
                      <p>
                        <strong>Shop Name:</strong> {client.shopName}
                      </p>
                      <p>
                        <strong>Client Name:</strong> {client.clientName}
                      </p>
                      <p>
                        <strong>Phone Number:</strong> {client.phoneNumber}
                      </p>
                      <p>
                        <strong>Address:</strong> {client.address}
                      </p>
                    </div>
                    <Button onClick={() => handleClientSelection(client)}>
                      Select Client
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No clients found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
