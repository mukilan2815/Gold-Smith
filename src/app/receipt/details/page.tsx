'use client';

import type {ChangeEvent} from 'react';
import {useState, useEffect, useRef, useCallback}from 'react';
import {useSearchParams, useRouter}from 'next/navigation';
import {format, parseISO, isValid}from 'date-fns';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Download,
  Trash2,
  Edit,
  Save,
  XCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Layout from '@/components/Layout';
import {Button}from '@/components/ui/button';
import {Input}from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue}from '@/components/ui/select';
import {Calendar}from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger}from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {useToast}from '@/hooks/use-toast';
import {cn}from '@/lib/utils';

// Data structure for UI and eventual mapping to/from MongoDB
interface ReceiptItem {
  sNo: number; // UI only
  itemName: string;
  tag: string;
  grossWt: string;
  stoneWt: string;
  netWt: string; // Calculated
  meltingTouch: string;
  finalWt: string; // Calculated
  stoneAmt: string;
}

// This interface represents the data structure in MongoDB's ClientReceipts collection
interface ClientReceiptData {
  _id?: string; // MongoDB ObjectId as string
  clientId: string;
  clientName: string; // Denormalized for easier display, can be fetched if needed
  shopName?: string; 
  phoneNumber?: string; 
  metalType: string;
  issueDate: Date; // Store as Date in MongoDB
  tableData: Omit<ReceiptItem, 'sNo' | 'netWt' | 'finalWt'>[]; // Store raw input, netWt/finalWt can be calculated on display or stored
  totals: { // Store calculated totals
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  createdAt?: Date; 
  updatedAt?: Date; 
}


export default function ReceiptDetailsPage() {
  return (
    <Layout>
      <ReceiptDetailsContent />
    </Layout>
  );
}

function ReceiptDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {toast} = useToast();

  const clientIdParam = searchParams.get('clientId');
  const clientNameParam = searchParams.get('clientName') || '[Client Name]';
  const receiptIdParam = searchParams.get('receiptId'); // This will be MongoDB _id

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [metal, setMetal] = useState('');
  const [weight, setWeight] = useState(''); 
  const [weightUnit, setWeightUnit] = useState(''); 
  const [items, setItems] = useState<ReceiptItem[]>([
    {sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''},
  ]);
  const [initialState, setInitialState] = useState<
    {date?: Date; metal: string; weight: string; weightUnit: string; items: ReceiptItem[]} | null
  >(null);

  const [isEditMode, setIsEditMode] = useState(!receiptIdParam);
  const [isLoading, setIsLoading] = useState(!!receiptIdParam);
  const [isSaving, setIsSaving] = useState(false);
  const [existingReceiptId, setExistingReceiptId] = useState<string | null>(receiptIdParam);

  const [clientShopName, setClientShopName] = useState('');
  const [clientPhoneNumber, setClientPhoneNumber] = useState('');

  const fetchClientData = useCallback(async () => {
    if (clientIdParam) {
      // TODO: Implement MongoDB data fetching for client details (if needed, e.g., shopName, phone)
      // Example: const clientData = await fetchClientFromMongoDB(clientIdParam);
      // if (clientData) { setClientShopName(clientData.shopName || ''); setClientPhoneNumber(clientData.phoneNumber || ''); }
      console.warn(`Client details fetching for ID ${clientIdParam} not implemented. Waiting for MongoDB setup.`);
      toast({
        title: "Client Info Pending",
        description: "Client shop name and phone will be loaded once MongoDB is configured.",
        variant: "default"
      });
    }
  }, [clientIdParam, toast]);

  const resetToNewReceiptState = useCallback(() => {
    setDate(new Date());
    setMetal('');
    setWeight('');
    setWeightUnit('');
    setItems([{sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''}]);
    setInitialState(null);
    setIsEditMode(true); 
    setExistingReceiptId(null);
  }, []);

