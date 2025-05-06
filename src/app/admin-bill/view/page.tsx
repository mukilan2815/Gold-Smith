
'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore'; // Import Timestamp, DocumentData
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

// --- Interfaces matching the NEW Firestore structure ---
interface GivenItem {
  // id is not stored, only needed for UI in details page
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number; // Stored as calculated number
}

interface ReceivedItem {
  // id is not stored
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string; // Changed from makingCharge
  subTotal: number; // Stored as calculated number
  total: number; // Stored as calculated number
}

interface GivenData {
    date: string | null; // ISO String or null
    items: GivenItem[];
    totalPureWeight: number;
    total: number;
}

interface ReceivedData {
    date: string | null; // ISO String or null
    items: ReceivedItem[];
    totalOrnamentsWt: number;
    totalStoneWeight: number;
    totalSubTotal: number;
    total: number;
}

interface AdminReceiptData {
  clientId: string;
  clientName: string;
  given: GivenData | null;
  received: ReceivedData | null;
  status: 'complete' | 'incomplete' | 'empty';
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

// Helper functions (adjust if needed, but calculations are stored now)
const getDisplayValue = (value: string | number | undefined | null, decimals = 3): string => {
    if (value === undefined || value === null) return '0.' + '0'.repeat(decimals);
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (isNaN(num) ? 0 : num).toFixed(decimals);
}

// --- Component ---
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
           // Cast directly to the new interface
           const data = docSnap.data() as AdminReceiptData;
            // Validate or provide defaults if necessary, though structure should be more consistent now
           setReceiptData({
             ...data,
             // Ensure timestamps are Timestamps, handle potential Firestore data inconsistencies
             createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
             updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now(),
           });
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

  // Totals are now directly available in receiptData.given and receiptData.received
  const givenTotals = receiptData?.given;
  const receivedTotals = receiptData?.received;


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
  const hasGivenData = receiptData.given && receiptData.given.items.length > 0;
  const hasReceivedData = receiptData.received && receiptData.received.items.length > 0;

  // Parse and format dates safely
  const formattedDateGiven = receiptData.given?.date && isValid(parseISO(receiptData.given.date))
                              ? format(parseISO(receiptData.given.date), 'PPP') : 'N/A';
  const formattedDateReceived = receiptData.received?.date && isValid(parseISO(receiptData.received.date))
                                ? format(parseISO(receiptData.received.date), 'PPP') : 'N/A';

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
                     {/* Add null check for receiptData.given.items */}
                    {receiptData.given?.items?.map((item, index) => (
                      <tr key={`given-${index}`}> {/* Add unique key prefix */}
                        <td className="p-2 border">{index + 1}</td>
                        <td className="p-2 border">{item.productName}</td>
                        {/* Use helper for consistent display */}
                        <td className="p-2 border text-right">{getDisplayValue(item.pureWeight, 3)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.purePercent, 2)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.melting, 2)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.total, 3)}</td>
                      </tr>
                    ))}
                     {/* Total Row - Directly use stored totals */}
                     {givenTotals && (
                       <tr className="bg-muted font-semibold">
                         <td colSpan={2} className="p-2 border text-right">Total:</td>
                         <td className="p-2 border text-right">{getDisplayValue(givenTotals.totalPureWeight, 3)}</td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border text-right">{getDisplayValue(givenTotals.total, 3)}</td>
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
                       {/* Add null check for receiptData.received.items */}
                        {receiptData.received?.items?.map((item, index) => ( // Use nullish coalescing
                           <tr key={`received-${index}`}> {/* Add unique key prefix */}
                              <td className="p-2 border">{index + 1}</td>
                              <td className="p-2 border">{item.productName}</td>
                              {/* Use helper for consistent display */}
                              <td className="p-2 border text-right">{getDisplayValue(item.finalOrnamentsWt, 3)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.stoneWeight, 3)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.subTotal, 3)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.makingChargePercent, 2)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.total, 3)}</td>
                           </tr>
                        ))}
                        {/* Total Row - Directly use stored totals */}
                         {receivedTotals && (
                           <tr className="bg-muted font-semibold">
                               <td colSpan={2} className="p-2 border text-right">Total:</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalOrnamentsWt, 3)}</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalStoneWeight, 3)}</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalSubTotal, 3)}</td>
                               <td className="p-2 border"></td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.total, 3)}</td>
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
