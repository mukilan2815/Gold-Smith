'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface Client {
  id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
}

export default function EditCustomerPage() {
  return (
    <Layout>
      <EditCustomerContent />
    </Layout>
  );
}

function EditCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const clientId = searchParams.get('clientId');

  const [client, setClient] = useState<Client>({
    id: '',
    shopName: '',
    clientName: '',
    phoneNumber: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Client ID is missing. Cannot load details." 
      });
      router.push('/customer-details');
      return;
    }

    async function fetchClientDetails() {
      setLoading(true);
      try {
        const response = await fetch(`/api/clients/${clientId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch client details');
        }
        
        const clientData = await response.json();
        
        setClient({
          id: clientData._id || clientData.id,
          shopName: clientData.shopName || '',
          clientName: clientData.clientName || '',
          phoneNumber: clientData.phoneNumber || '',
          address: clientData.address || ''
        });
      } catch (error) {
        console.error(`Error fetching client details for ID ${clientId}:`, error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Client',
          description: 'There was a problem loading client details. Please try again.'
        });
        router.push('/customer-details');
      } finally {
        setLoading(false);
      }
    }

    fetchClientDetails();
  }, [clientId, router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: client.shopName,
          clientName: client.clientName,
          phoneNumber: client.phoneNumber,
          address: client.address
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update client');
      }

      toast({ 
        title: 'Client Updated', 
        description: 'Client details have been successfully updated.',
        variant: 'default'
      });

      // Navigate back to client details view
      router.push(`/customer-details/view?clientId=${clientId}`);
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was a problem updating the client details. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen p-4"><p>Loading client details...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Edit Client Details</CardTitle>
              <CardDescription>Update information for {client.clientName}</CardDescription>
            </div>
            <Button 
              onClick={() => router.push(`/customer-details/view?clientId=${clientId}`)} 
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                name="shopName"
                value={client.shopName}
                onChange={handleInputChange}
                placeholder="Enter shop name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                name="clientName"
                value={client.clientName}
                onChange={handleInputChange}
                placeholder="Enter client name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={client.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={client.address}
                onChange={handleInputChange}
                placeholder="Enter address"
                required
              />
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full md:w-auto" 
                disabled={submitting}
              >
                {submitting ? (
                  'Saving...' 
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}