  const fetchReceipt = useCallback(async () => {
    if (existingReceiptId && clientIdParam) { 
      setIsLoading(true);
      // TODO: Implement MongoDB data fetching for existing receipt
      // Example: const data = await fetchClientReceiptFromMongoDB(existingReceiptId);
      // if (data) { 
      //   setDate(data.issueDate ? new Date(data.issueDate) : undefined);
      //   setMetal(data.metalType || '');
      //   // setWeight and setWeightUnit if stored
      //   setItems(data.tableData.map((item, index) => ({
      //      sNo: index + 1,
      //      ...item,
      //      netWt: calculateNetWt(item.grossWt, item.stoneWt).toFixed(3),
      //      finalWt: calculateFinalWt(item.grossWt, item.stoneWt, item.meltingTouch).toFixed(3),
      //   })));
      //   setInitialState({ date: data.issueDate ? new Date(data.issueDate) : undefined, metal: data.metalType, items: data.tableData, weight: '', weightUnit: '' });
      //   setIsEditMode(false);
      // } else { 
      //   toast({variant: 'destructive', title: 'Not Found', description: `Receipt with ID ${existingReceiptId} not found.`});
      //   resetToNewReceiptState(); 
      // }
      console.warn(`Data fetching for receipt ID ${existingReceiptId} not implemented. Waiting for MongoDB setup.`);
      toast({
          title: "Data Fetching Pending",
          description: `Receipt details for ${existingReceiptId} will be loaded once MongoDB is configured.`,
          variant: "default"
      });
      // resetToNewReceiptState(); // Default to new if fetching fails or not implemented
      setIsLoading(false);
    } else if (!existingReceiptId) { 
      resetToNewReceiptState();
      setIsLoading(false);
    }
    else if (!clientIdParam) {
        setIsLoading(false);
        toast({variant: 'destructive', title: 'Error', description: 'Client ID is missing. Cannot load receipt.'});
        router.push('/receipt'); 
    }
  }, [clientIdParam, existingReceiptId, toast, resetToNewReceiptState, router]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  useEffect(() => {
    if (receiptIdParam) { 
      setExistingReceiptId(receiptIdParam);
    } else { 
      resetToNewReceiptState();
      setIsLoading(false);
    }
  }, [receiptIdParam, resetToNewReceiptState]);

  useEffect(() => {
    if (existingReceiptId && clientIdParam) { 
      fetchReceipt();
    } else if (!existingReceiptId && clientIdParam) { 
        resetToNewReceiptState();
        setIsLoading(false);
    }
  }, [existingReceiptId, clientIdParam, fetchReceipt, resetToNewReceiptState]);


  const handleAddItem = () => {
    if (!isEditMode && existingReceiptId) return; 

    setItems(prevItems => [
      ...prevItems,
      {sNo: prevItems.length + 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''},
    ]);
  };

  const handleRemoveItem = (sNoToRemove: number) => {
    if (!isEditMode) return; 
    if (items.length <= 1) {
      toast({variant: 'destructive', title: 'Cannot Remove', description: 'At least one item row is required.'});
      return;
    }
    const newItems = items
      .filter(item => item.sNo !== sNoToRemove)
      .map((item, index) => ({...item, sNo: index + 1})); 
    setItems(newItems);
  };

  const calculateNetWt = (grossWtStr: string, stoneWtStr: string) => {
    const grossWt = parseFloat(grossWtStr) || 0;
    const stoneWt = parseFloat(stoneWtStr) || 0;
    return Math.max(0, grossWt - stoneWt);
  };

  const calculateFinalWt = (grossWtStr: string, stoneWtStr: string, meltingTouchStr: string) => {
    const netWtValue = calculateNetWt(grossWtStr, stoneWtStr);
    const meltingTouch = parseFloat(meltingTouchStr) || 0;
    const effectiveMeltingTouch = meltingTouch === 0 ? 100 : meltingTouch; // Avoid division by zero
    return (netWtValue * effectiveMeltingTouch) / 100;
  };

  const handleInputChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!isEditMode) return; 

