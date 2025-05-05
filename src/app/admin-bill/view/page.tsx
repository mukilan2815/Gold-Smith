'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Button } from '@/components/ui/button'; // Import Button
import { ArrowLeft } from 'lucide-react'; // Import Icon
import { useRouter } from 'next/navigation'; // Import useRouter

// --- Interfaces (should match admin-receipt/details) ---
interface GivenItem {
  id: string;
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number;
}

interface ReceivedItem {
  id: string;
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  subTotal: number;
  makingChargePercent: string;
  total: number;
}

interface AdminReceiptData {
  clientId: string;
  clientName: string;
  dateGiven: string | null;
  given: GivenItem[];
  dateReceived: string | null;
  received: ReceivedItem[] | null; // Can be null
}

// --- Helper Functions (Copied from admin-receipt/details for consistency) ---
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
  const router = useRouter(); // Initialize router
  const { toast } = useToast();
  const receiptId = searchParams.get('receiptId');

  const [receiptData, setReceiptData] = useState<AdminReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Fetch Receipt Data ---
  useEffect(() => {
    const fetchReceipt = async () => {
      if (!receiptId) {
        toast({ variant: "destructive", title: "Error", description: "Receipt ID is missing." });
        setLoading(false);
        router.push('/admin-bill'); // Redirect if no ID
        return;
      }
      setLoading(true);
      try {
        const receiptRef = doc(db, 'AdminReceipts', receiptId);
        const docSnap = await getDoc(receiptRef);

        if (docSnap.exists()) {
          setReceiptData(docSnap.data() as AdminReceiptData);
        } else {
          toast({ variant: "destructive", title: "Not Found", description: "Receipt not found." });
          router.push('/admin-bill'); // Redirect if not found
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load receipt details." });
         router.push('/admin-bill'); // Redirect on error
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

      if (type === 'given') {
          (items as GivenItem[]).forEach(item => {
              const itemTotal = calculateGivenTotal(item); // Recalculate to be sure
              totalPureWeight += parseFloat(item.pureWeight) || 0;
              totalGivenTotal += itemTotal;
          });
      } else { // received
          (items as ReceivedItem[]).forEach(item => {
               const itemSubTotal = calculateReceivedSubTotal(item); // Recalculate
               const itemTotal = calculateReceivedTotal(item);    // Recalculate
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
  const receivedTotals = receiptData?.received ? calculateTotals(receiptData.received, 'received') : null;


  // --- Render Logic ---
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <p>Loading receipt view...</p>
        </div>
      </Layout>
    );
  }

  if (!receiptData) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <p>Receipt data could not be loaded.</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const hasGivenData = receiptData.given && receiptData.given.length > 0;
  const hasReceivedData = receiptData.received && receiptData.received.length > 0;

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8">
        <Card className="mb-6">
         <CardHeader className="flex flex-row justify-between items-center">
             <div>
                <CardTitle className="text-2xl">Admin Receipt View</CardTitle>
                <CardDescription>Client: {receiptData.clientName}</CardDescription>
             </div>
              <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
              </Button>
         </CardHeader>
        </Card>


        {/* Given Section */}
        {hasGivenData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Given Details</CardTitle>
              {receiptData.dateGiven && (
                <CardDescription>Date: {format(new Date(receiptData.dateGiven), 'PPP')}</CardDescription>
              )}
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
        )}
         {!hasGivenData && (
            <Card className="mb-6 border-dashed border-muted-foreground">
                <CardContent className="p-6 text-center text-muted-foreground">
                    No "Given" items recorded for this receipt.
                </CardContent>
            </Card>
        )}


        {/* Separator if both sections exist */}
        {hasGivenData && hasReceivedData && <Separator className="my-6" />}

        {/* Received Section */}
        {hasReceivedData && (
          <Card>
            <CardHeader>
              <CardTitle>Received Details</CardTitle>
              {receiptData.dateReceived && (
                <CardDescription>Date: {format(new Date(receiptData.dateReceived), 'PPP')}</CardDescription>
              )}
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
                        {receiptData.received!.map((item, index) => (
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
                               <td className="p-2 border"></td> {/* Empty for Making Charge % */}
                               <td className="p-2 border text-right">{receivedTotals.totalReceivedTotal}</td>
                           </tr>
                         )}
                    </tbody>
                 </table>
              </div>
            </CardContent>
          </Card>
        )}
        {!hasReceivedData && (
           <Card className="border-dashed border-muted-foreground">
               <CardContent className="p-6 text-center text-muted-foreground">
                   No "Received" items recorded for this receipt.
               </CardContent>
           </Card>
       )}

      </div>
    </Layout>
  );
}