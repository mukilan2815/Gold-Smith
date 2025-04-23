
import Layout from '@/components/Layout';

export default function NewClientPage() {
  return (
    <Layout>
      <NewClientContent />
    </Layout>
  );
}

'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from '@/hooks/use-toast';

function NewClientContent() {
  const [shopName, setShopName] = useState('');
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const {toast} = useToast();

  const handleSaveClient = async () => {
    // Basic save logic (replace with Firestore)
    toast({
      title: 'Client Saved!',
      description: `${clientName}'s details have been saved.`,
    });
  };

  return (
    <div className="flex justify-center items-center h-screen bg-secondary">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">New Client</CardTitle>
          <CardDescription>Enter the client details below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="shopName">Shop Name</label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="clientName">Client Name</label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phoneNumber">Phone Number</label>
            <Input
              id="phoneNumber"
              type="number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="address">Address</label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveClient}>Save Client</Button>
        </CardContent>
      </Card>
    </div>
  );
}

    