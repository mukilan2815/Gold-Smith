'use client';

import type {ChangeEvent} from 'react';
import {useState, useEffect, useRef, useCallback} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'; // Import Firestore functions
import {format, parseISO, isValid} from 'date-fns';
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
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';
import {db} from '@/lib/firebase'; // Import Firestore instance

interface ReceiptItem {
  sNo: number; // Changed to non-optional, will always be managed
  itemName: string;
  tag: string;
  grossWt: string;
  stoneWt: string;
  netWt: string; // Calculated
  meltingTouch: string;
  finalWt: string; // Calculated
  stoneAmt: string;
}

interface ClientReceiptData {
  clientId: string;
  clientName: string;
  shopName?: string;
  phoneNumber?: string;
  metalType: string;
  issueDate: string; // Store as ISO string
  tableData: Omit<ReceiptItem, 'sNo'>[];
  totals: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  createdAt?: any;
  updatedAt?: any;
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
  const summaryRef = useRef<HTMLDivElement>(null);

  const clientIdParam = searchParams.get('clientId');
  const clientNameParam = searchParams.get('clientName') || '[Client Name]';
  const receiptIdParam = searchParams.get('receiptId');

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

  const [isEditMode, setIsEditMode] = useState(true);
  const [isLoading, setIsLoading] = useState(!!receiptIdParam);
  const [isSaving, setIsSaving] = useState(false);
  const [existingReceiptId, setExistingReceiptId] = useState<string | null>(receiptIdParam);

  const [clientShopName, setClientShopName] = useState('');
  const [clientPhoneNumber, setClientPhoneNumber] = useState('');

  const fetchClientData = useCallback(async () => {
    if (clientIdParam) {
      try {
        const clientRef = doc(db, 'ClientDetails', clientIdParam);
        const docSnap = await getDoc(clientRef);
        if (docSnap.exists()) {
          const clientData = docSnap.data();
          setClientShopName(clientData.shopName || '');
          setClientPhoneNumber(clientData.phoneNumber || '');
        }
      } catch (error) {
        console.error('Error fetching client details:', error);
      }
    }
  }, [clientIdParam]);

  const resetToNewReceiptState = useCallback(() => {
    setDate(new Date());
    setMetal('');
    setWeight('');
    setWeightUnit('');
    setItems([{sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''}]);
    setInitialState(null);
  }, []);

