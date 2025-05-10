'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

// Structures to align with MongoDB AdminReceipts collection
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
  makingChargePercent: string; // Or makingCharge
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

const getDisplayValue = (value: string | number | undefined | null, decimals = 3): string => {
    if (value === undefined || value === null) return '0.' + '0'.repeat(decimals);
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (isNaN(num) ? 0 : num).toFixed(decimals);
};

export default function AdminDetailsListPage() {
  return (
    <Layout>
      <AdminDetailsListContent />
    </Layout>
  );
}

function AdminDetailsListContent() {
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAdminReceipts = useCallback(async () => {
    setLoading(true);
    // TODO: Implement MongoDB data fetching for all AdminReceipts
    // Example: const fetchedReceipts = await fetchAllAdminReceiptsFromMongoDB();
    // setReceipts(fetchedReceipts.map(r => ({...r, id: r._id.toString()})));
    console.warn("Admin receipts fetching not implemented. Waiting for MongoDB setup.");
    toast({
        title: "Data Fetching Pending",
        description: "Admin receipt details will be loaded once MongoDB is configured.",
        variant: "default"
    });
    setReceipts([]); 
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAdminReceipts();
  }, [fetchAdminReceipts]);

  const getStatusVariant = (status: 'complete' | 'incomplete' | 'empty'): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'complete': return 'default';
      case 'incomplete': return 'secondary';
      case 'empty': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-2xl">Admin Details - All Admin Receipts</CardTitle>
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardHeader>
        <CardDescription className="px-6 pb-4">
            This page displays details of all admin receipts. Data will be loaded from MongoDB once configured.
        </CardDescription>
      </Card>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Loading admin receipts... Please wait for MongoDB configuration.</p>
        </div>
      ) : receipts.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-6">
            {receipts.map((receipt) => {
                const formattedDateGiven = receipt.given?.date && isValid(new Date(receipt.given.date))
                ? format(new Date(receipt.given.date), 'PPP') : 'N/A';
                const formattedDateReceived = receipt.received?.date && isValid(new Date(receipt.received.date))
                ? format(new Date(receipt.received.date), 'PPP') : 'N/A';

                return (
              <Card key={receipt.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{receipt.clientName}</CardTitle>
                      <CardDescription>Receipt ID: {receipt.id.substring(0,10)}...<br />Last Updated: {format(new Date(receipt.updatedAt), 'PPP p')}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(receipt.status)} className="capitalize">{receipt.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {receipt.given && receipt.given.items.length > 0 && (
                    <div className="p-4">
                      <h3 className="font-semibold mb-1">Given Details</h3>
                      <p className="text-sm text-muted-foreground mb-2">Date: {formattedDateGiven}</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse border border-border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 border text-left">Product</th>
                              <th className="p-2 border text-right">Pure Wt</th>
                              <th className="p-2 border text-right">Pure %</th>
                              <th className="p-2 border text-right">Melting</th>
                              <th className="p-2 border text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipt.given.items.map((item, index) => (
                              <tr key={`given-${receipt.id}-${index}`}>
                                <td className="p-2 border">{item.productName}</td>
                                <td className="p-2 border text-right">{getDisplayValue(item.pureWeight)}</td>
                                <td className="p-2 border text-right">{getDisplayValue(item.purePercent, 2)}</td>
                                <td className="p-2 border text-right">{getDisplayValue(item.melting, 2)}</td>
                                <td className="p-2 border text-right">{getDisplayValue(item.total)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold bg-muted/50">
                              <td className="p-2 border text-right">Total:</td>
                              <td className="p-2 border text-right">{getDisplayValue(receipt.given.totalPureWeight)}</td>
                              <td className="p-2 border"></td>
                              <td className="p-2 border"></td>
                              <td className="p-2 border text-right">{getDisplayValue(receipt.given.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {receipt.given && receipt.received && receipt.given.items.length > 0 && receipt.received.items.length > 0 && <Separator className="my-0" />}
                  {receipt.received && receipt.received.items.length > 0 && (
                     <div className="p-4">
                        <h3 className="font-semibold mb-1">Received Details</h3>
                        <p className="text-sm text-muted-foreground mb-2">Date: {formattedDateReceived}</p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border-collapse border border-border">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-2 border text-left">Product</th>
                                        <th className="p-2 border text-right">Ornaments Wt</th>
                                        <th className="p-2 border text-right">Stone Wt</th>
                                        <th className="p-2 border text-right">Sub Total</th>
                                        <th className="p-2 border text-right">Making %</th>
                                        <th className="p-2 border text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipt.received.items.map((item, index) => (
                                        <tr key={`received-${receipt.id}-${index}`}>
                                            <td className="p-2 border">{item.productName}</td>
                                            <td className="p-2 border text-right">{getDisplayValue(item.finalOrnamentsWt)}</td>
                                            <td className="p-2 border text-right">{getDisplayValue(item.stoneWeight)}</td>
                                            <td className="p-2 border text-right">{getDisplayValue(item.subTotal)}</td>
                                            <td className="p-2 border text-right">{getDisplayValue(item.makingChargePercent,2)}</td>
                                            <td className="p-2 border text-right">{getDisplayValue(item.total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-semibold bg-muted/50">
                                        <td className="p-2 border text-right">Total:</td>
                                        <td className="p-2 border text-right">{getDisplayValue(receipt.received.totalOrnamentsWt)}</td>
                                        <td className="p-2 border text-right">{getDisplayValue(receipt.received.totalStoneWeight)}</td>
                                        <td className="p-2 border text-right">{getDisplayValue(receipt.received.totalSubTotal)}</td>
                                        <td className="p-2 border"></td>
                                        <td className="p-2 border text-right">{getDisplayValue(receipt.received.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                     </div>
                  )}
                   {(!receipt.given || receipt.given.items.length === 0) && (!receipt.received || receipt.received.items.length === 0) && (
                        <p className="p-4 text-muted-foreground">This admin receipt is currently empty.</p>
                   )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-muted-foreground text-center py-10">No admin receipts found. Waiting for MongoDB configuration.</p>
      )}
    </div>
  );
}
