'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
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
import { doc, getDoc, setDoc, collection, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

interface GivenData {
    date: string | null;
    items: Omit<GivenItem, 'id'>[];
    totalPureWeight: number;
    total: number;
}

interface ReceivedData {
    date: string | null;
    items: Omit<ReceivedItem, 'id'>[];
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

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
  const [givenItems, setGivenItems] = useState<GivenItem[]>([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
  const [manualGivenTotal, setManualGivenTotal] = useState('');
  const [manualReceivedTotal, setManualReceivedTotal] = useState('');
  const [manualOperation, setManualOperation] = useState<'add' | 'subtract'>('subtract');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(receiptIdParam);

  useEffect(() => {
    const fetchReceiptData = async () => {
      if (!clientId) {
        toast({ variant: "destructive", title: "Error", description: "Client ID is missing." });
        router.push('/admin-receipt');
        setLoading(false);
        return;
      }
      setLoading(!!receiptIdParam);
      if (receiptIdParam) {
        try {
          const receiptRef = doc(db, 'AdminReceipts', receiptIdParam);
          const docSnap = await getDoc(receiptRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as AdminReceiptData;
            setDateGiven(data.given?.date && isValid(parseISO(data.given.date)) ? parseISO(data.given.date) : undefined);
            setGivenItems(data.given?.items && data.given.items.length > 0 ? data.given.items.map(item => ({ ...item, id: generateId() })) : [{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
            setDateReceived(data.received?.date && isValid(parseISO(data.received.date)) ? parseISO(data.received.date) : undefined);
            setReceivedItems(data.received?.items && data.received.items.length > 0 ? data.received.items.map(item => ({ ...item, id: generateId() })) : [{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
            setCurrentReceiptId(receiptIdParam);
          } else {
            toast({ variant: "default", title: "New Receipt", description: "Creating a new admin receipt." });
            resetFormForNewReceipt();
          }
        } catch (error) {
          console.error("Error fetching admin receipt from Firestore:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load receipt data. Starting new." });
          resetFormForNewReceipt();
        } finally {
          setLoading(false);
        }
      } else {
          resetFormForNewReceipt();
          setLoading(false);
      }
    };
    fetchReceiptData();
  }, [clientId, receiptIdParam, router, toast]);

  const resetFormForNewReceipt = () => {
     setGivenItems([{ id: generateId(), productName: '', pureWeight: '', purePercent: '', melting: '', total: 0 }]);
     setReceivedItems([{ id: generateId(), productName: '', finalOrnamentsWt: '', stoneWeight: '', makingChargePercent: '', subTotal: 0, total: 0 }]);
     setDateGiven(undefined);
     setDateReceived(undefined);
     setCurrentReceiptId(null);
   };

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
    } else {
      const newItems = [...receivedItems] as ReceivedItem[];
      const item = { ...newItems[index], [field]: value } as ReceivedItem;
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
      toast({ variant: 'destructive', title: 'Error', description: 'Client information is missing.' });
      return;
    }

    const finalGivenItems = givenItems
       .filter(item => item.productName.trim() !== '' || item.pureWeight.trim() !== '' || item.purePercent.trim() !== '' || item.melting.trim() !== '')
       .map(({ id, ...rest }) => rest);
    const finalReceivedItems = receivedItems
       .filter(item => item.productName.trim() !== '' || item.finalOrnamentsWt.trim() !== '' || item.stoneWeight.trim() !== '' || item.makingChargePercent.trim() !== '')
       .map(({ id, ...rest }) => rest);

    let hasGivenData = finalGivenItems.length > 0;
    let hasReceivedData = finalReceivedItems.length > 0;

    if (saveType === 'given' && hasGivenData && !dateGiven) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Given" items.' });
      return;
    }
    if (saveType === 'received' && hasReceivedData && !dateReceived) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date for the "Received" items.' });
      return;
    }
    if (saveType === 'given' && !hasGivenData && givenItems.some(i => i.productName || i.pureWeight || i.purePercent || i.melting)) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter details for "Given" items or clear rows.' });
       return;
    }
    if (saveType === 'received' && !hasReceivedData && receivedItems.some(i => i.productName || i.finalOrnamentsWt || i.stoneWeight || i.makingChargePercent)) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter details for "Received" items or clear rows.' });
       return;
    }

    setIsSaving(true);
    const savingToast = toast({ title: `Saving ${saveType} data...`, description: 'Please wait.' });

    const totalGivenPureWeightCalc = finalGivenItems.reduce((sum, item) => sum + (parseFloat(item.pureWeight) || 0), 0);
    const totalGivenTotalCalc = finalGivenItems.reduce((sum, item) => sum + item.total, 0);
    const totalReceivedFinalOrnamentsWtCalc = finalReceivedItems.reduce((sum, item) => sum + (parseFloat(item.finalOrnamentsWt) || 0), 0);
    const totalReceivedStoneWeightCalc = finalReceivedItems.reduce((sum, item) => sum + (parseFloat(item.stoneWeight) || 0), 0);
    const totalReceivedSubTotalCalc = finalReceivedItems.reduce((sum, item) => sum + item.subTotal, 0);
    const totalReceivedTotalCalc = finalReceivedItems.reduce((sum, item) => sum + item.total, 0);

    let newGivenDataForSave: GivenData | null = null;
    if (saveType === 'given' && hasGivenData) {
        newGivenDataForSave = {
          date: dateGiven!.toISOString(), // Already validated that dateGiven is defined
          items: finalGivenItems,
          totalPureWeight: parseFloat(totalGivenPureWeightCalc.toFixed(3)),
          total: parseFloat(totalGivenTotalCalc.toFixed(3)),
        };
    } else if (saveType === 'given' && !hasGivenData) {
        newGivenDataForSave = null; // Explicitly clearing
    }

    let newReceivedDataForSave: ReceivedData | null = null;
    if (saveType === 'received' && hasReceivedData) {
        newReceivedDataForSave = {
          date: dateReceived!.toISOString(), // Already validated
          items: finalReceivedItems,
          totalOrnamentsWt: parseFloat(totalReceivedFinalOrnamentsWtCalc.toFixed(3)),
          totalStoneWeight: parseFloat(totalReceivedStoneWeightCalc.toFixed(3)),
          totalSubTotal: parseFloat(totalReceivedSubTotalCalc.toFixed(3)),
          total: parseFloat(totalReceivedTotalCalc.toFixed(3)),
        };
    } else if (saveType === 'received' && !hasReceivedData) {
        newReceivedDataForSave = null; // Explicitly clearing
    }

    try {
        let docRef;
        let tempCurrentReceiptId = currentReceiptId;

        if (tempCurrentReceiptId) {
            docRef = doc(db, 'AdminReceipts', tempCurrentReceiptId);
            const existingDocSnap = await getDoc(docRef);

            if (existingDocSnap.exists()) {
                const existingData = existingDocSnap.data() as Partial<AdminReceiptData>;
                const finalGiven = saveType === 'given' ? newGivenDataForSave : (existingData.given ?? null);
                const finalReceived = saveType === 'received' ? newReceivedDataForSave : (existingData.received ?? null);
                let finalStatus: 'complete' | 'incomplete' | 'empty';
                 if (finalGiven && finalReceived) finalStatus = 'complete';
                 else if (finalGiven || finalReceived) finalStatus = 'incomplete';
                 else finalStatus = 'empty';

                await updateDoc(docRef, {
                  ...(saveType === 'given' && { given: newGivenDataForSave }),
                  ...(saveType === 'received' && { received: newReceivedDataForSave }),
                  status: finalStatus,
                  updatedAt: serverTimestamp(),
                });
                toast.update(savingToast.id, { title: 'Success', description: `Admin receipt ${saveType} data updated.` });
            } else {
                console.warn(`Document ${tempCurrentReceiptId} not found during update, will create new.`);
                tempCurrentReceiptId = null;
                setCurrentReceiptId(null);
            }
        }

        if (!tempCurrentReceiptId) {
             const finalStatus = (saveType === 'given' && hasGivenData) || (saveType === 'received' && hasReceivedData) ? 'incomplete' : 'empty';
             const newReceiptData: AdminReceiptData = {
                clientId: clientId!,
                clientName: clientName!,
                given: saveType === 'given' ? newGivenDataForSave : null,
                received: saveType === 'received' ? newReceivedDataForSave : null,
                status: finalStatus,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp,
             };
            const newReceiptRef = doc(collection(db, 'AdminReceipts'));
            await setDoc(newReceiptRef, newReceiptData);
            setCurrentReceiptId(newReceiptRef.id);
            toast.update(savingToast.id, { title: 'Success', description: `Admin receipt ${saveType} data saved.` });
            router.replace(`/admin-receipt/details?clientId=${clientId}&clientName=${encodeURIComponent(clientName!)}&receiptId=${newReceiptRef.id}`, { scroll: false });
         }
    } catch (error) {
         console.error("Error saving admin receipt to Firestore:", error);
         toast.update(savingToast.id, { variant: 'destructive', title: 'Error', description: `Failed to save ${saveType} receipt data.` });
    } finally {
        setIsSaving(false);
    }
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
          <p>Loading receipt details... Ensure Firestore indexes are configured if this takes too long.</p>
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
            <CardDescription>Manage given and received items for this client. Ensure Firestore indexes are set up on `AdminReceipts` (e.g., on `createdAt`) for optimal performance.</CardDescription>
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
                            <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Given Data'}
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
                                <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Received Data'}
                             </Button>
                        </div>
                   </CardContent>
                 </Card>
               </TabsContent>
             </Tabs>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Manual Comparison</CardTitle>
                <CardDescription>Manually input totals for comparison (not saved).</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label htmlFor="manualGiven" className="block text-sm font-medium text-muted-foreground mb-1">Given Total</label>
                  <Input id="manualGiven" type="number" value={manualGivenTotal} onChange={(e: ChangeEvent<HTMLInputElement>) => setManualGivenTotal(e.target.value)} placeholder="Enter Given Total" step="0.001" className="text-right"/>
                </div>
                <div>
                  <label htmlFor="manualOperation" className="block text-sm font-medium text-muted-foreground mb-1">Operation</label>
                  <select id="manualOperation" value={manualOperation} onChange={(e: ChangeEvent<HTMLSelectElement>) => setManualOperation(e.target.value as 'add' | 'subtract')} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50")}>
                    <option value="subtract">Subtract (-)</option>
                    <option value="add">Add (+)</option>
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