    setItems(prevItems => {
      const newItems = [...prevItems];
      const currentItem = {...newItems[index], [field]: value};
      
      currentItem.netWt = calculateNetWt(currentItem.grossWt, currentItem.stoneWt).toFixed(3);
      currentItem.finalWt = calculateFinalWt(currentItem.grossWt, currentItem.stoneWt, currentItem.meltingTouch).toFixed(3);
      
      newItems[index] = currentItem;
      return newItems;
    });
  };

  const calculateTotal = (field: keyof Pick<ReceiptItem, 'grossWt' | 'stoneWt' | 'netWt' | 'finalWt' | 'stoneAmt'>) => {
    const validItems = items.filter(item => {
      const val = item[field];
      return typeof val === 'string' && val.trim() !== '' && !isNaN(parseFloat(val));
    });
    return validItems.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
  };

  const handleEditReceipt = () => {
    setInitialState({date, metal, weight, weightUnit, items: JSON.parse(JSON.stringify(items))}); 
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (initialState) { 
      setDate(initialState.date);
      setMetal(initialState.metal);
      setWeight(initialState.weight);
      setWeightUnit(initialState.weightUnit);
      setItems(JSON.parse(JSON.stringify(initialState.items))); 
    } else {
        if (existingReceiptId) fetchReceipt(); 
        else resetToNewReceiptState(); 
    }
    setIsEditMode(false); 
  };


  const handleSaveReceipt = async () => {
    if (!clientIdParam) {
      toast({variant: 'destructive', title: 'Error', description: 'Client ID is missing. Cannot save receipt.'});
      return;
    }
    if (!date) {
      toast({variant: 'destructive', title: 'Validation Error', description: 'Please select an issue date.'});
      return;
    }
    if (!metal.trim()) {
      toast({variant: 'destructive', title: 'Validation Error', description: 'Please select a metal type.'});
      return;
    }
    const validItemsForSave = items.filter(item =>
      item.itemName.trim() !== '' || item.tag.trim() !== '' || item.grossWt.trim() !== '' ||
      item.stoneWt.trim() !== '' || item.meltingTouch.trim() !== '' || item.stoneAmt.trim() !== ''
    ).map(({ sNo, netWt, finalWt, ...dbItem }) => dbItem); // Exclude UI-only fields

    if (validItemsForSave.length === 0) {
      toast({variant: 'destructive', title: 'Validation Error', description: 'Please add at least one valid item with some details.'});
      return;
    }

    setIsSaving(true);

    const receiptDataToSave: Omit<ClientReceiptData, '_id' | 'createdAt' | 'updatedAt'> = {
        clientId: clientIdParam,
        clientName: clientNameParam, // Denormalized
        shopName: clientShopName, // Denormalized
        phoneNumber: clientPhoneNumber, // Denormalized
        metalType: metal,
        issueDate: date, 
        tableData: validItemsForSave,
        totals: {
            grossWt: calculateTotal('grossWt'),
            stoneWt: calculateTotal('stoneWt'),
            netWt: calculateTotal('netWt'),
            finalWt: calculateTotal('finalWt'),
            stoneAmt: calculateTotal('stoneAmt'),
        },
    };

    // TODO: Implement MongoDB data saving/updating here
    // if (existingReceiptId) {
    //   await updateClientReceiptInMongoDB(existingReceiptId, {...receiptDataToSave, updatedAt: new Date()});
    // } else {
    //   const newReceipt = await createClientReceiptInMongoDB({...receiptDataToSave, createdAt: new Date(), updatedAt: new Date()});
    //   setExistingReceiptId(newReceipt._id.toString()); // Assuming MongoDB returns the new document with _id
    //   router.replace(`/receipt/details?clientId=${clientIdParam}&clientName=${encodeURIComponent(clientNameParam)}&receiptId=${newReceipt._id.toString()}`, { scroll: false });
    // }
    console.warn(`Save operation for receipt not implemented. Waiting for MongoDB setup.`);
    toast({
        title: "Save Operation Pending",
        description: `Client receipt for ${clientNameParam} will be saved/updated once MongoDB is configured.`,
        variant: "default"
    });

    // Simulating a save for UI update
    let tempExistingReceiptId = existingReceiptId;
    if (!tempExistingReceiptId) {
        tempExistingReceiptId = `temp_mongo_id_${Date.now()}`; // Placeholder
        setExistingReceiptId(tempExistingReceiptId);
        router.replace(`/receipt/details?clientId=${clientIdParam}&clientName=${encodeURIComponent(clientNameParam)}&receiptId=${tempExistingReceiptId}`, { scroll: false });
    }
    
    const savedItemsForInitialState = items.map((it, idx) => ({ ...it, sNo: idx + 1 }));
    setInitialState({date, metal, weight, weightUnit, items: JSON.parse(JSON.stringify(savedItemsForInitialState))});
    setIsEditMode(false); 
    toast({ title: 'Simulated Save', description: 'Client receipt data prepared. (MongoDB Save/Update Pending)' });
    setIsSaving(false);
  };


  const downloadReceipt = () => {
    if (!date) {
      toast({variant: 'destructive', title: 'Error', description: 'Cannot download receipt without a date.'});
      return;
    }
    const validItems = items.filter(item =>
      item.itemName.trim() !== '' || item.tag.trim() !== '' || item.grossWt.trim() !== '' ||
      item.stoneWt.trim() !== '' || item.meltingTouch.trim() !== '' || item.stoneAmt.trim() !== ''
    );

    if (validItems.length === 0) {
      toast({variant: 'destructive', title: 'Error', description: 'Cannot download an empty receipt. Please add items.'});
      return;
    }

    const doc = new jsPDF();
    const primaryColor = '#000000'; 
    const borderColor = '#B8860B'; 
    const headerColor = '#FFF8DC'; 
    const rowColor = '#FFFFFF'; 
    const alternateRowColor = '#FAF0E6'; 
    const titleFontSize = 20;
    const textFontSize = 10;
    const tableHeaderFontSize = 9;
    const tableBodyFontSize = 8;
    const margin = 10; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight(); 

    doc.setDrawColor(borderColor); 
    doc.setLineWidth(0.5); 
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin); 

    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    const title = 'Goldsmith Receipt';
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, margin + 10); 

    doc.setFontSize(textFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(primaryColor);
    let startY = margin + 25; 
    doc.text(`Name: ${clientNameParam || 'N/A'}`, margin + 5, startY);
    startY += 6;
    doc.text(`Date: ${date ? format(date, 'PPP') : 'N/A'}`, margin + 5, startY);
    startY += 6;
    doc.text(`Shop: ${clientShopName || 'N/A'}`, margin + 5, startY);
    startY += 6;
    doc.text(`Phone: ${clientPhoneNumber || 'N/A'}`, margin + 5, startY);
    startY += 6;
    doc.text(`Metal Type: ${metal || 'N/A'}`, margin + 5, startY);
    startY += 6;
    if (weight.trim() && weightUnit.trim()) {
        doc.text(`Overall Weight: ${weight} ${weightUnit}`, margin + 5, startY);
        startY +=6;
    } else if (weight.trim()) {
        doc.text(`Overall Weight: ${weight}`, margin + 5, startY);
        startY +=6;
    }


    const tableColumn = ['S.No.', 'Item Name', 'Tag', 'Gross (wt)', 'Stone (wt)', 'Net (wt)', 'M/T (%)', 'Final (wt)', 'Stone Amt'];
    const tableRows = validItems.map(item => [
      item.sNo.toString(),
      item.itemName || '',
      item.tag || '',
      item.grossWt ? parseFloat(item.grossWt).toFixed(3) : '0.000',
      item.stoneWt ? parseFloat(item.stoneWt).toFixed(3) : '0.000',
      item.netWt ? parseFloat(item.netWt).toFixed(3) : '0.000', 
      item.meltingTouch ? parseFloat(item.meltingTouch).toFixed(2) : '0.00',
      item.finalWt ? parseFloat(item.finalWt).toFixed(3) : '0.000', 
      item.stoneAmt ? parseFloat(item.stoneAmt).toFixed(2) : '0.00',
    ]);

    const totalGrossWtPdf = calculateTotal('grossWt');
    const totalStoneWtPdf = calculateTotal('stoneWt');
    const totalNetWtPdf = calculateTotal('netWt');
    const totalFinalWtPdf = calculateTotal('finalWt');
    const totalStoneAmtPdf = calculateTotal('stoneAmt');

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY + 5,
      theme: 'grid', 
      headStyles: {
        fillColor: headerColor,
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: tableHeaderFontSize,
        lineWidth: 0.1,
        lineColor: borderColor, 
        halign: 'center'
      },
      bodyStyles: {
        fillColor: rowColor,
        textColor: primaryColor,
        fontSize: tableBodyFontSize,
        lineWidth: 0.1,
        lineColor: borderColor,
        cellPadding: 1.5
      },
      alternateRowStyles: {fillColor: alternateRowColor},
      footStyles: { 
        fillColor: headerColor,
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: tableHeaderFontSize,
        lineWidth: 0.1,
        lineColor: borderColor,
        halign: 'right' 
      },
      tableLineColor: borderColor, 
      tableLineWidth: 0.1,
      margin: {left: margin + 2, right: margin + 2}, 
      didParseCell: (data) => { 
        const numericColumns = [0, 3, 4, 5, 6, 7, 8]; 
        if (data.column.index === 0 && (data.section === 'body' || data.section === 'foot')) {
            data.cell.styles.halign = 'center';
        } else if ((data.section === 'body' || data.section === 'foot') && numericColumns.includes(data.column.index)) {
            data.cell.styles.halign = 'right'; 
        }
        if (data.section === 'foot' && data.column.index === 1) { 
            data.cell.styles.halign = 'right';
        }
      },
      showFoot: 'lastPage', 
      foot: [ 
        [ 
          {content: '', styles: {halign: 'center'}}, 
          {content: 'Total', colSpan: 2, styles: {fontStyle: 'bold', halign: 'right'}}, 
          {content: totalGrossWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalStoneWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalNetWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: '', styles: {halign: 'right'}}, 
          {content: totalFinalWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalStoneAmtPdf.toFixed(2), styles: {fontStyle: 'bold', halign: 'right'}},
        ],
      ],
    });

    doc.save(`receipt_${clientNameParam.replace(/\s+/g, '_')}_${date ? format(date, 'yyyyMMdd') : 'nodate'}.pdf`);
    toast({title: 'Success', description: 'Client receipt downloaded.'});
  };


  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <p>Loading receipt details... Waiting for MongoDB configuration.</p>
        </div>
      </Layout>
    );
  }
  
  const mainCardClasses = "w-full mx-auto px-0 py-0"; 
  const contentPadding = "p-2 md:p-3"; 

  return (
    <Layout>
      <div className={`flex flex-col justify-start min-h-screen bg-secondary ${contentPadding}`}>
        <Card className={mainCardClasses}>
          <CardHeader className={`space-y-1 ${contentPadding} pb-2`}>
             <CardDescription>Client receipt data will be stored in MongoDB once configured.</CardDescription>
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <CardTitle className="text-xl md:text-2xl">Client Receipt</CardTitle>
                <CardDescription>
                  Client: {clientNameParam} {existingReceiptId ? `(ID: ${existingReceiptId.substring(0,10)}...)` : '(New Receipt)'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {!isEditMode && existingReceiptId ? (
                  <>
                    <Button onClick={handleEditReceipt} variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" /> Edit Receipt
                    </Button>
                    <Button onClick={downloadReceipt} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" /> Download Receipt
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSaveReceipt} disabled={isSaving} size="sm">
                      <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : (existingReceiptId ? 'Save Changes' : 'Create Receipt')}
                    </Button>
                    {existingReceiptId && isEditMode && ( 
                       <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving} size="sm">
                         <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                       </Button>
                    )}
                  </>
                ) }
                <Button variant="secondary" onClick={() => router.back()} disabled={isSaving} size="sm">
                  Back
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`grid gap-3 ${contentPadding} pt-0`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')} disabled={!isEditMode && !!existingReceiptId}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick Issue Date</span>}
                  </Button>
                </PopoverTrigger>
                {(isEditMode || !existingReceiptId) && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                )}
              </Popover>

              <Select onValueChange={setMetal} value={metal} disabled={!isEditMode && !!existingReceiptId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Metal Type" />
                </SelectTrigger>
                {(isEditMode || !existingReceiptId) && (
                  <SelectContent>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                    <SelectItem value="Diamond">Diamond</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                )}
              </Select>

              <div className="flex items-center space-x-2">
                <Input type="number" placeholder="Overall Weight (Opt.)" value={weight} onChange={e => setWeight(e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="flex-1 text-sm h-9" step="0.001"/>
                <Select onValueChange={setWeightUnit} value={weightUnit} disabled={!isEditMode && !!existingReceiptId}>
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  {(isEditMode || !existingReceiptId) && (
                    <SelectContent>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                       <SelectItem value="ct">ct</SelectItem>
                    </SelectContent>
                  )}
                </Select>
              </div>
            </div>
            <hr className="border-border my-2" />
            <div className="overflow-x-auto">
              <h3 className="text-lg font-medium mb-2">Receipt Items</h3>
              <table className="w-full border border-collapse border-border">
                <colgroup>
                    <col style={{ width: '4%' }} />  
                    <col style={{ width: 'auto' }} /> 
                    <col style={{ width: '10%' }} /> 
                    <col style={{ width: '12%' }} /> 
                    <col style={{ width: '12%' }} /> 
                    <col style={{ width: '10%' }} /> 
                    <col style={{ width: '10%' }} /> 
                    <col style={{ width: '10%' }} /> 
                    <col style={{ width: '12%' }} /> 
                    <col style={{ width: '7%' }} />  
                </colgroup>
                <thead>
                  <tr className="bg-muted">
                    <th className="p-1.5 border text-center text-xs md:text-sm">S.No.</th>
                    <th className="p-1.5 border text-left text-xs md:text-sm">Item Name</th>
                    <th className="p-1.5 border text-left text-xs md:text-sm">Tag</th>
                    <th className="p-1.5 border text-right text-xs md:text-sm">Gross (wt)</th>
                    <th className="p-1.5 border text-right text-xs md:text-sm">Stone (wt)</th>
                    <th className="p-1.5 border text-right text-xs md:text-sm">Net (wt)</th>
                    <th className="p-1.5 border text-right text-xs md:text-sm">M/T (%)</th>
                    <th className="p-1.5 border text-right text-xs md:text-sm">Final (wt)</th>
                    <th className="p-1.5 border text-right text-xs md:text-sm">Stone Amt</th>
                    <th className="p-1.5 border text-center text-xs md:text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.sNo}>
                      <td className="p-1 border align-middle text-xs md:text-sm text-center">{item.sNo}</td>
                      <td className="p-1 border align-middle">
                        <Input type="text" value={item.itemName} onChange={e => handleInputChange(index, 'itemName', e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="text-xs md:text-sm h-8 md:h-9 w-full" placeholder="Item name"/>
                      </td>
                      <td className="p-1 border align-middle">
                        <Input type="text" value={item.tag} onChange={e => handleInputChange(index, 'tag', e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="text-xs md:text-sm h-8 md:h-9 w-full" placeholder="Tag"/>
                      </td>
                      <td className="p-1 border align-middle">
                        <Input type="number" value={item.grossWt} onChange={e => handleInputChange(index, 'grossWt', e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="text-xs md:text-sm h-8 md:h-9 text-right w-full" step="0.001" placeholder="0.000"/>
                      </td>
                      <td className="p-1 border align-middle">
                        <Input type="number" value={item.stoneWt} onChange={e => handleInputChange(index, 'stoneWt', e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="text-xs md:text-sm h-8 md:h-9 text-right w-full" step="0.001" placeholder="0.000"/>
                      </td>
                      <td className="p-1 border text-right align-middle text-xs md:text-sm bg-muted/30">{item.netWt}</td>
                      <td className="p-1 border align-middle">
                        <Input type="number" value={item.meltingTouch} onChange={e => handleInputChange(index, 'meltingTouch', e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="text-xs md:text-sm h-8 md:h-9 text-right w-full" step="0.01" placeholder="0.00"/>
                      </td>
                      <td className="p-1 border text-right align-middle text-xs md:text-sm bg-muted/30">{item.finalWt}</td>
                      <td className="p-1 border align-middle">
                        <Input type="number" value={item.stoneAmt} onChange={e => handleInputChange(index, 'stoneAmt', e.target.value)} disabled={!isEditMode && !!existingReceiptId} className="text-xs md:text-sm h-8 md:h-9 text-right w-full" step="0.01" placeholder="0.00"/>
                      </td>
                      <td className="p-1 border text-center align-middle">
                        {(isEditMode || !existingReceiptId) && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.sNo)} disabled={items.length <= 1 && (!isEditMode && !!existingReceiptId)} className="text-destructive hover:text-destructive/80 h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted font-semibold">
                    <td className="p-1.5 border text-xs md:text-sm"></td>
                    <td className="p-1.5 border text-right text-xs md:text-sm" colSpan={2}>Total:</td>
                    <td className="p-1.5 border text-right text-xs md:text-sm">{calculateTotal('grossWt').toFixed(3)}</td>
                    <td className="p-1.5 border text-right text-xs md:text-sm">{calculateTotal('stoneWt').toFixed(3)}</td>
                    <td className="p-1.5 border text-right text-xs md:text-sm">{calculateTotal('netWt').toFixed(3)}</td>
                    <td className="p-1.5 border text-xs md:text-sm"></td>
                    <td className="p-1.5 border text-right text-xs md:text-sm">{calculateTotal('finalWt').toFixed(3)}</td>
                    <td className="p-1.5 border text-right text-xs md:text-sm">{calculateTotal('stoneAmt').toFixed(2)}</td>
                    <td className="p-1.5 border text-xs md:text-sm"></td>
                  </tr>
                </tbody>
              </table>
              {(isEditMode || !existingReceiptId) && (
                <Button onClick={handleAddItem} variant="outline" size="sm" className="mt-3">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item Row
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
