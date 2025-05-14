'use client';

import Layout from '@/components/Layout';
import {useState}from 'react';
import {Button}from '@/components/ui/button';
import {Input}from '@/components/ui/input';
import {Textarea}from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {useToast}from '@/hooks/use-toast';

export default function NewClientPage() {
  return (
    <Layout>
      <NewClientContent />
    </Layout>
  );
}

function NewClientContent() {
  const [shopName, setShopName] = useState('');
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const {toast} = useToast(); 

  const handleSaveClient = async () => {
    if (!shopName.trim() || !clientName.trim() || !phoneNumber.trim() || !address.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all fields.',
      });
      return;
    }

    setIsSaving(true);
    const savingToast = toast({ // Get the toast object with methods
      title: 'Saving Client...',
      description: 'Please wait while we save your data to MongoDB.',
    });


    try {
      // Prepare client data for MongoDB
      const newClientData = {
        shopName: shopName.trim(),
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
      };
      
      // Save client to MongoDB using API route
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClientData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save client');
      }
      
      const result = await response.json();
      
      // Clear form and update UI
      setShopName('');
      setClientName('');
      setPhoneNumber('');
      setAddress('');
      
      if (savingToast) {
        savingToast.update({ 
          title: 'Client Saved Successfully!',
          description: `${newClientData.clientName}'s details have been saved to the database.`,
        });
      }
    } catch (error) {
      console.error('Error saving client:', error);
      if (savingToast) {
        savingToast.update({ 
          variant: 'destructive',
          title: 'Error Saving Client',
          description: 'There was a problem saving the client data. Please try again.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">New Client</CardTitle>
          <CardDescription>Enter client details. Data will be saved directly to MongoDB.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="shopName">Shop Name</label>
            <Input id="shopName" value={shopName} onChange={e => setShopName(e.target.value)} maxLength={50} disabled={isSaving} placeholder="Enter shop name"/>
          </div>
          <div className="grid gap-2">
            <label htmlFor="clientName">Client Name</label>
            <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} maxLength={50} disabled={isSaving} placeholder="Enter client name"/>
          </div>
          <div className="grid gap-2">
            <label htmlFor="phoneNumber">Phone Number</label>
            <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={isSaving} placeholder="Enter phone number"/>
          </div>
          <div className="grid gap-2">
            <label htmlFor="address">Address</label>
            <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} disabled={isSaving} placeholder="Enter full address" rows={3}/>
          </div>
          <Button onClick={handleSaveClient} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Client'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
