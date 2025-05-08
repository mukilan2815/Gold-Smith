
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
  const {toast, dismiss} = useToast();

  const handleSaveClient = async () => {
    if (
      !shopName.trim() ||
      !clientName.trim() ||
      !phoneNumber.trim() ||
      !address.trim()
    ) {
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
      description: 'Please wait. This may take a moment depending on network and database speed.',
    });

    try {
      const newClientRef = doc(collection(db, 'ClientDetails')); // Generate ID client-side for optimistic updates
      const newClient = {
        id: newClientRef.id, // Store the generated ID
        shopName: shopName.trim(),
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        createdAt: serverTimestamp(),
      };

      // Optimistically clear form
      setShopName('');
      setClientName('');
      setPhoneNumber('');
      setAddress('');
      
      await setDoc(newClientRef, newClient);

      dismiss(savingToast.id); // Dismiss "Saving..." toast
      toast({
        title: 'Client Saved!',
        description: `${newClient.clientName}'s details saved successfully. ID: ${newClient.id}`,
      });
    } catch (error: any) {
      console.error('Error adding client to Firestore: ', error);
      dismiss(savingToast.id); // Dismiss "Saving..." toast
      toast({
        variant: 'destructive',
        title: 'Save Error',
        description: `Could not save client details. Error: ${error.message || 'Unknown error'}. If this persists, check network and Firestore status.`,
      });
      // Optionally, re-populate form with original values if save fails and form was cleared
      // setShopName(newClient.shopName); // etc.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-secondary p-4">
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
              onChange={e => setShopName(e.target.value)}
              maxLength={50}
              disabled={isSaving}
              placeholder="Enter shop name"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="clientName">Client Name</label>
            <Input
              id="clientName"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              maxLength={50}
              disabled={isSaving}
              placeholder="Enter client name"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phoneNumber">Phone Number</label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              disabled={isSaving}
              placeholder="Enter phone number"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="address">Address</label>
            <Textarea
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              disabled={isSaving}
              placeholder="Enter full address"
              rows={3}
            />
          </div>
          <Button onClick={handleSaveClient} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Client'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
