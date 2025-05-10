'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2, Save } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// import { doc, getDoc, setDoc, collection, updateDoc, serverTimestamp, Timestamp, DocumentData } from 'firebase/firestore'; // Firebase removed
// import { db } from '@/lib/firebase'; // Firebase removed

// Keep UI-specific item structure
interface GivenItemUI {
  id: string; 
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number; 
}

interface ReceivedItemUI {
  id: string; 
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string; 
  subTotal: number; 
  total: number; 
}

// Keep Firestore data structure for eventual mapping from/to SQL
interface GivenItemFirestore {
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number;
}

interface ReceivedItemFirestore {
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string;
  subTotal: number;
  total: number;
}


interface GivenData {
    date: string | null; 
    items: GivenItemFirestore[];
    totalPureWeight: number;
    total: number;
}

interface ReceivedData {
    date: string | null; 
    items: ReceivedItemFirestore[];
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
  createdAt: Date; // Changed from Timestamp
  updatedAt: Date; // Changed from Timestamp
}

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const calculateGivenTotal = (item: GivenItemUI): number => {
  const pureWeight = parseFloat(item.pureWeight) || 0;
  const purePercent = parseFloat(item.purePercent) || 0;
  const melting = parseFloat(item.melting) || 0;
  if (melting === 0) return 0; 
  const total = (pureWeight * purePercent) / melting;
  return parseFloat(total.toFixed(3));
};

const calculateReceivedSubTotal = (item: ReceivedItemUI): number => {
  const finalOrnamentsWt = parseFloat(item.finalOrnamentsWt) || 0;
  const stoneWeight = parseFloat(item.stoneWeight) || 0;
  const subTotal = finalOrnamentsWt - stoneWeight;
  return parseFloat(subTotal.toFixed(3));
};