  const fetchReceipt = useCallback(async () => {
    if (existingReceiptId && clientIdParam) {
      setIsLoading(true);
      try {
        const receiptRef = doc(db, 'ClientReceipts', existingReceiptId);
        const docSnap = await getDoc(receiptRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ClientReceiptData;
          const loadedDate = data.issueDate && isValid(parseISO(data.issueDate)) ? parseISO(data.issueDate) : undefined;
          const loadedMetal = data.metalType || '';
          const loadedWeight = ''; 
          const loadedWeightUnit = '';
          const loadedItems = data.tableData && data.tableData.length > 0
            ? data.tableData.map((item, index) => {
                const grossWtVal = parseFloat(item.grossWt || '0');
                const stoneWtVal = parseFloat(item.stoneWt || '0');
                const meltingTouchVal = parseFloat(item.meltingTouch || '0');
                const netWtVal = grossWtVal - stoneWtVal;
                const finalWtVal = (netWtVal * meltingTouchVal) / 100;
                return {
                  ...item,
                  sNo: index + 1,
                  grossWt: item.grossWt || '',
                  stoneWt: item.stoneWt || '',
                  meltingTouch: item.meltingTouch || '',
                  stoneAmt: item.stoneAmt || '',
                  netWt: netWtVal.toFixed(3),
                  finalWt: finalWtVal.toFixed(3),
                };
              })
            : [{sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''}];

          setDate(loadedDate);
          setMetal(loadedMetal);
          setWeight(loadedWeight);
          setWeightUnit(loadedWeightUnit);
          setItems(loadedItems);
          const initialStateData = {date: loadedDate, metal: loadedMetal, weight: loadedWeight, weightUnit: loadedWeightUnit, items: loadedItems};
          setInitialState(initialStateData);
          setIsEditMode(false); 
        } else {
          toast({variant: 'destructive', title: 'Not Found', description: 'Receipt not found. Creating new.'});
          setExistingReceiptId(null);
          resetToNewReceiptState();
          setIsEditMode(true);
        }
      } catch (error) {
        console.error('Error fetching receipt:', error);
        toast({variant: 'destructive', title: 'Error', description: 'Could not load receipt details.'});
        setExistingReceiptId(null);
        resetToNewReceiptState();
        setIsEditMode(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      resetToNewReceiptState();
      setIsEditMode(true);
      setIsLoading(false);
    }
  }, [clientIdParam, existingReceiptId, toast, resetToNewReceiptState]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  useEffect(() => {
    if (existingReceiptId) {
      fetchReceipt();
    } else {
      resetToNewReceiptState();
      setIsEditMode(true);
      setIsLoading(false);
    }
  }, [existingReceiptId, fetchReceipt, resetToNewReceiptState]);

  const handleAddItem = () => {
    if (!isEditMode) return;
    setItems(prevItems => [
      ...prevItems,
      {sNo: prevItems.length + 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''},
    ]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    if (!isEditMode) return; 
    if (items.length <= 1) {
      toast({variant: 'destructive', title: 'Cannot Remove', description: "At least one item row is required."});
      return;
    }
    const newItems = items
      .filter((_, index) => index !== indexToRemove)
      .map((item, index) => ({...item, sNo: index + 1}));
    setItems(newItems);
  };

  const handleInputChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!isEditMode) return;

    setItems(prevItems => {
      const newItems = [...prevItems];
      const currentItem = {...newItems[index], [field]: value};

      const grossWt = parseFloat(currentItem.grossWt) || 0;
      const stoneWt = parseFloat(currentItem.stoneWt) || 0;
      const meltingTouch = parseFloat(currentItem.meltingTouch) || 0;

      currentItem.netWt = (grossWt - stoneWt).toFixed(3);
      const netWt = parseFloat(currentItem.netWt) || 0;
      currentItem.finalWt = meltingTouch === 0 ? '0.000' : ((netWt * meltingTouch) / 100).toFixed(3);
      
      newItems[index] = currentItem;
      return newItems;
    });
  };

  const calculateTotal = (field: keyof Pick<ReceiptItem, 'grossWt' | 'stoneWt' | 'netWt' | 'finalWt' | 'stoneAmt'>) => {
    const validItems = items.filter(item => item[field] && !isNaN(parseFloat(item[field])));
    return validItems.reduce((acc, item) => {
      const value = parseFloat(item[field]);
      return acc + value;
    }, 0);
  };

  const handleEditReceipt = () => {
    setInitialState({date, metal, weight, weightUnit, items});
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (initialState) {
      setDate(initialState.date);
      setMetal(initialState.metal);
      setWeight(initialState.weight);
      setWeightUnit(initialState.weightUnit);
      setItems(initialState.items);
    } else {
      if (existingReceiptId) {
        fetchReceipt(); 
      } else {
        resetToNewReceiptState();
      }
    }
    setIsEditMode(false);
  };

  const handleSaveReceipt = async () => {
    if (!clientIdParam) {
      toast({variant: 'destructive', title: 'Error', description: 'Client ID is missing.'});
      return;
    }
    if (!date) {
      toast({variant: 'destructive', title: 'Error', description: 'Please select an issue date.'});
      return;
    }
    if (!metal) {
      toast({variant: 'destructive', title: 'Error', description: 'Please select a metal type.'});
      return;
    }
    const validItems = items.filter(item =>
      item.itemName.trim() !== '' ||
      item.tag.trim() !== '' ||
      item.grossWt.trim() !== '' ||
      item.stoneWt.trim() !== '' ||
      item.meltingTouch.trim() !== '' ||
      item.stoneAmt.trim() !== ''
    );

    if (validItems.length === 0) {
      toast({variant: 'destructive', title: 'Error', description: 'Please add at least one valid item to the receipt.'});
      return;
    }

    setIsSaving(true);
    const toastId = toast({
      title: existingReceiptId ? 'Updating Receipt...' : 'Creating Receipt...',
      description: 'Please wait.',
    }).id;

    const totalGrossWt = validItems.reduce((acc, item) => acc + (parseFloat(item.grossWt) || 0), 0);
    const totalStoneWt = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneWt) || 0), 0);
    const totalNetWt = validItems.reduce((acc, item) => acc + (parseFloat(item.netWt) || 0), 0);
    const totalFinalWt = validItems.reduce((acc, item) => acc + (parseFloat(item.finalWt) || 0), 0);
    const totalStoneAmt = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneAmt) || 0), 0);

    const receiptData: Omit<ClientReceiptData, 'createdAt' | 'updatedAt'> = {
      clientId: clientIdParam,
      clientName: clientNameParam,
      shopName: clientShopName,
      phoneNumber: clientPhoneNumber,
      metalType: metal,
      issueDate: date.toISOString(),
      tableData: validItems.map(({sNo, ...item}) => ({
        itemName: item.itemName || '',
        tag: item.tag || '',
        grossWt: item.grossWt || '0',
        stoneWt: item.stoneWt || '0',
        netWt: item.netWt || '0.000',
        meltingTouch: item.meltingTouch || '0',
        finalWt: item.finalWt || '0.000',
        stoneAmt: item.stoneAmt || '0',
      })),
      totals: {
        grossWt: parseFloat(totalGrossWt.toFixed(3)),
        stoneWt: parseFloat(totalStoneWt.toFixed(3)),
        netWt: parseFloat(totalNetWt.toFixed(3)),
        finalWt: parseFloat(totalFinalWt.toFixed(3)),
        stoneAmt: parseFloat(totalStoneAmt.toFixed(2)),
      },
    };

    try {
      if (existingReceiptId) {
        await updateDoc(doc(db, 'ClientReceipts', existingReceiptId), {
          ...receiptData,
          updatedAt: serverTimestamp(),
        });
        toast({id: toastId, title: 'Receipt Updated!', description: 'The receipt has been saved successfully.'});
      } else {
        const newReceiptRef = await addDoc(collection(db, 'ClientReceipts'), {
          ...receiptData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setExistingReceiptId(newReceiptRef.id);
        router.replace(`/receipt/details?clientId=${clientIdParam}&clientName=${encodeURIComponent(clientNameParam)}&receiptId=${newReceiptRef.id}`, { scroll: false });
        toast({id: toastId, title: 'Receipt Created!', description: 'The receipt has been saved successfully.'});
      }
      const savedItemsForInitialState = validItems.map((it, idx) => {
        const grossWtVal = parseFloat(it.grossWt || '0');
        const stoneWtVal = parseFloat(it.stoneWt || '0');
        const meltingTouchVal = parseFloat(it.meltingTouch || '0');
        const netWtVal = grossWtVal - stoneWtVal;
        const finalWtVal = meltingTouchVal === 0 ? 0 : (netWtVal * meltingTouchVal) / 100;
        return {
            ...it,
            sNo: idx + 1,
            netWt: netWtVal.toFixed(3),
            finalWt: finalWtVal.toFixed(3),
        };
      });
      const savedInitialState = {date, metal, weight, weightUnit, items: savedItemsForInitialState};
      setInitialState(savedInitialState);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast({id: toastId, variant: 'destructive', title: 'Error', description: 'Failed to save receipt.'});
    } finally {
      setIsSaving(false);
    }
  };

  const downloadReceipt = () => {
    if (!date) {
      toast({variant: 'destructive', title: 'Error', description: 'Cannot download receipt without a date.'});
      return;
    }
    const validItems = items.filter(item =>
      item.itemName.trim() !== '' ||
      item.tag.trim() !== '' ||
      item.grossWt.trim() !== '' ||
      item.stoneWt.trim() !== '' ||
      item.meltingTouch.trim() !== '' ||
      item.stoneAmt.trim() !== ''
    );

    if (validItems.length === 0) {
      toast({variant: 'destructive', title: 'Error', description: 'Cannot download an empty receipt.'});
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
    doc.text(`Name: ${clientNameParam}`, margin + 5, startY);
    startY += 6;
    doc.text(`Date: ${format(date, 'PPP')}`, margin + 5, startY);
    startY += 6;
    doc.text(`Metals: ${metal || 'N/A'}`, margin + 5, startY);
    startY += 6;
    if (weight.trim() && weightUnit.trim()) {
      doc.text(`Weight: ${weight} ${weightUnit}`, margin + 5, startY);
      startY += 6;
    } else if (weight.trim()) {
      doc.text(`Weight: ${weight}`, margin + 5, startY); 
      startY += 6;
    }

    const tableColumn = ['S.No.', 'Item Name', 'Tag', 'Gross', 'Stone', 'Net', 'M/T %', 'Final', 'Stone Amt'];
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

    const totalGrossWtPdf = validItems.reduce((acc, item) => acc + (parseFloat(item.grossWt) || 0), 0);
    const totalStoneWtPdf = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneWt) || 0), 0);
    const totalNetWtPdf = validItems.reduce((acc, item) => acc + (parseFloat(item.netWt) || 0), 0);
    const totalFinalWtPdf = validItems.reduce((acc, item) => acc + (parseFloat(item.finalWt) || 0), 0);
    const totalStoneAmtPdf = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneAmt) || 0), 0);

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
        halign: 'center',
      },
      bodyStyles: {
        fillColor: rowColor,
        textColor: primaryColor,
        fontSize: tableBodyFontSize,
        lineWidth: 0.1,
        lineColor: borderColor,
        cellPadding: 1.5,
      },
      alternateRowStyles: {
        fillColor: alternateRowColor,
      },
      footStyles: {
        fillColor: headerColor,
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: tableHeaderFontSize, 
        lineWidth: 0.1,
        lineColor: borderColor,
        halign: 'right',
      },
      tableLineColor: borderColor,
      tableLineWidth: 0.1,
      margin: {left: margin + 2, right: margin + 2}, 
      didParseCell: function (data) {
        const numericColumns = [0, 3, 4, 5, 6, 7, 8]; // S.No, Gross, Stone, Net, M/T, Final, Stone Amt
         if (data.column.index === 0 && (data.section === 'body' || data.section === 'foot')) { // S.No. column
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
          {content: '', styles: {}}, // Empty for S.No.
          {content: 'Total', colSpan: 2, styles: {fontStyle: 'bold', halign: 'right'}}, // Total spans Item Name and Tag
          {content: totalGrossWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalStoneWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalNetWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          '', 
          {content: totalFinalWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalStoneAmtPdf.toFixed(2), styles: {fontStyle: 'bold', halign: 'right'}},
        ],
      ],
    });

    doc.save(`receipt_${clientNameParam.replace(/\s+/g, '_')}_${format(date, 'yyyyMMdd')}.pdf`);
    toast({title: 'Success', description: 'Receipt downloaded.'});
  };


  if (isLoading) {
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
      <div className="flex flex-col items-center justify-start min-h-screen bg-secondary py-4 md:py-8 px-1 md:px-2">
        <Card className="w-full"> 
          <CardHeader className="space-y-1 p-4"> {/* Reduced padding */}
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Client Receipt</CardTitle>
                <CardDescription>
                  Client: {clientNameParam} {existingReceiptId ? `(ID: ${existingReceiptId})` : '(New Receipt)'}
                </CardDescription>
              </div>
              <div className="flex justify-end gap-2"> {/* Reduced gap */}
                {!isEditMode && existingReceiptId ? ( 
                  <>
                    <Button onClick={handleEditReceipt} variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" /> Edit Receipt
                    </Button>
                    <Button onClick={downloadReceipt} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" /> Download Receipt
                    </Button>
                  </>
                ) : isEditMode && existingReceiptId ? ( 
                  <>
                    <Button onClick={handleSaveReceipt} disabled={isSaving} size="sm">
                      <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving} size="sm">
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                    </Button>
                  </>
                ) : ( 
                  <Button onClick={handleSaveReceipt} disabled={isSaving} size="sm">
                    <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Create Receipt'}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => router.back()} disabled={isSaving} size="sm">
                  Back
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0"> {/* Reduced padding and gap */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full md:w-auto justify-start text-left font-normal', 
                      !date && 'text-muted-foreground'
                    )}
                    disabled={!isEditMode} 
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick Issue Date</span>}
                  </Button>
                </PopoverTrigger>
                {isEditMode && ( 
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                )}
              </Popover>

              <Select onValueChange={setMetal} value={metal} disabled={!isEditMode}>
                <SelectTrigger className="w-full md:w-auto"> 
                  <SelectValue placeholder="Select Metal Type" />
                </SelectTrigger>
                {isEditMode && ( 
                  <SelectContent>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Diamond">Diamond</SelectItem>
                  </SelectContent>
                )}
              </Select>

              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="Overall Weight (Optional)"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  disabled={!isEditMode} 
                  className="flex-1"
                  step="0.001"
                />
                <Select onValueChange={setWeightUnit} value={weightUnit} disabled={!isEditMode}>
                  <SelectTrigger className="w-[100px] md:w-auto"> 
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  {isEditMode && ( 
                    <SelectContent>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                    </SelectContent>
                  )}
                </Select>
              </div>
            </div>
            <hr className="border-border my-2" />
            <div className="overflow-x-auto">
              <h3 className="text-lg font-medium mb-2">Receipt Items</h3>
              <table className="w-full table-fixed border border-collapse border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 border text-center text-sm w-[5%]">S.No.</th>
                    <th className="p-2 border text-left text-sm w-[15%]">Item Name</th>
                    <th className="p-2 border text-left text-sm w-[8%]">Tag</th>
                    <th className="p-2 border text-right text-sm w-[10%]">Gross (wt)</th>
                    <th className="p-2 border text-right text-sm w-[10%]">Stone (wt)</th>
                    <th className="p-2 border text-right text-sm w-[10%]">Net (wt)</th>
                    <th className="p-2 border text-right text-sm w-[10%]">Melting/Touch (%)</th>
                    <th className="p-2 border text-right text-sm w-[10%]">Final (wt)</th>
                    <th className="p-2 border text-right text-sm w-[10%]">Stone Amt</th>
                    <th className="p-2 border text-center text-sm w-[7%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.sNo}>
                      <td className="p-1 border align-middle text-sm text-center">{item.sNo}</td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="text"
                          value={item.itemName}
                          onChange={e => handleInputChange(index, 'itemName', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 w-full"
                          placeholder="Item name"
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="text"
                          value={item.tag}
                          onChange={e => handleInputChange(index, 'tag', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 w-full"
                          placeholder="Tag"
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.grossWt}
                          onChange={e => handleInputChange(index, 'grossWt', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right w-full"
                          step="0.001"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.stoneWt}
                          onChange={e => handleInputChange(index, 'stoneWt', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right w-full"
                          step="0.001"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="p-1 border text-right align-middle text-sm bg-muted/30">
                        {item.netWt}
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.meltingTouch}
                          onChange={e => handleInputChange(index, 'meltingTouch', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right w-full"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-1 border text-right align-middle text-sm bg-muted/30">
                        {item.finalWt}
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.stoneAmt}
                          onChange={e => handleInputChange(index, 'stoneAmt', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right w-full"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-1 border text-center align-middle">
                        {isEditMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
                            className="text-destructive hover:text-destructive/80 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted font-semibold">
                    <td className="p-2 border text-sm text-right" colSpan={3}> {/* Adjusted colSpan for S.No, Item Name, Tag */}
                      Total:
                    </td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('grossWt').toFixed(3)}</td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('stoneWt').toFixed(3)}</td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('netWt').toFixed(3)}</td>
                    <td className="p-2 border"></td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('finalWt').toFixed(3)}</td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('stoneAmt').toFixed(2)}</td>
                    <td className="p-2 border"></td> 
                  </tr>
                </tbody>
              </table>
              {isEditMode && (
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

