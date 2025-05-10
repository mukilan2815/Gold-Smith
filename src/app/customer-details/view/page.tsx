'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye } from 'lucide-react';

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
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  const fetchClientDetails = useCallback(async () => {
    if (!clientId) {
      toast({ variant: "destructive", title: "Error", description: "Client ID is missing. Cannot load details." });
      setLoadingClient(false);
      router.push('/customer-details');
      return;
    }
    setLoadingClient(true);
    // TODO: Implement MongoDB data fetching for client details
    // Example: const clientData = await fetchClientFromMongoDB(clientId);
    // if (clientData) setClient({...clientData, id: clientData._id.toString()}); else { toast({...}); router.push('/customer-details');}
    console.warn(`Client details fetching for ID ${clientId} not implemented. Waiting for MongoDB setup.`);
    toast({
        title: "Data Fetching Pending",
        description: `Client details for ${clientId} will be loaded once MongoDB is configured.`,
        variant: "default"
    });
    setClient(null); 
    setLoadingClient(false);
  }, [clientId, router, toast]);

  const fetchClientReceipts = useCallback(async () => {
    if (!clientId) {
      setLoadingReceipts(false);
      return;
    }
    setLoadingReceipts(true);
    // TODO: Implement MongoDB data fetching for client's receipts
    // Example: const fetchedReceipts = await fetchReceiptsForClientFromMongoDB(clientId);
    // setReceipts(fetchedReceipts.map(r => ({...r, id: r._id.toString(), issueDate: new Date(r.issueDate).toISOString() })));
     console.warn(`Client receipts fetching for client ID ${clientId} not implemented. Waiting for MongoDB setup.`);
    toast({
        title: "Data Fetching Pending",
        description: `Receipts for client ${clientId} will be loaded once MongoDB is configured.`,
        variant: "default"
    });
    setReceipts([]); 
    setLoadingReceipts(false);
  }, [clientId, toast]);

  useEffect(() => {
    fetchClientDetails();
    fetchClientReceipts();
  }, [fetchClientDetails, fetchClientReceipts]);

  const handleViewFullReceipt = (receipt: ClientReceipt) => {
    router.push(`/receipt/details?receiptId=${receipt.id}&clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}`);
  };

  if (loadingClient) {
    return (
      <Layout><div className="flex justify-center items-center min-h-screen p-4"><p>Loading client details... Waiting for MongoDB configuration.</p></div></Layout>
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
            <Button onClick={() => router.back()} variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Client List</Button>
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
            <CardDescription>Receipts will be loaded from MongoDB once configured.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceipts ? (
              <p className="text-muted-foreground text-center">Loading receipts... Waiting for MongoDB configuration.</p>
            ) : receipts.length > 0 ? (
              <ScrollArea className="h-[40vh] w-full rounded-md border">
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
              <p className="text-muted-foreground text-center">No receipts found for this client. Waiting for MongoDB configuration.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
