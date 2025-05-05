
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
  // The 'use client' directive is added by default by the containing component pattern
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
  const { toast } = useToast();

  const handleSaveClient = async () => {
    console.log('Attempting to save client...'); // Debug log

    // Basic client-side validation
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
      console.log('Validation failed.'); // Debug log
      return;
    }

    setIsSaving(true);
    console.log('Saving state set to true.'); // Debug log

    try {
      const newClient = {
        shopName: shopName.trim(),
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        createdAt: serverTimestamp(),
      };

      console.log('Client data prepared:', newClient); // Debug log

      const docRef = await addDoc(collection(db, 'Clients'), newClient);
      console.log('Client added with ID:', docRef.id); // Debug log

      toast({
        title: 'Client Saved!',
        description: `${clientName}'s details saved successfully. (ID: ${docRef.id})`,
      });

      // Reset form fields
      setShopName('');
      setClientName('');
      setPhoneNumber('');
      setAddress('');
      console.log('Form cleared.'); // Debug log

    } catch (error: any) { // Catch specific error type if possible
      console.error("Error adding client to Firestore: ", error); // Log the full error
      toast({
        variant: 'destructive',
        title: 'Save Error',
        description: `Could not save client details. Error: ${error.message || 'Unknown error'}`, // Show error message
      });
    } finally {
      setIsSaving(false);
      console.log('Saving state set to false.'); // Debug log
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
              onChange={(e) => setShopName(e.target.value)}
              maxLength={50}
              disabled={isSaving}
              placeholder="Enter shop name" // Added placeholder
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
              placeholder="Enter client name" // Added placeholder
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phoneNumber">Phone Number</label>
            <Input
              id="phoneNumber"
              type="tel" // Changed to tel for semantic correctness
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSaving}
              placeholder="Enter phone number" // Added placeholder
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="address">Address</label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isSaving}
              placeholder="Enter full address" // Added placeholder
              rows={3} // Adjusted rows for better default size
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
