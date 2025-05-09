'use client';

import Layout from '@/components/Layout';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {useToast} from '@/hooks/use-toast';
import {collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {db} from '@/lib/firebase';

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
  const {toast} = useToast(); // Removed dismiss as it's part of toast object now

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
      description: 'Please wait. If this takes too long, ensure Firestore indexes are set up for ClientDetails (e.g., on createdAt).',
    });

    const originalShopName = shopName;
    const originalClientName = clientName;
    const originalPhoneNumber = phoneNumber;
    const originalAddress = address;

    try {
      const newClientRef = doc(collection(db, 'ClientDetails'));
      const newClientData = {
        // id: newClientRef.id, // No longer storing ID within the document itself as Firestore provides it
        shopName: shopName.trim(),
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        createdAt: serverTimestamp(),
      };

      await setDoc(newClientRef, newClientData);

      // Clear form only after successful save
      setShopName('');
      setClientName('');
      setPhoneNumber('');
      setAddress('');
      
      toast.update(savingToast.id, { // Use toast.update
        title: 'Client Saved!',
        description: `${newClientData.clientName}'s details saved successfully. ID: ${newClientRef.id}`,
      });

    } catch (error: any) {
      console.error('Error adding client to Firestore: ', error);
      toast.update(savingToast.id, { // Use toast.update
        variant: 'destructive',
        title: 'Save Error',
        description: `Could not save client details. Error: ${error.message || 'Unknown error'}. Check network, Firestore status, and console.`,
      });
      // Re-populate form with original values if save fails
      setShopName(originalShopName);
      setClientName(originalClientName);
      setPhoneNumber(originalPhoneNumber);
      setAddress(originalAddress);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">New Client</CardTitle>
          <CardDescription>Enter the client details below. Slow saving? Check Firestore indexes.</CardDescription>
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
