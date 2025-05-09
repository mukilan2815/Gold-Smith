'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp, limit, DocumentData } from 'firebase/firestore';
import { format, parseISO, isValid } from 'date-fns';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { ArrowLeft, Eye } from 'lucide-react';

interface Client {
  id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt?: Timestamp;
}

interface ClientReceipt {
  id: string;
  clientId: string;
  clientName: string; // Persisted on receipt
  metalType: string;
  issueDate: string; // ISO string
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number;
  };
  createdAt?: Timestamp;
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
    try {
      const clientRef = doc(db, 'ClientDetails', clientId);
      const docSnap = await getDoc(clientRef);
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...(docSnap.data() as Omit<Client, 'id'>) });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: `Client with ID ${clientId} not found.` });
        router.push('/customer-details');
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast({ variant: "destructive", title: "Error Loading Client", description: "Could not load client details. Check Firestore setup, console, and relevant indexes for 'ClientDetails'. See firestore.indexes.md." });
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
      const receiptsRef = collection(db, 'ClientReceipts');
      // This query is critical and needs a composite index: (clientId ==, createdAt desc)
      const q = query(
        receiptsRef,
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const fetchedReceipts: ClientReceipt[] = [];
      querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap
        const data = docSnap.data() as DocumentData;
        fetchedReceipts.push({ 
            id: docSnap.id, 
            clientId: data.clientId || '',
            clientName: data.clientName || 'N/A',
            metalType: data.metalType || 'N/A',
            issueDate: data.issueDate || '', // Expecting ISO string
            totals: data.totals || { grossWt: 0, netWt: 0, finalWt: 0, stoneAmt: 0, stoneWt: 0 },
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
        } as ClientReceipt);
      });
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error("Error fetching client receipts:", error);
      toast({ 
        variant: "destructive", 
        title: "Error Fetching Client Receipts", 
        description: "Could not load receipts. CRITICAL: A composite Firestore index on 'ClientReceipts' for (clientId ASC, createdAt DESC) is ESSENTIAL for this page. Please create it. Check console and firestore.indexes.md."
      });
    } finally {
      setLoadingReceipts(false);
    }
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
      <Layout><div className="flex justify-center items-center min-h-screen p-4"><p>Loading client details... If slow, check Firestore indexes for 'ClientDetails'. See firestore.indexes.md.</p></div></Layout>
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
            {client.createdAt && (<p className="text-sm text-muted-foreground">Client Since: {format(client.createdAt.toDate(), 'PPP')}</p>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Receipts for {client.clientName}</CardTitle>
            <CardDescription>Slow loading? CRITICAL: Ensure Firestore composite index on 'ClientReceipts' (clientId ASC, createdAt DESC) is active. See firestore.indexes.md.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceipts ? (
              <p className="text-muted-foreground text-center">Loading receipts... This requires a specific Firestore composite index for 'ClientReceipts' (clientId ASC, createdAt DESC). Performance will be poor without it. See firestore.indexes.md.</p>
            ) : receipts.length > 0 ? (
              <ScrollArea className="h-[40vh] w-full rounded-md border">
                <ul className="p-4 space-y-3">
                  {receipts.map((receipt) => {
                    let formattedIssueDate = 'N/A';
                    if (receipt.issueDate && isValid(parseISO(receipt.issueDate))) {
                       formattedIssueDate = format(parseISO(receipt.issueDate), 'PPP');
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
              <p className="text-muted-foreground text-center">No receipts found for this client. If receipts exist and are not showing, or loading is slow, check the critical composite index for 'ClientReceipts' (clientId ASC, createdAt DESC). See firestore.indexes.md.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
