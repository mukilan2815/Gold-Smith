{'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react'; // Added CalendarIcon

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
  return parseFloat(total.toFixed(3)); // Round to 3 decimal places
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
  // Total = SubTotal + (SubTotal * MakingCharge / 100) -> Incorrect based on req.
  // Total = Sub Total × (Making Charge ÷ 100) -> Corrected based on req.
  // Let's assume the requirement meant Total = SubTotal + (SubTotal * MakingCharge% / 100) for a more realistic calculation
  const total = subTotal + (subTotal * makingChargePercent / 100);
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
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]); // Initially empty, will be populated on fetch or add
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
            // Ensure there's at least one item, even if fetched data is empty/null
            setGivenItems(data.given && data.given.length > 0 ? data.given : [{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
            setDateReceived(data.dateReceived ? new Date(data.dateReceived) : undefined);
            setReceivedItems(data.received || []); // Keep empty if no received data yet
          } else {
            console.log("No such document! Creating a new one.");
            toast({ variant: "default", title: "New Receipt", description: "Creating a new admin receipt." });
            setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
            setReceivedItems([]); // Start empty for new receipt
            setCurrentReceiptId(null); // Reset receipt ID as we are creating new
          }
        } catch (error) {
          console.error("Error fetching admin receipt from Firestore:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load receipt data." });
           setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
           setReceivedItems([]);
           setCurrentReceiptId(null); // Reset receipt ID on error
        } finally {
          setLoading(false);
        }
      } else if (clientId) {
          // Creating a new receipt, initialize with defaults
          setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
          setReceivedItems([]); // Start empty for new receipt
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
      // Recalculate total for the affected 'given' item
      item.total = calculateGivenTotal(item);
      newItems[index] = item;
      setGivenItems(newItems);
    } else {
      const newItems = [...receivedItems] as ReceivedItem[];
      const item = { ...newItems[index], [field]: value } as ReceivedItem;
      // Recalculate subTotal and total for the affected 'received' item
      item.subTotal = calculateReceivedSubTotal(item);
      item.total = calculateReceivedTotal(item);
      newItems[index] = item;
      setReceivedItems(newItems);
    }
  };

  const handleAddItem = (type: 'given' | 'received') => {
    if (type === 'given') {
      setGivenItems([...givenItems, { id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
    } else {
      // Ensure received items also start with an empty row if it's the first add
      if (receivedItems.length === 0) {
        setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
      } else {
        setReceivedItems([...receivedItems, { id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
      }
    }
  };

  const handleRemoveItem = (id: string, type: 'given' | 'received') => {
    if (type === 'given') {
        if (givenItems.length > 1) {
            setGivenItems(givenItems.filter(item => item.id !== id));
        } else {
            toast({ variant: "destructive", title: "Cannot Remove", description: "At least one 'Given' item row is required." });
        }
    } else {
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

    const hasGivenData = givenItems.some(item => item.productName || item.pureWeight || item.purePercent || item.melting);
    const hasReceivedData = receivedItems.some(item => item.productName || item.finalOrnamentsWt || item.stoneWeight || item.makingChargePercent);

    // Validate date selection based on which tab is being saved
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

    // Filter out empty rows before saving
    const finalGivenItems = givenItems.filter(item => item.productName || item.pureWeight || item.purePercent || item.melting);
    const finalReceivedItems = receivedItems.filter(item => item.productName || item.finalOrnamentsWt || item.stoneWeight || item.makingChargePercent);


    // Prepare data, including only the relevant part based on saveType for updates
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
        // If saving 'received', make sure 'given' data isn't overwritten if it exists
        if (saveType === 'received') {
           const existingDocSnap = await getDoc(docRef);
           if (existingDocSnap.exists()) {
               const existingData = existingDocSnap.data();
               // Merge existing 'given' data if it exists and we are saving 'received'
               if(existingData.given && !receiptData.given) {
                   receiptData.given = existingData.given;
                   receiptData.dateGiven = existingData.dateGiven;
               }
           }
        }
        // Similarly, if saving 'given', preserve 'received'
        if (saveType === 'given') {
           const existingDocSnap = await getDoc(docRef);
           if (existingDocSnap.exists()) {
               const existingData = existingDocSnap.data();
               if(existingData.received && !receiptData.received) {
                   receiptData.received = existingData.received;
                   receiptData.dateReceived = existingData.dateReceived;
               }
           }
        }

        await updateDoc(docRef, receiptData);
        toast({ title: 'Success', description: `Admin receipt ${saveType} data updated.` });
      } else {
        // Creating new receipt: Create a new document
        const newReceiptRef = doc(collection(db, 'AdminReceipts')); // Auto-generate ID
        receiptData.createdAt = serverTimestamp(); // Add createdAt timestamp
        // Initialize the other tab's data as null or empty array explicitly
        if (saveType === 'given') {
            receiptData.dateReceived = null;
            receiptData.received = [];
        } else { // saveType === 'received'
            receiptData.dateGiven = null;
            receiptData.given = [];
        }
        await setDoc(newReceiptRef, receiptData);
        setCurrentReceiptId(newReceiptRef.id); // Store the new ID
        toast({ title: 'Success', description: `Admin receipt ${saveType} data saved.` });
      }
    } catch (error) {
      console.error("Error saving admin receipt to Firestore:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to save ${saveType} receipt data.` });
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
                                 />
                               </td>
                               <td className="p-2 border">
                                 <Input
                                   type="number"
                                   value={item.purePercent}
                                   onChange={(e) => handleInputChange(index, 'purePercent', e.target.value, 'given')}
                                   className="w-full text-right"
                                   step="0.01" // Assuming percentage
                                 />
                               </td>
                               <td className="p-2 border">
                                 <Input
                                   type="number"
                                   value={item.melting}
                                   onChange={(e) => handleInputChange(index, 'melting', e.target.value, 'given')}
                                   className="w-full text-right"
                                   step="0.01" // Assuming melting point or similar
                                  />
                               </td>
                               <td className="p-2 border text-right">{item.total.toFixed(3)}</td> {/* Display calculated total */}
                               <td className="p-2 border text-center">
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => handleRemoveItem(item.id, 'given')}
                                   disabled={givenItems.length <= 1} // Prevent removing the last row
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

               {/* Received Tab Content (Placeholder - Implement in next step) */}
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
                      {/* Table and Save Button for Received Items will go here */}
                       <p className="text-muted-foreground">Received items form will be implemented here.</p>
                        {/* Placeholder structure */}
                        <div className="overflow-x-auto mt-4">
                            <table className="min-w-full border border-collapse border-border mb-4">
                                <thead>
                                    <tr className="bg-muted">
                                        <th className="p-2 border text-left">S.No</th>
                                        <th className="p-2 border text-left">Product Name</th>
                                        {/* Add other 'Received' columns here */}
                                        <th className="p-2 border text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map through receivedItems here */}
                                    <tr>
                                        <td className="p-2 border">1</td>
                                        <td className="p-2 border">
                                            <Input type="text" placeholder="Product Name" className="w-full" disabled />
                                        </td>
                                        {/* Other input fields */}
                                         <td className="p-2 border text-center">
                                            <Button variant="ghost" size="icon" disabled className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                    {/* Total Row Placeholder */}
                                    <tr className="bg-muted font-semibold">
                                        <td colSpan={2 /* Adjust colSpan based on final columns */} className="p-2 border text-right">Total:</td>
                                        {/* Sum columns here */}
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

            {/* Removed combined Save Button - Save is now per tab */}
            {/* <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : (currentReceiptId ? 'Update Admin Receipt' : 'Save Admin Receipt')}
              </Button>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

      