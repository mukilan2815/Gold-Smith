'use client';

import Layout from '@/components/Layout';

import {useState} from 'react';
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
  const router = useRouter();

  const handleClientSelection = () => {
    // Navigate to Receipt Page 2 with client details
    router.push('/receipt/details');
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

          {/* Placeholder for Client List - Replace with actual data and rendering */}
          <div className="border rounded-md p-4">
            <p className="text-muted-foreground">
              Client List (Replace this with actual client data)
            </p>
            <Button onClick={handleClientSelection} className="mt-4">
              Select Client
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