const calculateReceivedTotal = (item: ReceivedItemUI): number => {
  const subTotal = calculateReceivedSubTotal(item); 
  const makingChargePercent = parseFloat(item.makingChargePercent) || 0;
  const total = subTotal * (makingChargePercent / 100); 
  return parseFloat(total.toFixed(3));
};

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
  const receiptIdParam = searchParams.get('receiptId');

  const [dateGiven, setDateGiven] = useState<Date | undefined>(undefined);
  const [dateReceived, setDateReceived] = useState<Date | undefined>(undefined);
  const [givenItems, setGivenItems] = useState<GivenItemUI[]>([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
  const [receivedItems, setReceivedItems] = useState<ReceivedItemUI[]>([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
  
  const [manualGivenTotal, setManualGivenTotal] = useState('');
  const [manualReceivedTotal, setManualReceivedTotal] = useState('');
  const [manualOperation, setManualOperation] = useState<'add' | 'subtract'>('subtract');

  const [loading, setLoading] = useState(true); 
  const [isSaving, setIsSaving] = useState(false);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(receiptIdParam);

  const resetFormForNewReceipt = useCallback(() => {
     setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
     setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
     setDateGiven(undefined);
     setDateReceived(undefined);
     setCurrentReceiptId(null); 
     setManualGivenTotal('');
     setManualReceivedTotal('');
   }, []);

  useEffect(() => {
    const fetchReceiptData = async () => {
      if (!clientId) { 
        toast({ variant: "destructive", title: "Error", description: "Client ID is missing. Cannot proceed." });
        router.push('/admin-receipt'); 
        setLoading(false);
        return;
      }

      if (receiptIdParam) { 
        setLoading(true);
        setCurrentReceiptId(receiptIdParam);
        // TODO: Implement SQL data fetching for existing receipt
        // Example: const data = await fetchAdminReceiptFromSQL(receiptIdParam);
        // if (data) { ... map data to state ... } else { resetFormForNewReceipt(); }
        console.warn(`Data fetching for receipt ID ${receiptIdParam} not implemented. Waiting for SQL database setup.`);
        toast({
            title: "Data Fetching Pending",
            description: `Admin receipt details for ${receiptIdParam} will be loaded once SQL DB is configured. Starting new for now.`,
            variant: "default"
        });
        resetFormForNewReceipt(); // Default to new if fetching fails or not implemented
        setLoading(false);
      } else { 
          resetFormForNewReceipt();
          setLoading(false);
      }
    };
    fetchReceiptData();
  }, [clientId, clientName, receiptIdParam, router, toast, resetFormForNewReceipt]);


  const handleInputChange = <T extends GivenItemUI | ReceivedItemUI>(
    index: number,
    field: keyof T, 
    value: string,
    type: 'given' | 'received'
  ) => {
    if (type === 'given') {
      const newItems = [...givenItems];
      const item = { ...newItems[index], [field]: value } as GivenItemUI;
      item.total = calculateGivenTotal(item);
      newItems[index] = item;
      setGivenItems(newItems);
    } else { 
      const newItems = [...receivedItems];
      const item = { ...newItems[index], [field]: value } as ReceivedItemUI;
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
    } else { 
         if (receivedItems.length > 1) { 
            setReceivedItems(receivedItems.filter(item => item.id !== id));
         } else {
             toast({ variant: "destructive", title: "Cannot Remove", description: "At least one 'Received' item row is required." });
         }
    }
  };

  const handleSave = async (saveType: 'given' | 'received') => {
    if (!clientId || !clientName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Client information is missing. Cannot save.' });
      return;
    }

    const finalGivenItemsToSave: GivenItemFirestore[] = givenItems
       .filter(item => item.productName.trim() !== '' || item.pureWeight.trim() !== '' || item.purePercent.trim() !== '' || item.melting.trim() !== '')
       .map(({ id, ...rest }) => rest);
    const finalReceivedItemsToSave: ReceivedItemFirestore[] = receivedItems
       .filter(item => item.productName.trim() !== '' || item.finalOrnamentsWt.trim() !== '' || item.stoneWeight.trim() !== '' || item.makingChargePercent.trim() !== '')
       .map(({ id, ...rest }) => rest);

    let hasGivenDataForSave = finalGivenItemsToSave.length > 0;
    let hasReceivedDataForSave = finalReceivedItemsToSave.length > 0;

    if (saveType === 'given' && hasGivenDataForSave && !dateGiven) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Given" items.' });
      return;
    }
    if (saveType === 'received' && hasReceivedDataForSave && !dateReceived) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Received" items.' });
      return;
    }
     if (saveType === 'given' && !hasGivenDataForSave && givenItems.some(i => i.productName || i.pureWeight || i.purePercent || i.melting)) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please complete details for "Given" items or clear empty/partially filled rows.' });
       return;
    }
    if (saveType === 'received' && !hasReceivedDataForSave && receivedItems.some(i => i.productName || i.finalOrnamentsWt || i.stoneWeight || i.makingChargePercent)) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please complete details for "Received" items or clear empty/partially filled rows.' });
       return;
    }

    setIsSaving(true);
    // TODO: Implement SQL data saving/updating here
    // This logic will be significantly different for SQL.
    // You'll need to interact with your SQL database client (e.g., Prisma).
    // 1. Check if a receipt exists for this client and potentially date.
    // 2. If exists, update. If not, insert.
    // 3. Handle 'given' and 'received' data updates based on `saveType`.
    // 4. Update `status` accordingly.

    console.warn(`Save operation for type "${saveType}" not implemented. Waiting for SQL database setup.`);
    toast({
        title: "Save Operation Pending",
        description: `Admin receipt ${saveType} data for ${clientName} will be saved once SQL DB is configured.`,
        variant: "default"
    });
    
    // Simulating a save for UI update, actual save needs SQL.
    let tempCurrentReceiptId = currentReceiptId;
    if (!tempCurrentReceiptId) {
        tempCurrentReceiptId = `temp_sql_id_${Date.now()}`; // Placeholder
        setCurrentReceiptId(tempCurrentReceiptId);
        router.replace(`/admin-receipt/details?clientId=${clientId}&clientName=${encodeURIComponent(clientName!)}&receiptId=${tempCurrentReceiptId}`, { scroll: false });
    }
    
    // Determine status based on current UI state (for simulation)
    let finalStatus: 'complete' | 'incomplete' | 'empty';
    const hasFinalGiven = saveType === 'given' ? hasGivenDataForSave : (givenItems.filter(i => i.productName).length > 0);
    const hasFinalReceived = saveType === 'received' ? hasReceivedDataForSave : (receivedItems.filter(i => i.productName).length > 0);

    if (hasFinalGiven && hasFinalReceived) finalStatus = 'complete';
    else if (hasFinalGiven || hasFinalReceived) finalStatus = 'incomplete';
    else finalStatus = 'empty';

    toast({ title: 'Simulated Save', description: `Admin receipt ${saveType} data for ${clientName}. Status: ${finalStatus}. (SQL Save Pending)` });
    setIsSaving(false);
  };

  const validUiGivenItems = givenItems.filter(item =>
    item.productName.trim() !== '' || item.pureWeight.trim() !== '' || item.purePercent.trim() !== '' || item.melting.trim() !== ''
  );
  const validUiReceivedItems = receivedItems.filter(item =>
    item.productName.trim() !== '' || item.finalOrnamentsWt.trim() !== '' || item.stoneWeight.trim() !== '' || item.makingChargePercent.trim() !== ''
  );

  const totalGivenPureWeightUi = validUiGivenItems.reduce((sum, item) => sum + (parseFloat(item.pureWeight) || 0), 0);
  const totalGivenTotalUi = validUiGivenItems.reduce((sum, item) => sum + item.total, 0);

  const totalReceivedFinalOrnamentsWtUi = validUiReceivedItems.reduce((sum, item) => sum + (parseFloat(item.finalOrnamentsWt) || 0), 0);
  const totalReceivedStoneWeightUi = validUiReceivedItems.reduce((sum, item) => sum + (parseFloat(item.stoneWeight) || 0), 0);
  const totalReceivedSubTotalUi = validUiReceivedItems.reduce((sum, item) => sum + item.subTotal, 0);
  const totalReceivedTotalUi = validUiReceivedItems.reduce((sum, item) => sum + item.total, 0);

  const calculateManualResult = () => {
    const given = parseFloat(manualGivenTotal) || 0;
    const received = parseFloat(manualReceivedTotal) || 0;
    let result = 0;
    if (manualOperation === 'add') result = given + received;
    else result = given - received; 
    return result.toFixed(3);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <p>Loading admin receipt details... Waiting for SQL database configuration.</p>
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
            <CardDescription>Manage given and received items. Data will be saved to SQL database once configured.</CardDescription>
            {currentReceiptId && <p className="text-xs text-muted-foreground">Receipt ID: {currentReceiptId}</p>}
          </CardHeader>
          <CardContent>
             <Tabs defaultValue="given" className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-4">
                 <TabsTrigger value="given">Given Items</TabsTrigger>
                 <TabsTrigger value="received">Received Items</TabsTrigger>
               </TabsList>
               <TabsContent value="given">
                 <Card>
                   <CardHeader>
                     <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-center gap-4">
                           <CardTitle>Given Details</CardTitle>
                           <span className="text-sm text-muted-foreground">(Client: {clientName})</span>
                        </div>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant={'outline'}
                               className={cn('w-full md:w-[240px] justify-start text-left font-normal', !dateGiven && 'text-muted-foreground')}
                             >
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {dateGiven ? format(dateGiven, 'PPP') : <span>Pick Given Date</span>}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                             <Calendar mode="single" selected={dateGiven} onSelect={setDateGiven} className="rounded-md border" />
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
                                 <Input type="text" value={item.productName} onChange={(e) => handleInputChange(index, 'productName', e.target.value, 'given')} className="w-full" placeholder='Item name'/>
                               </td>
                               <td className="p-2 border">
                                 <Input type="number" value={item.pureWeight} onChange={(e) => handleInputChange(index, 'pureWeight', e.target.value, 'given')} className="w-full text-right" step="0.001" placeholder="0.000"/>
                               </td>
                               <td className="p-2 border">
                                 <Input type="number" value={item.purePercent} onChange={(e) => handleInputChange(index, 'purePercent', e.target.value, 'given')} className="w-full text-right" step="0.01" placeholder="0.00"/>
                               </td>
                               <td className="p-2 border">
                                 <Input type="number" value={item.melting} onChange={(e) => handleInputChange(index, 'melting', e.target.value, 'given')} className="w-full text-right" step="0.01" placeholder="0.00"/>
                               </td>
                               <td className="p-2 border text-right bg-muted/30">{item.total.toFixed(3)}</td>
                               <td className="p-2 border text-center">
                                 <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id, 'given')} disabled={givenItems.length <= 1} className="text-destructive hover:text-destructive/80 h-8 w-8">
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </td>
                             </tr>
                           ))}
                           <tr className="bg-muted font-semibold">
                             <td colSpan={2} className="p-2 border text-right">Total:</td>
                             <td className="p-2 border text-right">{totalGivenPureWeightUi.toFixed(3)}</td>
                             <td className="p-2 border"></td>
                             <td className="p-2 border"></td>
                             <td className="p-2 border text-right">{totalGivenTotalUi.toFixed(3)}</td>
                             <td className="p-2 border"></td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                     <div className="flex justify-between items-center mt-4">
                         <Button onClick={() => handleAddItem('given')} variant="outline" size="sm" className="mt-2">
                           <PlusCircle className="mr-2 h-4 w-4" /> Add Given Item
                         </Button>
                         <Button onClick={() => handleSave('given')} disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving Given...' : 'Save Given Data'}
                         </Button>
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>
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
                           <Button variant={'outline'} className={cn('w-full md:w-[240px] justify-start text-left font-normal', !dateReceived && 'text-muted-foreground')}>
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {dateReceived ? format(dateReceived, 'PPP') : <span>Pick Received Date</span>}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <Calendar mode="single" selected={dateReceived} onSelect={setDateReceived} className="rounded-md border" />
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
                                          <Input type="text" value={item.productName} onChange={(e) => handleInputChange(index, 'productName', e.target.value, 'received')} className="w-full" placeholder='Item name'/>
                                        </td>
                                        <td className="p-2 border">
                                          <Input type="number" value={item.finalOrnamentsWt} onChange={(e) => handleInputChange(index, 'finalOrnamentsWt', e.target.value, 'received')} className="w-full text-right" step="0.001" placeholder="0.000"/>
                                        </td>
                                        <td className="p-2 border">
                                          <Input type="number" value={item.stoneWeight} onChange={(e) => handleInputChange(index, 'stoneWeight', e.target.value, 'received')} className="w-full text-right" step="0.001" placeholder="0.000"/>
                                        </td>
                                        <td className="p-2 border text-right bg-muted/30">{item.subTotal.toFixed(3)}</td>
                                        <td className="p-2 border">
                                          <Input type="number" value={item.makingChargePercent} onChange={(e) => handleInputChange(index, 'makingChargePercent', e.target.value, 'received')} className="w-full text-right" step="0.01" placeholder="0.00"/>
                                        </td>
                                        <td className="p-2 border text-right bg-muted/30">{item.total.toFixed(3)}</td>
                                         <td className="p-2 border text-center">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id, 'received')} disabled={receivedItems.length <= 1} className="text-destructive hover:text-destructive/80 h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-muted font-semibold">
                                        <td colSpan={2} className="p-2 border text-right">Total:</td>
                                        <td className="p-2 border text-right">{totalReceivedFinalOrnamentsWtUi.toFixed(3)}</td>
                                        <td className="p-2 border text-right">{totalReceivedStoneWeightUi.toFixed(3)}</td>
                                        <td className="p-2 border text-right">{totalReceivedSubTotalUi.toFixed(3)}</td>
                                        <td className="p-2 border"></td>
                                        <td className="p-2 border text-right">{totalReceivedTotalUi.toFixed(3)}</td>
                                         <td className="p-2 border"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                             <Button onClick={() => handleAddItem('received')} variant="outline" size="sm" className="mt-2">
                               <PlusCircle className="mr-2 h-4 w-4" /> Add Received Item
                             </Button>
                             <Button onClick={() => handleSave('received')} disabled={isSaving}>
                                <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving Received...' : 'Save Received Data'}
                             </Button>
                        </div>
                   </CardContent>
                 </Card>
               </TabsContent>
             </Tabs>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Manual Comparison</CardTitle>
                <CardDescription>Manually input totals for comparison. This section is for on-screen calculation only and is not saved with the receipt.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label htmlFor="manualGiven" className="block text-sm font-medium text-muted-foreground mb-1">Given Total</label>
                  <Input id="manualGiven" type="number" value={manualGivenTotal} onChange={(e: ChangeEvent<HTMLInputElement>) => setManualGivenTotal(e.target.value)} placeholder="Enter Given Total" step="0.001" className="text-right"/>
                </div>
                <div>
                  <label htmlFor="manualOperation" className="block text-sm font-medium text-muted-foreground mb-1">Operation</label>
                  <select id="manualOperation" value={manualOperation} onChange={(e: ChangeEvent<HTMLSelectElement>) => setManualOperation(e.target.value as 'add' | 'subtract')} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50")}>
                    <option value="subtract">Subtract (Given - Received)</option>
                    <option value="add">Add (Given + Received)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="manualReceived" className="block text-sm font-medium text-muted-foreground mb-1">Received Total</label>
                  <Input id="manualReceived" type="number" value={manualReceivedTotal} onChange={(e: ChangeEvent<HTMLInputElement>) => setManualReceivedTotal(e.target.value)} placeholder="Enter Received Total" step="0.001" className="text-right"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Result</label>
                  <Input type="text" value={calculateManualResult()} readOnly className="font-semibold text-right bg-muted"/>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
