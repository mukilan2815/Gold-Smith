
'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { format, isValid, parseISO } from 'date-fns'; // Import isValid, parseISO

import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// --- Interfaces (Matching Firestore structure) ---
interface GivenItem {
  id: string;
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number; // Stored as calculated number
}

interface ReceivedItem {
  id: string;
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  subTotal: number; // Stored as calculated number
  makingChargePercent: string;
  total: number; // Stored as calculated number
}

interface AdminReceiptData {
  clientId: string;
  clientName: string;
  dateGiven: string | null; // ISO String or null
  given: GivenItem[];
  dateReceived: string | null; // ISO String or null
  received: ReceivedItem[] | null; // Array or null
  createdAt?: Timestamp; // Firestore Timestamp
  updatedAt?: Timestamp; // Firestore Timestamp
}

// --- Helper Functions (Copied from details for consistency) ---
const calculateGivenTotal = (item: GivenItem): number => {
  const pureWeight = parseFloat(item.pureWeight) || 0;
  const purePercent = parseFloat(item.purePercent) || 0;
  const melting = parseFloat(item.melting) || 0;
  if (melting === 0) return 0;
  const total = (pureWeight * purePercent) / melting;
  return parseFloat(total.toFixed(3));
};

const calculateReceivedSubTotal = (item: ReceivedItem): number => {
  const finalOrnamentsWt = parseFloat(item.finalOrnamentsWt) || 0;
  const stoneWeight = parseFloat(item.stoneWeight) || 0;
  const subTotal = finalOrnamentsWt - stoneWeight;
  return parseFloat(subTotal.toFixed(3));
};

const calculateReceivedTotal = (item: ReceivedItem): number => {
  const subTotal = calculateReceivedSubTotal(item);
  const makingChargePercent = parseFloat(item.makingChargePercent) || 0;
  const total = subTotal * (makingChargePercent / 100);
  return parseFloat(total.toFixed(3));
};


export default function AdminBillViewPage() {
  return (
    <Layout>
      <AdminBillViewContent />
    </Layout>
  );
}

function AdminBillViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const receiptId = searchParams.get('receiptId');

  const [receiptData, setReceiptData] = useState<AdminReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  // State for manual calculation
  const [manualGivenTotal, setManualGivenTotal] = useState('');
  const [manualReceivedTotal, setManualReceivedTotal] = useState('');
  const [manualOperation, setManualOperation] = useState<'add' | 'subtract'>('subtract');


  // --- Fetch Receipt Data ---
  useEffect(() => {
    const fetchReceipt = async () => {
      if (!receiptId) {
        toast({ variant: "destructive", title: "Error", description: "Receipt ID is missing." });
        setLoading(false);
        router.push('/admin-bill');
        return;
      }
      setLoading(true);
      try {
        const receiptRef = doc(db, 'AdminReceipts', receiptId);
        const docSnap = await getDoc(receiptRef);

        if (docSnap.exists()) {
          setReceiptData({ id: docSnap.id, ...docSnap.data() } as AdminReceiptData);
        } else {
          toast({ variant: "destructive", title: "Not Found", description: "Receipt not found." });
          router.push('/admin-bill');
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load receipt details." });
         router.push('/admin-bill');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId, toast, router]);

  // --- Calculations for Totals ---
  const calculateTotals = (items: (GivenItem | ReceivedItem)[], type: 'given' | 'received') => {
    let totalPureWeight = 0;
    let totalGivenTotal = 0;
    let totalFinalOrnamentsWt = 0;
    let totalStoneWeight = 0;
    let totalReceivedSubTotal = 0;
    let totalReceivedTotal = 0;

    if (type === 'given' && items) {
        (items as GivenItem[]).forEach(item => {
            const itemTotal = calculateGivenTotal(item); // Use helper
            totalPureWeight += parseFloat(item.pureWeight) || 0;
            totalGivenTotal += itemTotal;
        });
    } else if (type === 'received' && items) { // received and items exist
        (items as ReceivedItem[]).forEach(item => {
             const itemSubTotal = calculateReceivedSubTotal(item); // Use helper
             const itemTotal = calculateReceivedTotal(item);    // Use helper
             totalFinalOrnamentsWt += parseFloat(item.finalOrnamentsWt) || 0;
             totalStoneWeight += parseFloat(item.stoneWeight) || 0;
             totalReceivedSubTotal += itemSubTotal;
             totalReceivedTotal += itemTotal;
        });
    }

    return {
        totalPureWeight: totalPureWeight.toFixed(3),
        totalGivenTotal: totalGivenTotal.toFixed(3),
        totalFinalOrnamentsWt: totalFinalOrnamentsWt.toFixed(3),
        totalStoneWeight: totalStoneWeight.toFixed(3),
        totalReceivedSubTotal: totalReceivedSubTotal.toFixed(3),
        totalReceivedTotal: totalReceivedTotal.toFixed(3),
    };
  };

  const givenTotals = receiptData?.given ? calculateTotals(receiptData.given, 'given') : null;
  // Ensure receiptData.received is treated as an array, even if null
  const receivedTotals = calculateTotals(receiptData?.received ?? [], 'received');


   // --- Manual Calculation ---
   const calculateManualResult = () => {
     const given = parseFloat(manualGivenTotal) || 0;
     const received = parseFloat(manualReceivedTotal) || 0;
     let result = 0;
     if (manualOperation === 'add') {
       result = given + received;
     } else { // Subtract
       result = given - received;
     }
     return result.toFixed(3);
   };


  // --- Render Logic ---
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p>Loading receipt view...</p>
        </div>
      </Layout>
    );
  }

  if (!receiptData) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center min-h-screen p-4">
          <p className="text-destructive mb-4">Receipt data could not be loaded or found.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  // Check if there's valid data to display for each section
  const hasGivenData = receiptData.given && Array.isArray(receiptData.given) && receiptData.given.length > 0;
  // Use `?? []` to safely check length even if `received` is null
  const hasReceivedData = receiptData.received && Array.isArray(receiptData.received) && receiptData.received.length > 0;

  // Parse and format dates safely
  const formattedDateGiven = receiptData.dateGiven && isValid(parseISO(receiptData.dateGiven))
                              ? format(parseISO(receiptData.dateGiven), 'PPP') : 'N/A';
  const formattedDateReceived = receiptData.dateReceived && isValid(parseISO(receiptData.dateReceived))
                                ? format(parseISO(receiptData.dateReceived), 'PPP') : 'N/A';

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8">
        <Card className="mb-6">
         <CardHeader className="flex flex-row justify-between items-center">
             <div>
                <CardTitle className="text-2xl">Admin Receipt View</CardTitle>
                <CardDescription>Client: {receiptData.clientName} (ID: {receiptData.clientId})</CardDescription>
             </div>
              <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
              </Button>
         </CardHeader>
        </Card>


        {/* Given Section */}
        {hasGivenData ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Given Details</CardTitle>
              <CardDescription>Date: {formattedDateGiven}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-collapse border-border mb-4">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 border text-left">S.No</th>
                      <th className="p-2 border text-left">Product Name</th>
                      <th className="p-2 border text-right">Pure Weight</th>
                      <th className="p-2 border text-right">Pure %</th>
                      <th className="p-2 border text-right">Melting</th>
                      <th className="p-2 border text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.given.map((item, index) => (
                      <tr key={item.id}>
                        <td className="p-2 border">{index + 1}</td>
                        <td className="p-2 border">{item.productName}</td>
                        <td className="p-2 border text-right">{parseFloat(item.pureWeight || '0').toFixed(3)}</td>
                        <td className="p-2 border text-right">{parseFloat(item.purePercent || '0').toFixed(2)}</td>
                        <td className="p-2 border text-right">{parseFloat(item.melting || '0').toFixed(2)}</td>
                        <td className="p-2 border text-right">{calculateGivenTotal(item).toFixed(3)}</td>
                      </tr>
                    ))}
                     {/* Total Row */}
                     {givenTotals && (
                       <tr className="bg-muted font-semibold">
                         <td colSpan={2} className="p-2 border text-right">Total:</td>
                         <td className="p-2 border text-right">{givenTotals.totalPureWeight}</td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border text-right">{givenTotals.totalGivenTotal}</td>
                       </tr>
                     )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
            <Card className="mb-6 border-dashed border-muted-foreground">
                <CardContent className="p-6 text-center text-muted-foreground">
                    No "Given" items recorded for this receipt.
                </CardContent>
            </Card>
        )}


        {/* Separator only if both sections have data */}
        {hasGivenData && hasReceivedData && <Separator className="my-6" />}

        {/* Received Section */}
        {hasReceivedData ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Received Details</CardTitle>
               <CardDescription>Date: {formattedDateReceived}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                 <table className="min-w-full border border-collapse border-border mb-4">
                    <thead>
                        <tr className="bg-muted">
                            <th className="p-2 border text-left">S.No</th>
                            <th className="p-2 border text-left">Product Name</th>
                            <th className="p-2 border text-right">Final Ornaments (wt)</th>
                            <th className="p-2 border text-right">Stone Weight</th>
                            <th className="p-2 border text-right">Sub Total</th>
                            <th className="p-2 border text-right">Making Charge (%)</th>
                            <th className="p-2 border text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(receiptData.received ?? []).map((item, index) => ( // Use nullish coalescing
                           <tr key={item.id}>
                              <td className="p-2 border">{index + 1}</td>
                              <td className="p-2 border">{item.productName}</td>
                              <td className="p-2 border text-right">{parseFloat(item.finalOrnamentsWt || '0').toFixed(3)}</td>
                              <td className="p-2 border text-right">{parseFloat(item.stoneWeight || '0').toFixed(3)}</td>
                              <td className="p-2 border text-right">{calculateReceivedSubTotal(item).toFixed(3)}</td>
                              <td className="p-2 border text-right">{parseFloat(item.makingChargePercent || '0').toFixed(2)}</td>
                              <td className="p-2 border text-right">{calculateReceivedTotal(item).toFixed(3)}</td>
                           </tr>
                        ))}
                        {/* Total Row */}
                         {receivedTotals && (
                           <tr className="bg-muted font-semibold">
                               <td colSpan={2} className="p-2 border text-right">Total:</td>
                               <td className="p-2 border text-right">{receivedTotals.totalFinalOrnamentsWt}</td>
                               <td className="p-2 border text-right">{receivedTotals.totalStoneWeight}</td>
                               <td className="p-2 border text-right">{receivedTotals.totalReceivedSubTotal}</td>
                               <td className="p-2 border"></td>
                               <td className="p-2 border text-right">{receivedTotals.totalReceivedTotal}</td>
                           </tr>
                         )}
                    </tbody>
                 </table>
              </div>
            </CardContent>
          </Card>
        ) : (
           <Card className="mb-6 border-dashed border-muted-foreground">
               <CardContent className="p-6 text-center text-muted-foreground">
                   No "Received" items recorded for this receipt.
               </CardContent>
           </Card>
       )}

        {/* Manual Comparison Section */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Comparison</CardTitle>
            <CardDescription>Manually input totals for comparison (not saved).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="manualGiven" className="block text-sm font-medium text-muted-foreground mb-1">Given Total</label>
              <Input
                id="manualGiven"
                type="number"
                value={manualGivenTotal}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setManualGivenTotal(e.target.value)}
                placeholder="Enter Given Total"
                step="0.001"
                className="text-right"
              />
            </div>
            <div>
              <label htmlFor="manualOperation" className="block text-sm font-medium text-muted-foreground mb-1">Operation</label>
              <select
                id="manualOperation"
                value={manualOperation}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setManualOperation(e.target.value as 'add' | 'subtract')}
                className={cn(
                   "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                )} >
                <option value="subtract">Subtract (-)</option>
                <option value="add">Add (+)</option>
              </select>
            </div>
            <div>
              <label htmlFor="manualReceived" className="block text-sm font-medium text-muted-foreground mb-1">Received Total</label>
              <Input
                id="manualReceived"
                type="number"
                value={manualReceivedTotal}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setManualReceivedTotal(e.target.value)}
                placeholder="Enter Received Total"
                step="0.001"
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Result</label>
              <Input
                type="text"
                value={calculateManualResult()}
                readOnly
                className="font-semibold text-right bg-muted"
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}

