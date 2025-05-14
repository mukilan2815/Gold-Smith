'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Client {
  id: string; // MongoDB _id as string
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: Date; 
}

interface ClientReceipt {
  id: string; // MongoDB _id as string
  clientId: string;
  clientName: string; 
  metalType: string;
  issueDate: string; // Or Date, needs consistent handling
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number;
  };
  createdAt?: Date;
}

// Structure for items stored in MongoDB (within AdminReceipts)
interface GivenItemMongo {
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number;
}

interface ReceivedItemMongo {
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string;
  subTotal: number;
  total: number;
}

interface GivenDataMongo {
  date: Date | null; 
  items: GivenItemMongo[];
  totalPureWeight: number;
  total: number;
}

interface ReceivedDataMongo {
  date: Date | null; 
  items: ReceivedItemMongo[];
  totalOrnamentsWt: number;
  totalStoneWeight: number;
  totalSubTotal: number;
  total: number;
}

// AdminReceipt structure to align with MongoDB's AdminReceipts collection
interface AdminReceipt {
  id: string; // Corresponds to _id from MongoDB
  clientId: string;
  clientName: string;
  given: GivenDataMongo | null;
  received: ReceivedDataMongo | null;
  status: 'complete' | 'incomplete' | 'empty';
  createdAt: Date; 
  updatedAt: Date; 
}

export default function ViewCustomerDetailsPage() {
  return (
    <Layout>
      <ViewCustomerDetailsContent />
    </Layout>
  );
}

function ViewCustomerDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = searchParams.get('clientId');

  const [client, setClient] = useState<Client | null>(null);
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [adminReceipts, setAdminReceipts] = useState<AdminReceipt[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingAdminReceipts, setLoadingAdminReceipts] = useState(true);

  const fetchClientDetails = useCallback(async () => {
    if (!clientId) {
      toast({ variant: "destructive", title: "Error", description: "Client ID is missing. Cannot load details." });
      setLoadingClient(false);
      router.push('/customer-details');
      return;
    }
    setLoadingClient(true);
    try {
      // Fetch client details from API
      const response = await fetch(`/api/clients/${clientId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch client details');
      }
      
      const clientData = await response.json();
      
      // Transform MongoDB _id to id for frontend use
      setClient({
        ...clientData,
        id: clientData._id ? clientData._id.toString() : `temp-${Math.random().toString(36).substr(2, 9)}`
      });
    } catch (error) {
      console.error(`Error fetching client details for ID ${clientId}:`, error);
      toast({
        variant: 'destructive',
        title: 'Error Fetching Client',
        description: 'There was a problem loading client details. Please try again.'
      });
      setClient(null);
      router.push('/customer-details');
    } finally {
      setLoadingClient(false);
    }
  }, [clientId, router, toast]);


  const fetchClientReceipts = useCallback(async () => {
    if (!clientId) {
      setLoadingReceipts(false);
      return;
    }
    setLoadingReceipts(true);
    try {
      // Fetch client receipts from our API endpoint
      const response = await fetch(`/api/receipts?clientId=${clientId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch receipts: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform MongoDB _id to id for frontend use
      setReceipts(data.map((receipt: any) => ({
        ...receipt,
        id: receipt.id || receipt._id?.toString(), // Handle both formats
        clientId: receipt.clientId,
        clientName: receipt.clientName,
        metalType: receipt.metalType,
        issueDate: receipt.issueDate ? new Date(receipt.issueDate).toISOString() : null,
        totals: receipt.totals || {
          grossWt: 0,
          netWt: 0,
          finalWt: 0,
          stoneAmt: 0,
          stoneWt: 0
        }
      })));
    } catch (error) {
      console.error(`Error fetching receipts for client ID ${clientId}:`, error);
      toast({
        variant: 'default',
        title: 'No Receipts Found',
        description: 'No receipts found for this client yet.'
      });
      setReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  }, [clientId, toast]);


  const fetchAdminReceipts = useCallback(async () => {
    if (!clientId) {
      setLoadingAdminReceipts(false);
      return;
    }
    setLoadingAdminReceipts(true);
    try {
      // Fetch admin receipts from our API endpoint
      const response = await fetch(`/api/admin-receipts?clientId=${clientId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch admin receipts: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform MongoDB _id to id for frontend use
      setAdminReceipts(data.map((receipt: any) => ({
        ...receipt,
        id: receipt.id || receipt._id?.toString(), // Handle both formats
        given: receipt.given ? {
          ...receipt.given,
          date: receipt.given.date ? new Date(receipt.given.date) : null
        } : null,
        received: receipt.received ? {
          ...receipt.received,
          date: receipt.received.date ? new Date(receipt.received.date) : null
        } : null,
        createdAt: receipt.createdAt ? new Date(receipt.createdAt) : new Date(),
        updatedAt: receipt.updatedAt ? new Date(receipt.updatedAt) : new Date()
      })));
    } catch (error) {
      console.error(`Error fetching admin receipts for client ID ${clientId}:`, error);
      toast({
        variant: 'default',
        title: 'No Admin Receipts Found',
        description: 'No admin receipts found for this client yet.'
      });
      setAdminReceipts([]);
    } finally {
      setLoadingAdminReceipts(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchClientDetails();
    fetchClientReceipts();
    fetchAdminReceipts();
  }, [fetchClientDetails, fetchClientReceipts, fetchAdminReceipts]);

  const handleViewFullReceipt = (receipt: ClientReceipt) => {
    router.push(`/receipt/details?receiptId=${receipt.id}&clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}`);
  };

  const handleViewAdminReceipt = (receipt: AdminReceipt) => {
    router.push(`/admin-receipt/details?receiptId=${receipt.id}&clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}`);
  };
  
  const handleViewAdminBill = (receipt: AdminReceipt) => {
    router.push(`/admin-bill/view?receiptId=${receipt.id}`);
  };

  const handleDeleteClient = async (clientToDelete: Client) => {
    try {
      // Call API to delete the client
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      toast({ 
        title: 'Client Deleted', 
        description: `Client ${clientToDelete.clientName} has been successfully deleted.`,
        variant: 'default'
      });
      
      // Navigate back to client list
      router.push('/customer-details');
    } catch (error) {
      console.error(`Error deleting client ID ${clientToDelete.id}:`, error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'There was a problem deleting the client. Please try again.'
      });
    }
  };

  if (loadingClient) {
    return (
      <Layout><div className="flex justify-center items-center min-h-screen p-4"><p>Loading client details...</p></div></Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center min-h-screen p-4">
          <p className="text-destructive mb-4">Client details could not be loaded or client not found.</p>
          <Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8">
        <Card className="mb-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{client.clientName}</CardTitle>
              <CardDescription>Shop: {client.shopName || 'N/A'}. Client ID: {client.id.substring(0,10)}...</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push(`/customer-details/edit?clientId=${client.id}`)} 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                  <path d="m15 5 4 4"></path>
                </svg>
                Edit Client
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex items-center gap-1">
                    <Trash2 className="h-4 w-4" /> Delete Client
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the client {client.clientName} and all associated data.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteClient(client)} className={cn(buttonVariants({variant: 'destructive'}))}>
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => router.back()} variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Client List</Button>
            </div>
          </CardHeader>
          <CardContent>
            <p><strong>Phone:</strong> {client.phoneNumber || 'N/A'}</p>
            <p><strong>Address:</strong> {client.address || 'N/A'}</p>
            {client.createdAt && (<p className="text-sm text-muted-foreground">Client Since: {format(new Date(client.createdAt), 'PPP')}</p>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Receipts for {client.clientName}</CardTitle>
            <CardDescription>View all receipts associated with this client</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceipts ? (
              <p className="text-muted-foreground text-center">Loading receipts...</p>
            ) : receipts.length > 0 ? (
              <ScrollArea className="h-[30vh] w-full rounded-md border">
                <ul className="p-4 space-y-3">
                  {receipts.map((receipt) => {
                    let formattedIssueDate = 'N/A';
                    if (receipt.issueDate && isValid(parseISO(receipt.issueDate))) {
                       formattedIssueDate = format(parseISO(receipt.issueDate), 'PPP');
                    } else if (receipt.issueDate) { // If it's a Date object but not string
                        try { formattedIssueDate = format(new Date(receipt.issueDate), 'PPP'); } catch (e) {/* ignore */}
                    }
                    return (
                      <li key={receipt.id} className="border rounded-md p-3 flex justify-between items-center bg-card hover:bg-muted/50">
                        <div>
                          <p className="font-medium">Receipt ID: {receipt.id.substring(0,10)}...</p>
                          <p className="text-sm text-muted-foreground">Issue Date: {formattedIssueDate}</p>
                          <p className="text-sm">Metal: {receipt.metalType}</p>
                          <p className="text-sm">Final Weight: {receipt.totals.finalWt.toFixed(3)}</p>
                          <p className="text-sm">Stone Amount: {receipt.totals.stoneAmt.toFixed(2)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewFullReceipt(receipt)}><Eye className="mr-2 h-4 w-4" /> View Full Receipt</Button>
                      </li>);})}                
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center">No receipts found for this client.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Admin Receipts for {client.clientName}</CardTitle>
            <CardDescription>View all admin receipts associated with this client</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAdminReceipts ? (
              <p className="text-muted-foreground text-center">Loading admin receipts...</p>
            ) : adminReceipts.length > 0 ? (
              <ScrollArea className="h-[30vh] w-full rounded-md border">
                <ul className="p-4 space-y-3">
                  {adminReceipts.map((receipt) => {
                    const givenDate = receipt.given?.date ? format(new Date(receipt.given.date), 'PPP') : 'N/A';
                    const receivedDate = receipt.received?.date ? format(new Date(receipt.received.date), 'PPP') : 'N/A';
                    
                    return (
                      <li key={receipt.id} className="border rounded-md p-3 flex justify-between items-center bg-card hover:bg-muted/50">
                        <div>
                          <p className="font-medium">Admin Receipt ID: {receipt.id.substring(0,10)}...</p>
                          <div className="flex items-center gap-2 my-1">
                            <p className="text-sm">Status:</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${receipt.status === 'complete' ? 'bg-green-100 text-green-800' : receipt.status === 'incomplete' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                            </span>
                          </div>
                          {receipt.given && (
                            <div className="text-sm">
                              <p>Given Date: {givenDate}</p>
                              <p>Given Total: {receipt.given.total.toFixed(3)}</p>
                            </div>
                          )}
                          {receipt.received && (
                            <div className="text-sm">
                              <p>Received Date: {receivedDate}</p>
                              <p>Received Total: {receipt.received.total.toFixed(3)}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewAdminReceipt(receipt)}>
                            <Eye className="mr-2 h-4 w-4" /> View Receipt Details
                          </Button>
                          {receipt.status === 'complete' && (
                            <Button variant="default" size="sm" onClick={() => handleViewAdminBill(receipt)}>
                              <Eye className="mr-2 h-4 w-4" /> View Bill
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center">No admin receipts found for this client.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
