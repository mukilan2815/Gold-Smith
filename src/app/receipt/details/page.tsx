'use client';

import type {ChangeEvent} from 'react';
import {useState, useEffect, useRef, useCallback}from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
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
import {useToast}from '@/hooks/use-toast';
import {cn}from '@/lib/utils';
import {db}from '@/lib/firebase';

interface ReceiptItem {
  sNo: number;
  itemName: string;
  tag: string;
  grossWt: string;
  stoneWt: string;
  netWt: string;
  meltingTouch: string;
  finalWt: string;
  stoneAmt: string;
}

interface ClientReceiptData {
  clientId: string;
  clientName: string;
  shopName?: string; // From ClientDetails
  phoneNumber?: string; // From ClientDetails
  metalType: string;
  issueDate: string; // Stored as ISO string
  tableData: Omit<ReceiptItem, 'sNo'>[]; // sNo is for UI only
  totals: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  createdAt?: Timestamp; // Firestore Timestamp
  updatedAt?: Timestamp; // Firestore Timestamp
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
  const receiptIdParam = searchParams.get('receiptId');

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [metal, setMetal] = useState('');
  const [weight, setWeight] = useState(''); // Overall weight, optional
  const [weightUnit, setWeightUnit] = useState(''); // Unit for overall weight, optional
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
      try {
        const clientRef = doc(db, 'ClientDetails', clientIdParam);
        const docSnap = await getDoc(clientRef);
        if (docSnap.exists()) {
          const clientData = docSnap.data();
          setClientShopName(clientData.shopName || '');
          setClientPhoneNumber(clientData.phoneNumber || '');
        } else {
          toast({ variant: "destructive", title: "Client Info Missing", description: "Could not fetch details for the selected client." });
        }
      } catch (error) {
        console.error('Error fetching client details:', error);
         toast({ variant: "destructive", title: "Fetch Error", description: "Could not fetch client details. Check Firestore setup and console." });
      }
    }
  }, [clientIdParam, toast]);

  const resetToNewReceiptState = useCallback(() => {
    setDate(new Date());
    setMetal('');
    setWeight('');
    setWeightUnit('');
    setItems([{sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''}]);
    setInitialState(null);
    setIsEditMode(true); // New receipts are always in edit mode
    setExistingReceiptId(null);
  }, []);

  const fetchReceipt = useCallback(async () => {
    if (existingReceiptId && clientIdParam) { // Ensure clientIdParam is also present
      setIsLoading(true);
      try {
        const receiptRef = doc(db, 'ClientReceipts', existingReceiptId);
        const docSnap = await getDoc(receiptRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ClientReceiptData;
          // Ensure date parsing is robust
          const loadedDate = data.issueDate && isValid(parseISO(data.issueDate)) ? parseISO(data.issueDate) : new Date();
          const loadedMetal = data.metalType || '';
          // Overall weight and unit are not typically part of the receipt's persisted data structure based on requirements
          const loadedWeight = ''; 
          const loadedWeightUnit = '';

          const loadedItems = data.tableData && data.tableData.length > 0
            ? data.tableData.map((item, index) => {
                // Recalculate netWt and finalWt based on fetched data to ensure consistency
                const grossWtVal = parseFloat(item.grossWt || '0');
                const stoneWtVal = parseFloat(item.stoneWt || '0');
                const meltingTouchVal = parseFloat(item.meltingTouch || '0');
                
                const netWtVal = grossWtVal - stoneWtVal;
                const calculatedNetWt = Math.max(0, netWtVal); // Ensure netWt is not negative
                // Use 100 for melting touch if it's 0 to avoid division by zero, though it should ideally be > 0
                const finalWtVal = meltingTouchVal === 0 ? 0 : (calculatedNetWt * meltingTouchVal) / 100;

                return {
                  ...item, // Spread item first
                  sNo: index + 1,
                  grossWt: item.grossWt || '', // Keep original string for input
                  stoneWt: item.stoneWt || '', // Keep original string for input
                  meltingTouch: item.meltingTouch || '', // Keep original string for input
                  stoneAmt: item.stoneAmt || '', // Keep original string for input
                  netWt: calculatedNetWt.toFixed(3), // Calculated display value
                  finalWt: finalWtVal.toFixed(3),   // Calculated display value
                };
              })
            : [{sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''}];

          setDate(loadedDate);
          setMetal(loadedMetal);
          setWeight(loadedWeight); // Not part of persisted data
          setWeightUnit(loadedWeightUnit); // Not part of persisted data
          setItems(loadedItems);
          const initialStateData = {date: loadedDate, metal: loadedMetal, weight: loadedWeight, weightUnit: loadedWeightUnit, items: loadedItems};
          setInitialState(JSON.parse(JSON.stringify(initialStateData))); // Deep copy for initial state
          setIsEditMode(false); // Existing receipts start in view mode
        } else {
          toast({variant: 'destructive', title: 'Not Found', description: 'Receipt not found. Starting a new receipt.'});
          setExistingReceiptId(null); // Clear invalid ID
          resetToNewReceiptState();
        }
      } catch (error) {
        console.error('Error fetching receipt:', error);
        toast({variant: 'destructive', title: 'Error', description: 'Could not load receipt details. Starting new. Check Firestore & console.'});
        setExistingReceiptId(null); // Clear invalid ID
        resetToNewReceiptState();
      } finally {
        setIsLoading(false);
      }
    } else if (!existingReceiptId) { // If no receiptIdParam was provided, it's a new receipt
      resetToNewReceiptState();
      setIsLoading(false);
    }
    // If existingReceiptId is present but clientIdParam is not, it's an invalid state, isLoading should be false.
    else if (!clientIdParam) {
        setIsLoading(false);
        toast({variant: 'destructive', title: 'Error', description: 'Client ID is missing. Cannot load receipt.'});
        router.push('/receipt'); // Redirect if client ID is missing for an existing receipt
    }
  }, [clientIdParam, existingReceiptId, toast, resetToNewReceiptState, router]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  useEffect(() => {
    if (receiptIdParam) { // if URL has receiptId, set it for fetching
      setExistingReceiptId(receiptIdParam);
       // Fetch will be triggered by existingReceiptId change if clientIdParam is also present
    } else { // No receiptId in URL, means new receipt
      resetToNewReceiptState();
      setIsLoading(false);
    }
  }, [receiptIdParam, resetToNewReceiptState]);

  useEffect(() => {
    // This effect runs when existingReceiptId changes (e.g., set from URL param)
    // OR when component mounts and existingReceiptId is already set (from URL)
    if (existingReceiptId && clientIdParam) { // Only fetch if both IDs are available
      fetchReceipt();
    } else if (!existingReceiptId && clientIdParam) { // New receipt for a client
        resetToNewReceiptState();
        setIsLoading(false);
    }
  }, [existingReceiptId, clientIdParam, fetchReceipt, resetToNewReceiptState]);


  const handleAddItem = () => {
    if (!isEditMode && existingReceiptId) return; // Don't add if in view mode for existing receipt

    setItems(prevItems => [
      ...prevItems,
      {sNo: prevItems.length + 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '0.000', meltingTouch: '', finalWt: '0.000', stoneAmt: ''},
    ]);
  };

  const handleRemoveItem = (sNoToRemove: number) => {
    if (!isEditMode) return; // Can only remove in edit mode
    if (items.length <= 1) {
      toast({variant: 'destructive', title: 'Cannot Remove', description: 'At least one item row is required.'});
      return;
    }
    const newItems = items
      .filter(item => item.sNo !== sNoToRemove)
      .map((item, index) => ({...item, sNo: index + 1})); // Re-sequence sNo
    setItems(newItems);
  };


  const handleInputChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!isEditMode) return; // Can only edit in edit mode

    setItems(prevItems => {
      const newItems = [...prevItems];
      const currentItem = {...newItems[index], [field]: value};

      const grossWt = parseFloat(currentItem.grossWt) || 0;
      const stoneWt = parseFloat(currentItem.stoneWt) || 0;
      const meltingTouch = parseFloat(currentItem.meltingTouch) || 0;

      const netWtValue = Math.max(0, grossWt - stoneWt);
      currentItem.netWt = netWtValue.toFixed(3);
      // Use 100 for meltingTouch if it's 0 to avoid division by zero, effectively meaning no melting loss in that specific edge case.
      // Or handle it as per business logic (e.g., if meltingTouch is 0, finalWt is also 0 or netWt). Here, assuming 100 if 0.
      const effectiveMeltingTouch = meltingTouch === 0 ? 100 : meltingTouch; // Prevent division by zero
      currentItem.finalWt = ((netWtValue * effectiveMeltingTouch) / 100).toFixed(3);
      
      newItems[index] = currentItem;
      return newItems;
    });
  };

  const calculateTotal = (field: keyof Pick<ReceiptItem, 'grossWt' | 'stoneWt' | 'netWt' | 'finalWt' | 'stoneAmt'>) => {
    const validItems = items.filter(item => {
      const val = item[field];
      // Ensure val is a string and represents a valid number before parsing
      return typeof val === 'string' && val.trim() !== '' && !isNaN(parseFloat(val));
    });
    return validItems.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
  };

  const handleEditReceipt = () => {
    // Save current state before entering edit mode
    setInitialState({date, metal, weight, weightUnit, items: JSON.parse(JSON.stringify(items))}); // Deep copy
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (initialState) { // If there was a state saved before editing
      setDate(initialState.date);
      setMetal(initialState.metal);
      setWeight(initialState.weight);
      setWeightUnit(initialState.weightUnit);
      setItems(JSON.parse(JSON.stringify(initialState.items))); // Deep copy
    } else {
        // If no initial state (e.g. direct load into edit of an existing receipt, though unlikely with current flow)
        // or if it was a new receipt and cancel is hit, re-fetch or reset
        if (existingReceiptId) fetchReceipt(); // Re-fetch original if it was an existing receipt
        else resetToNewReceiptState(); // Reset to blank if it was a new one
    }
    setIsEditMode(false); // Exit edit mode
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
    // Filter out items that are completely empty to avoid saving blank rows
    const validItems = items.filter(item =>
      item.itemName.trim() !== '' || item.tag.trim() !== '' || item.grossWt.trim() !== '' ||
      item.stoneWt.trim() !== '' || item.meltingTouch.trim() !== '' || item.stoneAmt.trim() !== ''
    );

    if (validItems.length === 0) {
      toast({variant: 'destructive', title: 'Validation Error', description: 'Please add at least one valid item with some details.'});
      return;
    }

    setIsSaving(true);
    let toastIdInstance: string | undefined;

    try {
      toastIdInstance = toast({
        title: existingReceiptId ? 'Updating Client Receipt...' : 'Creating Client Receipt...',
        description: 'Please wait. If this is slow, check Firestore indexes for ClientReceipts. See firestore.indexes.md.',
      }).id;

      const totalGrossWt = validItems.reduce((acc, item) => acc + (parseFloat(item.grossWt) || 0), 0);
      const totalStoneWt = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneWt) || 0), 0);
      const totalNetWt = validItems.reduce((acc, item) => acc + (parseFloat(item.netWt) || 0), 0);
      const totalFinalWt = validItems.reduce((acc, item) => acc + (parseFloat(item.finalWt) || 0), 0);
      const totalStoneAmt = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneAmt) || 0), 0);

      const receiptData: ClientReceiptData = {
        clientId: clientIdParam,
        clientName: clientNameParam, // Persist clientName at time of receipt creation
        shopName: clientShopName, // Persist shopName
        phoneNumber: clientPhoneNumber, // Persist phone
        metalType: metal,
        issueDate: date.toISOString(), // Store date as ISO string
        tableData: validItems.map(({sNo, ...item}) => ({ // Exclude sNo from persisted data
          itemName: item.itemName || '',
          tag: item.tag || '',
          grossWt: item.grossWt || '0',
          stoneWt: item.stoneWt || '0',
          netWt: item.netWt || '0.000', // This is already calculated and stored in item state
          meltingTouch: item.meltingTouch || '0',
          finalWt: item.finalWt || '0.000', // This is already calculated
          stoneAmt: item.stoneAmt || '0',
        })),
        totals: {
          grossWt: parseFloat(totalGrossWt.toFixed(3)),
          stoneWt: parseFloat(totalStoneWt.toFixed(3)),
          netWt: parseFloat(totalNetWt.toFixed(3)),
          finalWt: parseFloat(totalFinalWt.toFixed(3)),
          stoneAmt: parseFloat(totalStoneAmt.toFixed(2)),
        },
        // createdAt and updatedAt will be handled by serverTimestamp by Firestore
      };

      if (existingReceiptId) {
        await updateDoc(doc(db, 'ClientReceipts', existingReceiptId), {
          ...receiptData,
          updatedAt: serverTimestamp(), // Set/update updatedAt timestamp
        });
        toast.update(toastIdInstance, {title: 'Receipt Updated!', description: 'The client receipt has been saved successfully.'});
      } else {
        const newReceiptRef = await addDoc(collection(db, 'ClientReceipts'), {
          ...receiptData,
          createdAt: serverTimestamp(), // Set createdAt timestamp
          updatedAt: serverTimestamp(), // Set updatedAt timestamp
        });
        setExistingReceiptId(newReceiptRef.id); // Update state with new ID
        // Update URL to reflect new receipt ID without full page reload
        router.replace(`/receipt/details?clientId=${clientIdParam}&clientName=${encodeURIComponent(clientNameParam)}&receiptId=${newReceiptRef.id}`, { scroll: false });
        toast.update(toastIdInstance, {title: 'Receipt Created!', description: 'The client receipt has been saved successfully.'});
      }
      // Update initial state to reflect saved data, so "cancel" doesn't revert to pre-save
      const savedItemsForInitialState = validItems.map((it, idx) => ({
          ...it, sNo: idx + 1, // ensure sNo is present for UI
          netWt: it.netWt, finalWt: it.finalWt, // ensure calculated values are correct
      }));
      setInitialState({date, metal, weight, weightUnit, items: JSON.parse(JSON.stringify(savedItemsForInitialState))});
      setIsEditMode(false); // Exit edit mode after save
    } catch (error) {
      console.error('Error saving receipt:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      if (toastIdInstance) {
        toast.update(toastIdInstance, {variant: 'destructive', title: 'Error Saving Receipt', description: `Failed to save client receipt. ${errorMsg} Ensure Firestore indexes are correct. See firestore.indexes.md.`});
      } else {
        toast({variant: 'destructive', title: 'Error Saving Receipt', description: `Failed to save client receipt. ${errorMsg} Ensure Firestore indexes are correct. See firestore.indexes.md.`});
      }
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
      item.itemName.trim() !== '' || item.tag.trim() !== '' || item.grossWt.trim() !== '' ||
      item.stoneWt.trim() !== '' || item.meltingTouch.trim() !== '' || item.stoneAmt.trim() !== ''
    );

    if (validItems.length === 0) {
      toast({variant: 'destructive', title: 'Error', description: 'Cannot download an empty receipt. Please add items.'});
      return;
    }

    const doc = new jsPDF();
    // PDF Styling Constants
    const primaryColor = '#000000'; // Black for text
    const borderColor = '#B8860B'; // Dark Gold for border
    const headerColor = '#FFF8DC'; // Cornsilk (Light Yellow) for table headers
    const rowColor = '#FFFFFF'; // White for table rows
    const alternateRowColor = '#FAF0E6'; // Linen (Very Light Beige) for alternate rows
    const titleFontSize = 20;
    const textFontSize = 10;
    const tableHeaderFontSize = 9;
    const tableBodyFontSize = 8;
    const margin = 10; // Page margin
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight(); // For border drawing

    // --- Border ---
    doc.setDrawColor(borderColor); // Set border color
    doc.setLineWidth(0.5); // Set border width
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin); // Draw border rect

    // --- Title ---
    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    const title = 'Goldsmith Receipt';
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, margin + 10); // Centered title

    // --- Client and Receipt Info ---
    doc.setFontSize(textFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(primaryColor);
    let startY = margin + 25; // Initial Y position for text
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
    // Optional: Add overall weight if provided
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
      item.netWt ? parseFloat(item.netWt).toFixed(3) : '0.000', // Already toFixed(3) in state
      item.meltingTouch ? parseFloat(item.meltingTouch).toFixed(2) : '0.00',
      item.finalWt ? parseFloat(item.finalWt).toFixed(3) : '0.000', // Already toFixed(3) in state
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
      theme: 'grid', // Use 'grid' for better visual separation
      headStyles: {
        fillColor: headerColor,
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: tableHeaderFontSize,
        lineWidth: 0.1,
        lineColor: borderColor, // Use border color for table lines
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
      footStyles: { // Styles for the footer row
        fillColor: headerColor,
        textColor: primaryColor,
        fontStyle: 'bold',
        fontSize: tableHeaderFontSize,
        lineWidth: 0.1,
        lineColor: borderColor,
        halign: 'right' // Align footer text to right by default
      },
      tableLineColor: borderColor, // Main table border color
      tableLineWidth: 0.1,
      margin: {left: margin + 2, right: margin + 2}, // Slightly smaller margin for table
      didParseCell: (data) => { // Custom cell styling
        const numericColumns = [0, 3, 4, 5, 6, 7, 8]; // S.No also centered
        if (data.column.index === 0 && (data.section === 'body' || data.section === 'foot')) {
            data.cell.styles.halign = 'center';
        } else if ((data.section === 'body' || data.section === 'foot') && numericColumns.includes(data.column.index)) {
            data.cell.styles.halign = 'right'; // Right align numeric data
        }
         // Ensure 'Total' label in foot is right-aligned before numbers
        if (data.section === 'foot' && data.column.index === 1) { // 'Item Name' column index for 'Total' label
            data.cell.styles.halign = 'right';
        }
      },
      showFoot: 'lastPage', // Show footer on the last page if table spans multiple
      foot: [ // Define the footer row content
        [ // Array for the single footer row
          {content: '', styles: {halign: 'center'}}, // Empty for S.No.
          {content: 'Total', colSpan: 2, styles: {fontStyle: 'bold', halign: 'right'}}, // 'Total' label
          {content: totalGrossWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalStoneWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: totalNetWtPdf.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
          {content: '', styles: {halign: 'right'}}, // Empty for M/T
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
          <p>Loading receipt details... If slow, check Firestore indexes for 'ClientReceipts'. See firestore.indexes.md.</p>
        </div>
      </Layout>
    );
  }
  
  const mainCardClasses = "w-full mx-auto px-0 py-0"; // Max width for the main card, remove horizontal padding
  const contentPadding = "p-2 md:p-3"; // Reduced padding for content within card

  return (
    <Layout>
      <div className={`flex flex-col justify-start min-h-screen bg-secondary ${contentPadding}`}>
        <Card className={mainCardClasses}>
          <CardHeader className={`space-y-1 ${contentPadding} pb-2`}>
             <CardDescription>Ensure Firestore indexes are set up on `ClientReceipts` (e.g., on `createdAt`) for optimal performance. See firestore.indexes.md.</CardDescription>
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
                    {existingReceiptId && isEditMode && ( // Show cancel only if editing an existing receipt
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
                    <col style={{ width: '4%' }} />  {/* S.No. */}
                    <col style={{ width: 'auto' }} /> {/* Item Name - flexible width */}
                    <col style={{ width: '10%' }} /> {/* Tag */}
                    <col style={{ width: '12%' }} /> {/* Gross (wt) */}
                    <col style={{ width: '12%' }} /> {/* Stone (wt) */}
                    <col style={{ width: '10%' }} /> {/* Net (wt) - Readonly */}
                    <col style={{ width: '10%' }} /> {/* M/T (%) */}
                    <col style={{ width: '10%' }} /> {/* Final (wt) - Readonly */}
                    <col style={{ width: '12%' }} /> {/* Stone Amt */}
                    <col style={{ width: '7%' }} />  {/* Action */}
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
