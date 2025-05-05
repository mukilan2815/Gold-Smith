
'use client';

import Layout from '@/components/Layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import { db } from '@/lib/firebase'; // Import Firestore instance

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
  const [isSaving, setIsSaving] = useState(false); // Add saving state
  const { toast } = useToast();

  const handleSaveClient = async () => {
    // Validate input
    if (
      shopName.trim() === '' ||
      clientName.trim() === '' ||
      phoneNumber.trim() === '' ||
      address.trim() === ''
    ) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all fields.',
      });
      return;
    }

    setIsSaving(true); // Indicate saving process started

    try {
      // Create new client object for Firestore
      const newClient = {
        shopName: shopName.trim(),
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        createdAt: serverTimestamp(), // Add a timestamp for sorting
      };

      // Add the new client to the 'Clients' collection in Firestore
      const docRef = await addDoc(collection(db, 'Clients'), newClient);

      toast({
        title: 'Client Saved!',
        description: `${clientName}'s details have been saved successfully. (ID: ${docRef.id})`,
      });

      // Clear the form after successful save
      setShopName('');
      setClientName('');
      setPhoneNumber('');
      setAddress('');

    } catch (error) {
      console.error("Error adding client to Firestore: ", error);
      toast({
        variant: 'destructive',
        title: 'Save Error',
        description: 'Could not save client details. Please try again.',
      });
    } finally {
      setIsSaving(false); // Indicate saving process finished
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-secondary p-4"> {/* Adjusted padding and min-height */}
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
              disabled={isSaving} // Disable input while saving
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="clientName">Client Name</label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={50}
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phoneNumber">Phone Number</label>
            <Input
              id="phoneNumber"
              type="text" // Changed to text for flexibility (e.g., +,-, spaces)
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="address">Address</label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <Button onClick={handleSaveClient} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Client'} {/* Show loading state */}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
