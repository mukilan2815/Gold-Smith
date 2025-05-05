'use client';

import Layout from '@/components/Layout';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';

// --- Interfaces ---
interface GivenItem {
  id: string;
  productName: string;
  pureWeight: string; // Store as string for input handling
  purePercent: string;
  melting: string;
  total: number; // Calculated
}

interface ReceivedItem {
  id: string;
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string;
  subTotal: number; // Calculated
  total: number; // Calculated
}

interface AdminReceiptData {
  clientId: string;
  clientName: string;
  dateGiven: string | null;
  given: GivenItem[];
  dateReceived: string | null;
  received: ReceivedItem[];
}

// --- Helper Functions ---
const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const calculateGivenTotal = (item: GivenItem): number => {
  const pureWeight = parseFloat(item.pureWeight) || 0;
  const purePercent = parseFloat(item.purePercent) || 0;
  const melting = parseFloat(item.melting) || 0;
  if (melting === 0) return 0; // Avoid division by zero
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
    // Correct Calculation: Total = SubTotal + (SubTotal * MakingCharge / 100)
    const total = subTotal + (subTotal * makingChargePercent / 100);
    return parseFloat(total.toFixed(3));
};


// --- Component ---
export default function AdminReceiptDetailsPage() {
  return (
    <Layout>
      <AdminReceiptDetailsContent />
    </Layout>
  );
}

function AdminReceiptDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName') || 'Client';

  const [dateGiven, setDateGiven] = useState<Date | undefined>(undefined);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(undefined);
  const [givenItems, setGivenItems] = useState<GivenItem[]>([]);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [manualGivenTotal, setManualGivenTotal] = useState('');
  const [manualReceivedTotal, setManualReceivedTotal] = useState('');
  const [manualOperation, setManualOperation] = useState<'add' | 'subtract'>('subtract');
  const [loading, setLoading] = useState(true); // Add loading state
  const [isSaving, setIsSaving] = useState(false);

  // --- Fetch Existing Data (Simulated with localStorage) ---
  useEffect(() => {
    setLoading(true);
    if (clientId) {
      try {
        const storedAdminReceipts = localStorage.getItem('adminReceipts');
        const receipts: AdminReceiptData[] = storedAdminReceipts ? JSON.parse(storedAdminReceipts) : [];
        const existingReceipt = receipts.find(r => r.clientId === clientId);

        if (existingReceipt) {
          setDateGiven(existingReceipt.dateGiven ? new Date(existingReceipt.dateGiven) : undefined);
          setGivenItems(existingReceipt.given || []);
          setDateReceived(existingReceipt.dateReceived ? new Date(existingReceipt.dateReceived) : undefined);
          setReceivedItems(existingReceipt.received || []);
        } else {
          // Initialize if no existing receipt found
          setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
          setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
        }
      } catch (error) {
        console.error("Error loading admin receipt from localStorage:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load receipt data." });
        // Initialize with empty defaults on error
         setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
         setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
      } finally {
        setLoading(false);
      }
    } else {
        toast({ variant: "destructive", title: "Error", description: "Client ID is missing." });
        router.push('/admin-receipt'); // Redirect if no client ID
        setLoading(false);
    }
  }, [clientId, router, toast]);

  // --- Event Handlers ---
  const handleInputChange = <T extends GivenItem | ReceivedItem>(
    index: number,
    field: keyof T,
    value: string,
    type: 'given' | 'received'
  ) => {
    if (type === 'given') {
      const newItems = [...givenItems] as GivenItem[];
      const item = { ...newItems[index], [field]: value } as GivenItem;
      item.total = calculateGivenTotal(item); // Recalculate total
      newItems[index] = item;
      setGivenItems(newItems);
    } else {
      const newItems = [...receivedItems] as ReceivedItem[];
      const item = { ...newItems[index], [field]: value } as ReceivedItem;
      item.subTotal = calculateReceivedSubTotal(item); // Recalculate subTotal
      item.total = calculateReceivedTotal(item); // Recalculate total
      newItems[index] = item;
      setReceivedItems(newItems);
    }
  };

  const handleAddItem = (type: 'given' | 'received') => {
    if (type === 'given') {
      setGivenItems([...givenItems, { id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
    } else {
      setReceivedItems([...receivedItems, { id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
    }
  };

  const handleRemoveItem = (id: string, type: 'given' | 'received') => {
    if (type === 'given') {
      setGivenItems(givenItems.filter(item => item.id !== id));
    } else {
      setReceivedItems(receivedItems.filter(item => item.id !== id));
    }
  };

  const handleSave = async () => {
      if (!clientId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Client ID is missing.' });
          return;
      }
      if (!dateGiven && givenItems.some(item => item.productName || item.pureWeight)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a date for the "Given" items.' });
            return;
      }
       if (!dateReceived && receivedItems.some(item => item.productName || item.finalOrnamentsWt)) {
             toast({ variant: 'destructive', title: 'Error', description: 'Please select a date for the "Received" items.' });
             return;
       }


      setIsSaving(true);

      const newReceiptData: AdminReceiptData = {
          clientId,
          clientName,
          dateGiven: dateGiven ? dateGiven.toISOString() : null,
          given: givenItems.filter(item => item.productName || item.pureWeight), // Only save non-empty rows
          dateReceived: dateReceived ? dateReceived.toISOString() : null,
          received: receivedItems.filter(item => item.productName || item.finalOrnamentsWt), // Only save non-empty rows
      };

      try {
          const storedAdminReceipts = localStorage.getItem('adminReceipts');
          let receipts: AdminReceiptData[] = storedAdminReceipts ? JSON.parse(storedAdminReceipts) : [];

          const existingIndex = receipts.findIndex(r => r.clientId === clientId);

          if (existingIndex !== -1) {
              // Update existing receipt
              receipts[existingIndex] = {
                  ...receipts[existingIndex], // Keep existing data
                  dateGiven: newReceiptData.dateGiven ?? receipts[existingIndex].dateGiven, // Update if new date is set
                  given: newReceiptData.given.length > 0 ? newReceiptData.given : receipts[existingIndex].given, // Update if new items exist
                  dateReceived: newReceiptData.dateReceived ?? receipts[existingIndex].dateReceived,
                  received: newReceiptData.received.length > 0 ? newReceiptData.received : receipts[existingIndex].received,
              };
          } else {
              // Add new receipt
              receipts.push(newReceiptData);
          }

          localStorage.setItem('adminReceipts', JSON.stringify(receipts));
          toast({ title: 'Success', description: 'Admin receipt saved successfully.' });
          // Optionally redirect or give further feedback
          // router.push('/admin-bill'); // Example redirect
      } catch (error) {
          console.error("Error saving admin receipt to localStorage:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save receipt.' });
      } finally {
          setIsSaving(false);
      }
  };


  // --- Calculations for Totals ---
  const totalGivenPureWeight = givenItems.reduce((sum, item) => sum + (parseFloat(item.pureWeight) || 0), 0);
  const totalGivenTotal = givenItems.reduce((sum, item) => sum + item.total, 0);

  const totalReceivedFinalOrnamentsWt = receivedItems.reduce((sum, item) => sum + (parseFloat(item.finalOrnamentsWt) || 0), 0);
  const totalReceivedSubTotal = receivedItems.reduce((sum, item) => sum + item.subTotal, 0);
  const totalReceivedTotal = receivedItems.reduce((sum, item) => sum + item.total, 0);


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
              <div className="flex justify-center items-center h-screen">
                  <p>Loading receipt details...</p>
              </div>
          </Layout>
      );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Admin Receipt for: {clientName}</CardTitle>
            <CardDescription>Manage given and received items for this client.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="given" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="given">Given Items</TabsTrigger>
                <TabsTrigger value="received">Received Items</TabsTrigger>
              </TabsList>

              {/* Given Tab */}
              <TabsContent value="given">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                       <CardTitle>Given Details</CardTitle>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant={'outline'}
                               className={cn(
                                 'w-[200px] justify-start text-left font-normal',
                                 !dateGiven && 'text-muted-foreground'
                               )}
                             >
                               {dateGiven ? format(dateGiven, 'PPP') : <span>Pick Given Date</span>}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                             <Calendar
                               mode="single"
                               selected={dateGiven}
                               onSelect={setDateGiven}
                               className="rounded-md border"
                             />
                           </PopoverContent>
                         </Popover>
                    </div>

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
                            <th className="p-2 border text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {givenItems.map((item, index) => (
                            <tr key={item.id}>
                              <td className="p-2 border">{index + 1}</td>
                              <td className="p-2 border">
                                <Input
                                  type="text"
                                  value={item.productName}
                                  onChange={(e) => handleInputChange(index, 'productName', e.target.value, 'given')}
                                  className="w-full"
                                />
                              </td>
                              <td className="p-2 border">
                                <Input
                                  type="number"
                                  value={item.pureWeight}
                                  onChange={(e) => handleInputChange(index, 'pureWeight', e.target.value, 'given')}
                                  className="w-full text-right"
                                  step="0.001"
                                />
                              </td>
                               <td className="p-2 border">
                                <Input
                                  type="number"
                                  value={item.purePercent}
                                  onChange={(e) => handleInputChange(index, 'purePercent', e.target.value, 'given')}
                                  className="w-full text-right"
                                    step="0.01"
                                />
                              </td>
                               <td className="p-2 border">
                                 <Input
                                   type="number"
                                   value={item.melting}
                                   onChange={(e) => handleInputChange(index, 'melting', e.target.value, 'given')}
                                   className="w-full text-right"
                                   step="0.01"
                                  />
                               </td>
                              <td className="p-2 border text-right">{item.total.toFixed(3)}</td>
                               <td className="p-2 border text-center">
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => handleRemoveItem(item.id, 'given')}
                                   disabled={givenItems.length <= 1}
                                   className="text-destructive hover:text-destructive/80"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </td>
                            </tr>
                          ))}
                           {/* Total Row */}
                           <tr className="bg-muted font-semibold">
                               <td colSpan={2} className="p-2 border text-right">Total:</td>
                               <td className="p-2 border text-right">{totalGivenPureWeight.toFixed(3)}</td>
                               <td className="p-2 border"></td> {/* Empty cell for Pure % */}
                               <td className="p-2 border"></td> {/* Empty cell for Melting */}
                               <td className="p-2 border text-right">{totalGivenTotal.toFixed(3)}</td>
                               <td className="p-2 border"></td> {/* Empty cell for Action */}
                            </tr>
                        </tbody>
                      </table>
                    </div>
                     <Button onClick={() => handleAddItem('given')} variant="outline" size="sm" className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Given Item
                     </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Received Tab */}
               <TabsContent value="received">
                   <Card>
                       <CardHeader>
                           <div className="flex justify-between items-center">
                             <CardTitle>Received Details</CardTitle>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-[200px] justify-start text-left font-normal',
                                            !dateReceived && 'text-muted-foreground'
                                        )}
                                    >
                                        {dateReceived ? format(dateReceived, 'PPP') : <span>Pick Received Date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateReceived}
                                        onSelect={setDateReceived}
                                        className="rounded-md border"
                                    />
                                </PopoverContent>
                             </Popover>
                           </div>
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
                                           <th className="p-2 border text-center">Action</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {receivedItems.map((item, index) => (
                                           <tr key={item.id}>
                                               <td className="p-2 border">{index + 1}</td>
                                               <td className="p-2 border">
                                                   <Input
                                                       type="text"
                                                       value={item.productName}
                                                       onChange={(e) => handleInputChange(index, 'productName', e.target.value, 'received')}
                                                       className="w-full"
                                                   />
                                               </td>
                                               <td className="p-2 border">
                                                   <Input
                                                       type="number"
                                                       value={item.finalOrnamentsWt}
                                                       onChange={(e) => handleInputChange(index, 'finalOrnamentsWt', e.target.value, 'received')}
                                                       className="w-full text-right"
                                                       step="0.001"
                                                   />
                                               </td>
                                               <td className="p-2 border">
                                                   <Input
                                                       type="number"
                                                       value={item.stoneWeight}
                                                       onChange={(e) => handleInputChange(index, 'stoneWeight', e.target.value, 'received')}
                                                       className="w-full text-right"
                                                       step="0.001"
                                                   />
                                               </td>
                                               <td className="p-2 border text-right">{item.subTotal.toFixed(3)}</td>
                                                <td className="p-2 border">
                                                   <Input
                                                       type="number"
                                                       value={item.makingChargePercent}
                                                       onChange={(e) => handleInputChange(index, 'makingChargePercent', e.target.value, 'received')}
                                                       className="w-full text-right"
                                                        step="0.01"
                                                   />
                                               </td>
                                               <td className="p-2 border text-right">{item.total.toFixed(3)}</td>
                                               <td className="p-2 border text-center">
                                                 <Button
                                                   variant="ghost"
                                                   size="icon"
                                                   onClick={() => handleRemoveItem(item.id, 'received')}
                                                   disabled={receivedItems.length <= 1}
                                                   className="text-destructive hover:text-destructive/80"
                                                 >
                                                   <Trash2 className="h-4 w-4" />
                                                 </Button>
                                               </td>
                                           </tr>
                                       ))}
                                        {/* Total Row */}
                                        <tr className="bg-muted font-semibold">
                                            <td colSpan={2} className="p-2 border text-right">Total:</td>
                                            <td className="p-2 border text-right">{totalReceivedFinalOrnamentsWt.toFixed(3)}</td>
                                             <td className="p-2 border"></td> {/* Empty cell for Stone Weight */}
                                            <td className="p-2 border text-right">{totalReceivedSubTotal.toFixed(3)}</td>
                                             <td className="p-2 border"></td> {/* Empty cell for Making Charge */}
                                            <td className="p-2 border text-right">{totalReceivedTotal.toFixed(3)}</td>
                                            <td className="p-2 border"></td> {/* Empty cell for Action */}
                                        </tr>
                                   </tbody>
                               </table>
                           </div>
                            <Button onClick={() => handleAddItem('received')} variant="outline" size="sm" className="mt-2">
                               <PlusCircle className="mr-2 h-4 w-4" /> Add Received Item
                            </Button>
                       </CardContent>
                   </Card>
               </TabsContent>
            </Tabs>

             {/* Manual Comparison Section */}
             <Card className="mt-6">
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


            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Admin Receipt'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
