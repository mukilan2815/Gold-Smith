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
// import {collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; // Firebase removed
// import {db}from '@/lib/firebase'; // Firebase removed

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
    const savingToast = toast({
      title: 'Saving Client...',
      description: 'Please wait. Data will be saved to SQL database once configured.',
    });

    // TODO: Implement SQL data saving for new client
    // Example: 
    // const newClientData = {
    //   shopName: shopName.trim(),
    //   clientName: clientName.trim(),
    //   phoneNumber: phoneNumber.trim(),
    //   address: address.trim(),
    //   createdAt: new Date(), // Or handle timestamp in SQL
    // };
    // const result = await saveClientToSQL(newClientData);
    // if (result.success) { ... } else { ... }

    console.warn("Client saving not implemented. Waiting for SQL database setup.");
    // Simulate save for UI update
    setTimeout(() => {
        setShopName('');
        setClientName('');
        setPhoneNumber('');
        setAddress('');
        toast.update(savingToast.id, { 
            title: 'Client Data Prepared (SQL Save Pending)!',
            description: `${clientName.trim()}'s details prepared. Actual save to SQL database pending configuration.`,
        });
        setIsSaving(false);
    }, 1500); // Simulate delay
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">New Client</CardTitle>
          <CardDescription>Enter client details. Data will be saved to SQL database once configured.</CardDescription>
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
