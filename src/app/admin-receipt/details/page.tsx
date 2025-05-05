{'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// Import Firestore functions
import { doc, getDoc, setDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming you have a firebase config file

// --- Interfaces ---
interface GivenItem {
  id: string;
  productName: string;
  pureWeight: string; // Keep as string for input, parse for calculation
  purePercent: string; // Keep as string for input, parse for calculation
  melting: string;     // Keep as string for input, parse for calculation
  total: number;       // Calculated value
}

interface ReceivedItem {
  id: string;
  productName: string;
  finalOrnamentsWt: string; // Keep as string
  stoneWeight: string;      // Keep as string
  subTotal: number;         // Calculated
  makingChargePercent: string; // Keep as string
  total: number;            // Calculated
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
  // Corrected formula: Total = (Pure Weight × Pure %) ÷ Melting
  const total = (pureWeight * purePercent) / melting;
  return parseFloat(total.toFixed(3)); // Round to 3 decimal places
};

const calculateReceivedSubTotal = (item: ReceivedItem): number => {
  const finalOrnamentsWt = parseFloat(item.finalOrnamentsWt) || 0;
  const stoneWeight = parseFloat(item.stoneWeight) || 0;
  const subTotal = finalOrnamentsWt - stoneWeight;
  return parseFloat(subTotal.toFixed(3)); // Round to 3 decimal places
};

const calculateReceivedTotal = (item: ReceivedItem): number => {
  const subTotal = calculateReceivedSubTotal(item);
  const makingChargePercent = parseFloat(item.makingChargePercent) || 0;
  // Corrected formula: Total = Sub Total × (Making Charge ÷ 100)
  const total = subTotal * (makingChargePercent / 100);
  return parseFloat(total.toFixed(3)); // Round to 3 decimal places
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
  const clientName = searchParams.get('clientName') || 'Client'; // Autofilled
  const receiptId = searchParams.get('receiptId'); // For editing existing receipts

  const [dateGiven, setDateGiven] = useState<Date | undefined>(undefined);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(undefined);
  const [givenItems, setGivenItems] = useState<GivenItem[]>([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]); // Start with one empty row
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]); // Start with one empty row
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
            setGivenItems(data.given && data.given.length > 0 ? data.given : [{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
            setDateReceived(data.dateReceived ? new Date(data.dateReceived) : undefined);
            // Ensure there's at least one received item row, even if fetched data is empty/null
            setReceivedItems(data.received && data.received.length > 0 ? data.received : [{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
          } else {
            console.log("No such document! Creating a new one.");
            toast({ variant: "default", title: "New Receipt", description: "Creating a new admin receipt." });
            setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
            setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
            setCurrentReceiptId(null); // Reset receipt ID as we are creating new
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
      item.total = calculateGivenTotal(item);
      newItems[index] = item;
      setGivenItems(newItems);
    } else { // received
      const newItems = [...receivedItems] as ReceivedItem[];
      const item = { ...newItems[index], [field]: value } as ReceivedItem;
      item.subTotal = calculateReceivedSubTotal(item); // Recalculate Sub Total
      item.total = calculateReceivedTotal(item);     // Recalculate Total
      newItems[index] = item;
      setReceivedItems(newItems);
    }
  };

 const handleAddItem = (type: 'given' | 'received') => {
    if (type === 'given') {
        // Add new empty 'given' item
        setGivenItems([...givenItems, { id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
    } else { // received
        // Add new empty 'received' item
        setReceivedItems([...receivedItems, { id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
    }
};


  const handleRemoveItem = (id: string, type: 'given' | 'received') => {
    if (type === 'given') {
        if (givenItems.length > 1) {
            setGivenItems(givenItems.filter(item => item.id !== id));
        } else {
            toast({ variant: "destructive", title: "Cannot Remove", description: "At least one 'Given' item row is required." });
        }
    } else { // received
         if (receivedItems.length > 1) {
            setReceivedItems(receivedItems.filter(item => item.id !== id));
         } else {
             toast({ variant: "destructive", title: "Cannot Remove", description: "At least one 'Received' item row is required." });
         }
    }
  };


  const handleSave = async (saveType: 'given' | 'received') => {
    if (!clientId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Client ID is missing.' });
      return;
    }

    // Filter out rows where all relevant input fields are empty before validation and saving
     const finalGivenItems = givenItems.filter(item =>
        item.productName.trim() !== '' ||
        item.pureWeight.trim() !== '' ||
        item.purePercent.trim() !== '' ||
        item.melting.trim() !== ''
    );

     const finalReceivedItems = receivedItems.filter(item =>
        item.productName.trim() !== '' ||
        item.finalOrnamentsWt.trim() !== '' ||
        item.stoneWeight.trim() !== '' ||
        item.makingChargePercent.trim() !== ''
    );


    const hasGivenData = finalGivenItems.length > 0;
    const hasReceivedData = finalReceivedItems.length > 0;

    // Validate date selection based on which tab is being saved AND has data
    if (saveType === 'given' && hasGivenData && !dateGiven) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Given" items.' });
      return;
    }
    if (saveType === 'received' && hasReceivedData && !dateReceived) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Received" items.' });
      return;
    }

    // Ensure at least one tab has data if saving for the first time
    if (!currentReceiptId && !hasGivenData && !hasReceivedData) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter details for either Given or Received items before saving.' });
        return;
     }
    // If saving 'Given' ensure there is data
    if (saveType === 'given' && !hasGivenData) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter details for "Given" items before saving.' });
       return;
    }
     // If saving 'Received' ensure there is data
    if (saveType === 'received' && !hasReceivedData) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter details for "Received" items before saving.' });
       return;
    }


    setIsSaving(true);


    // Prepare data, including only the relevant part based on saveType for updates
    // Use the filtered lists (finalGivenItems, finalReceivedItems)
    const receiptData: Partial<AdminReceiptData> = {
        clientId, // Always include clientId and name
        clientName,
        updatedAt: serverTimestamp(),
    };

    if (saveType === 'given') {
        receiptData.dateGiven = dateGiven ? dateGiven.toISOString() : null;
        receiptData.given = finalGivenItems;
    }

    if (saveType === 'received') {
        receiptData.dateReceived = dateReceived ? dateReceived.toISOString() : null;
        receiptData.received = finalReceivedItems;
    }


    try {
      let docRef;
      if (currentReceiptId) {
        // Editing existing receipt: Update the document
        docRef = doc(db, 'AdminReceipts', currentReceiptId);

        // Fetch existing data to merge correctly
         const existingDocSnap = await getDoc(docRef);
         const existingData = existingDocSnap.exists() ? existingDocSnap.data() as AdminReceiptData : null;

        // If saving 'received', preserve existing 'given' data if it exists
        if (saveType === 'received' && existingData?.given && !receiptData.given) {
             receiptData.given = existingData.given;
             receiptData.dateGiven = existingData.dateGiven; // Preserve date too
        }
        // If saving 'given', preserve existing 'received' data if it exists
        if (saveType === 'given' && existingData?.received && !receiptData.received) {
             receiptData.received = existingData.received;
             receiptData.dateReceived = existingData.dateReceived; // Preserve date too
        }
        // If 'received' data is intentionally being cleared (empty list), allow it
         if (saveType === 'received' && finalReceivedItems.length === 0) {
             receiptData.received = []; // Explicitly set to empty array
             receiptData.dateReceived = dateReceived ? dateReceived.toISOString() : null; // Still save the date if picked
         }
         // If 'given' data is intentionally being cleared
         if (saveType === 'given' && finalGivenItems.length === 0) {
            receiptData.given = [];
            receiptData.dateGiven = dateGiven ? dateGiven.toISOString() : null;
         }


        await updateDoc(docRef, receiptData);
        toast({ title: 'Success', description: `Admin receipt ${saveType} data updated.` });
      } else {
        // Creating new receipt: Create a new document
        const newReceiptRef = doc(collection(db, 'AdminReceipts')); // Auto-generate ID
        receiptData.createdAt = serverTimestamp(); // Add createdAt timestamp
        // Initialize the *other* tab's data as null or empty array explicitly
        if (saveType === 'given') {
            receiptData.dateReceived = null;
            receiptData.received = []; // Start other tab empty
        } else { // saveType === 'received'
            receiptData.dateGiven = null;
            receiptData.given = []; // Start other tab empty
        }
        await setDoc(newReceiptRef, receiptData);
        setCurrentReceiptId(newReceiptRef.id); // Store the new ID
        toast({ title: 'Success', description: `Admin receipt ${saveType} data saved.` });
      }
      // Refetch data after saving to ensure UI consistency, especially for totals
      // Or update local state directly if preferred, but refetch is safer
      // await fetchReceiptData(); // You might need to adjust fetchReceiptData or call manually

    } catch (error) {
      console.error("Error saving admin receipt to Firestore:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to save ${saveType} receipt data.` });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Calculations for Totals ---
  // Use the filtered lists for accurate totals based on non-empty rows
  const finalGivenItemsForTotal = givenItems.filter(item =>
    item.productName.trim() !== '' || item.pureWeight.trim() !== '' || item.purePercent.trim() !== '' || item.melting.trim() !== ''
  );
  const finalReceivedItemsForTotal = receivedItems.filter(item =>
    item.productName.trim() !== '' || item.finalOrnamentsWt.trim() !== '' || item.stoneWeight.trim() !== '' || item.makingChargePercent.trim() !== ''
  );


  const totalGivenPureWeight = finalGivenItemsForTotal.reduce((sum, item) => sum + (parseFloat(item.pureWeight) || 0), 0);
  const totalGivenTotal = finalGivenItemsForTotal.reduce((sum, item) => sum + item.total, 0);

  const totalReceivedFinalOrnamentsWt = finalReceivedItemsForTotal.reduce((sum, item) => sum + (parseFloat(item.finalOrnamentsWt) || 0), 0);
  const totalReceivedStoneWeight = finalReceivedItemsForTotal.reduce((sum, item) => sum + (parseFloat(item.stoneWeight) || 0), 0); // Added for completeness if needed
  const totalReceivedSubTotal = finalReceivedItemsForTotal.reduce((sum, item) => sum + item.subTotal, 0);
  const totalReceivedTotal = finalReceivedItemsForTotal.reduce((sum, item) => sum + item.total, 0);


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
                     <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-center gap-4">
                           <CardTitle>Given Details</CardTitle>
                           {/* Display Client Name (autofilled) */}
                           <span className="text-sm text-muted-foreground">(Client: {clientName})</span>
                        </div>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant={'outline'}
                               className={cn(
                                 'w-full md:w-[240px] justify-start text-left font-normal', // Adjusted width
                                 !dateGiven && 'text-muted-foreground'
                               )}
                             >
                               <CalendarIcon className="mr-2 h-4 w-4" /> {/* Added Icon */}
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
                                    placeholder="0.000"
                                 />
                               </td>
                               <td className="p-2 border">
                                 <Input
                                   type="number"
                                   value={item.purePercent}
                                   onChange={(e) => handleInputChange(index, 'purePercent', e.target.value, 'given')}
                                   className="w-full text-right"
                                   step="0.01"
                                    placeholder="0.00"
                                 />
                               </td>
                               <td className="p-2 border">
                                 <Input
                                   type="number"
                                   value={item.melting}
                                   onChange={(e) => handleInputChange(index, 'melting', e.target.value, 'given')}
                                   className="w-full text-right"
                                   step="0.01"
                                   placeholder="0.00"
                                  />
                               </td>
                               <td className="p-2 border text-right">{item.total.toFixed(3)}</td> {/* Display calculated total */}
                               <td className="p-2 border text-center">
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => handleRemoveItem(item.id, 'given')}
                                   disabled={givenItems.length <= 1} // Prevent removing the last required row
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
                             <td className="p-2 border text-right">{totalGivenPureWeight.toFixed(3)}</td> {/* Sum Pure Weight */}
                             <td className="p-2 border"></td> {/* Empty cell for Pure % */}
                             <td className="p-2 border"></td> {/* Empty cell for Melting */}
                             <td className="p-2 border text-right">{totalGivenTotal.toFixed(3)}</td> {/* Sum Total */}
                             <td className="p-2 border"></td> {/* Empty cell for Action */}
                           </tr>
                         </tbody>
                       </table>
                     </div>
                     <div className="flex justify-between items-center mt-4">
                         <Button onClick={() => handleAddItem('given')} variant="outline" size="sm" className="mt-2">
                           <PlusCircle className="mr-2 h-4 w-4" /> Add Given Item
                         </Button>
                         <Button onClick={() => handleSave('given')} disabled={isSaving}>
                           {isSaving ? 'Saving...' : 'Save Given Data'}
                         </Button>
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>

               {/* Received Tab Content */}
               <TabsContent value="received">
                 <Card>
                   <CardHeader>
                     <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                       <div className="flex items-center gap-4">
                          <CardTitle>Received Details</CardTitle>
                          <span className="text-sm text-muted-foreground">(Client: {clientName})</span>
                       </div>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button
                             variant={'outline'}
                             className={cn(
                               'w-full md:w-[240px] justify-start text-left font-normal',
                               !dateReceived && 'text-muted-foreground'
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
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
                        <div className="overflow-x-auto mt-4">
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
                                            placeholder="0.000"
                                          />
                                        </td>
                                        <td className="p-2 border">
                                          <Input
                                            type="number"
                                            value={item.stoneWeight}
                                            onChange={(e) => handleInputChange(index, 'stoneWeight', e.target.value, 'received')}
                                            className="w-full text-right"
                                            step="0.001"
                                            placeholder="0.000"
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
                                            placeholder="0.00"
                                          />
                                        </td>
                                        <td className="p-2 border text-right">{item.total.toFixed(3)}</td>
                                         <td className="p-2 border text-center">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleRemoveItem(item.id, 'received')}
                                              disabled={receivedItems.length <= 1} // Prevent removing the last row
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
                                        <td className="p-2 border text-right">{totalReceivedStoneWeight.toFixed(3)}</td> {/* Sum Stone Weight */}
                                        <td className="p-2 border text-right">{totalReceivedSubTotal.toFixed(3)}</td>
                                        <td className="p-2 border"></td> {/* Empty for Making Charge */}
                                        <td className="p-2 border text-right">{totalReceivedTotal.toFixed(3)}</td>
                                         <td className="p-2 border"></td> {/* Empty cell for Action */}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                             <Button onClick={() => handleAddItem('received')} variant="outline" size="sm" className="mt-2">
                               <PlusCircle className="mr-2 h-4 w-4" /> Add Received Item
                             </Button>
                             <Button onClick={() => handleSave('received')} disabled={isSaving}>
                               {isSaving ? 'Saving...' : 'Save Received Data'}
                             </Button>
                        </div>
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
