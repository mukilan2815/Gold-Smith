'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs components
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// Import Firestore functions (assuming Firebase is configured)
import { doc, getDoc, setDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming you have a firebase config file

// --- Interfaces ---
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
  makingChargePercent: string;
  subTotal: number;
  total: number;
}

interface AdminReceiptData {
  clientId: string;
  clientName: string;
  dateGiven: string | null; // Store as ISO string
  given: GivenItem[];
  dateReceived: string | null; // Store as ISO string
  received: ReceivedItem[];
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
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
  // Total = SubTotal + (SubTotal * MakingCharge / 100)
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
  const receiptId = searchParams.get('receiptId'); // For editing existing receipts

  const [dateGiven, setDateGiven] = useState<Date | undefined>(undefined);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(undefined);
  const [givenItems, setGivenItems] = useState<GivenItem[]>([]);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [manualGivenTotal, setManualGivenTotal] = useState('');
  const [manualReceivedTotal, setManualReceivedTotal] = useState('');
  const [manualOperation, setManualOperation] = useState<'add' | 'subtract'>('subtract');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(receiptId); // Use state to manage receipt ID

  // --- Fetch Existing Data from Firestore ---
  useEffect(() => {
    const fetchReceiptData = async () => {
      if (clientId && currentReceiptId) { // Only fetch if editing an existing receipt
        setLoading(true);
        try {
          const receiptRef = doc(db, 'AdminReceipts', currentReceiptId);
          const docSnap = await getDoc(receiptRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as AdminReceiptData;
            setDateGiven(data.dateGiven ? new Date(data.dateGiven) : undefined);
            setGivenItems(data.given || []);
            setDateReceived(data.dateReceived ? new Date(data.dateReceived) : undefined);
            setReceivedItems(data.received || []);
          } else {
            console.log("No such document!");
            toast({ variant: "destructive", title: "Error", description: "Receipt not found." });
            // Initialize with defaults if not found (might happen if ID is wrong)
             setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
             setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
             setCurrentReceiptId(null); // Reset receipt ID if not found
          }
        } catch (error) {
          console.error("Error fetching admin receipt from Firestore:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load receipt data." });
           setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
           setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
           setCurrentReceiptId(null); // Reset receipt ID on error
        } finally {
          setLoading(false);
        }
      } else if (clientId) {
          // Creating a new receipt, initialize with defaults
          setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
          setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
          setLoading(false);
      } else {
        toast({ variant: "destructive", title: "Error", description: "Client ID is missing." });
        router.push('/admin-receipt'); // Redirect if no client ID
        setLoading(false);
      }
    };

    fetchReceiptData();
  }, [clientId, currentReceiptId, router, toast]); // Depend on currentReceiptId

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
        // Prevent removing the last row if it's the only one
        if (givenItems.length > 1) {
            setGivenItems(givenItems.filter(item => item.id !== id));
        } else {
            toast({ variant: "destructive", title: "Cannot Remove", description: "At least one item row is required." });
        }
    } else {
         if (receivedItems.length > 1) {
            setReceivedItems(receivedItems.filter(item => item.id !== id));
         } else {
              toast({ variant: "destructive", title: "Cannot Remove", description: "At least one item row is required." });
         }
    }
  };


  const handleSave = async () => {
    if (!clientId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Client ID is missing.' });
      return;
    }
    // Check if at least one date is selected if corresponding items have data
    const hasGivenData = givenItems.some(item => item.productName || item.pureWeight || item.purePercent || item.melting);
    const hasReceivedData = receivedItems.some(item => item.productName || item.finalOrnamentsWt || item.stoneWeight || item.makingChargePercent);

    if (hasGivenData && !dateGiven) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Given" items.' });
      return;
    }
    if (hasReceivedData && !dateReceived) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Received" items.' });
      return;
    }
     if (!hasGivenData && !hasReceivedData) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter details for either Given or Received items.' });
        return;
     }


    setIsSaving(true);

    // Filter out empty rows before saving
    const finalGivenItems = givenItems.filter(item => item.productName || item.pureWeight || item.purePercent || item.melting);
    const finalReceivedItems = receivedItems.filter(item => item.productName || item.finalOrnamentsWt || item.stoneWeight || item.makingChargePercent);


    const receiptData: Partial<AdminReceiptData> = { // Use Partial for update/set flexibility
        clientId,
        clientName,
        dateGiven: dateGiven ? dateGiven.toISOString() : null,
        given: finalGivenItems,
        dateReceived: dateReceived ? dateReceived.toISOString() : null,
        received: finalReceivedItems,
        updatedAt: serverTimestamp(), // Add or update the timestamp
    };

    try {
      let docRef;
      if (currentReceiptId) {
        // Editing existing receipt: Update the document
        docRef = doc(db, 'AdminReceipts', currentReceiptId);
        await updateDoc(docRef, receiptData);
        toast({ title: 'Success', description: 'Admin receipt updated successfully.' });
      } else {
        // Creating new receipt: Create a new document
        // Generate a new ID for the document
        const newReceiptRef = doc(collection(db, 'AdminReceipts')); // Auto-generate ID
        receiptData.createdAt = serverTimestamp(); // Add createdAt timestamp for new docs
        await setDoc(newReceiptRef, receiptData);
        setCurrentReceiptId(newReceiptRef.id); // Store the new ID for potential future edits in this session
        toast({ title: 'Success', description: 'Admin receipt saved successfully.' });
      }
       // Optionally navigate after save
       // router.push('/admin-bill');
    } catch (error) {
      console.error("Error saving admin receipt to Firestore:", error);
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
             {/* Tabs Implementation */}
             <Tabs defaultValue="given" className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-4">
                 <TabsTrigger value="given">Given Items</TabsTrigger>
                 <TabsTrigger value="received">Received Items</TabsTrigger>
               </TabsList>

               {/* Given Tab Content */}
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
                                   // Disable remove if it's the last item
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

               {/* Received Tab Content */}
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
                                    // Disable remove if it's the last item
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
                {isSaving ? 'Saving...' : (currentReceiptId ? 'Update Admin Receipt' : 'Save Admin Receipt')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
