'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle, Download, Trash2, Edit, Save, XCircle } from 'lucide-react'; // Added Edit, Save, XCircle
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase'; // Import Firestore instance

interface ReceiptItem {
  sNo?: number; // Optional, might be added dynamically
  itemName: string;
  tag: string; // Assuming tag is a string, adjust if numeric
  grossWt: string;
  stoneWt: string;
  netWt: string; // Calculated
  meltingTouch: string; // Renamed from 'melting' in user schema, keeping consistency with table
  finalWt: string; // Calculated
  stoneAmt: string;
}

// Firestore Document Structure for ClientReceipts (NEW)
interface ClientReceiptData {
  clientId: string;
  clientName: string; // Added for easier display in bill page
  shopName?: string; // Added for easier display in bill page
  phoneNumber?: string; // Added for easier display in bill page
  metalType: string;
  issueDate: string; // Store as ISO string
  tableData: Omit<ReceiptItem, 'sNo'>[]; // Store without UI sNo
  totals: {
    grossWt: number;
    stoneWt: number; // Added stoneWt total
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  createdAt?: any; // Firestore server timestamp placeholder
  updatedAt?: any; // Firestore server timestamp placeholder
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
  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);

  // Extract client details and potentially existing receipt ID
  const clientIdParam = searchParams.get('clientId');
  const clientNameParam = searchParams.get('clientName') || '[Client Name]';
  const receiptIdParam = searchParams.get('receiptId'); // For editing existing receipts

  // State for form fields
  const [date, setDate] = useState<Date | undefined>(undefined); // Default to undefined for new
  const [metal, setMetal] = useState('');
  const [weight, setWeight] = useState(''); // Overall weight - Not saved in current schema
  const [weightUnit, setWeightUnit] = useState(''); // Overall weight unit - Not saved in current schema
  const [items, setItems] = useState<ReceiptItem[]>([
    { itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' },
  ]);
  const [initialState, setInitialState] = useState<{ date?: Date, metal: string, weight: string, weightUnit: string, items: ReceiptItem[] } | null>(null); // For cancel edit

  // State for managing edit mode and loading
  const [isEditMode, setIsEditMode] = useState(!receiptIdParam); // Start in edit mode if creating new
  const [isLoading, setIsLoading] = useState(!!receiptIdParam); // Loading if editing
  const [isSaving, setIsSaving] = useState(false);
  const [existingReceiptId, setExistingReceiptId] = useState<string | null>(receiptIdParam);

  // --- Fetch Client Details (Optional but good for display) ---
  const [clientShopName, setClientShopName] = useState('');
  const [clientPhoneNumber, setClientPhoneNumber] = useState('');

  const fetchClientData = async () => {
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
        console.error("Error fetching client details:", error);
        // Non-critical error, proceed without shop/phone if fetch fails
      }
    }
  };

  const fetchReceipt = async () => {
    if (existingReceiptId && clientIdParam) {
      setIsLoading(true);
      try {
        const receiptRef = doc(db, 'ClientReceipts', existingReceiptId);
        const docSnap = await getDoc(receiptRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ClientReceiptData;
          const loadedDate = data.issueDate && isValid(parseISO(data.issueDate)) ? parseISO(data.issueDate) : undefined;
          const loadedMetal = data.metalType || '';
          // Note: weight and weightUnit are not in ClientReceiptData, load if they were previously saved (unlikely) or default
          const loadedWeight = ''; // Default to empty as not in schema
          const loadedWeightUnit = ''; // Default to empty as not in schema
          const loadedItems = data.tableData && data.tableData.length > 0
            ? data.tableData.map((item, index) => ({ ...item, sNo: index + 1 })) // Add back sNo for UI
            : [{ sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' }];

          setDate(loadedDate);
          setMetal(loadedMetal);
          setWeight(loadedWeight);
          setWeightUnit(loadedWeightUnit);
          setItems(loadedItems);
          // Store initial state for cancel
          setInitialState({ date: loadedDate, metal: loadedMetal, weight: loadedWeight, weightUnit: loadedWeightUnit, items: loadedItems });
          setIsEditMode(false); // Start in view mode when loading existing
        } else {
          toast({ variant: "destructive", title: "Not Found", description: "Receipt not found. Creating new." });
          setExistingReceiptId(null); // Treat as new
          resetToNewReceiptState();
          setIsEditMode(true);
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load receipt details." });
        setExistingReceiptId(null); // Treat as new on error
        resetToNewReceiptState();
        setIsEditMode(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Creating a new receipt
      resetToNewReceiptState();
      setIsEditMode(true);
      setIsLoading(false);
    }
  };

   // --- Fetch Client and Receipt Data ---
  useEffect(() => {
    fetchClientData();
    fetchReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingReceiptId, clientIdParam]); // Rerun if receiptId changes or client changes


  const resetToNewReceiptState = () => {
     setDate(new Date()); // Default date for new receipt
     setMetal('');
     setWeight('');
     setWeightUnit('');
     setItems([{ sNo: 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' }]);
     setInitialState(null); // No initial state for new receipt
  };

  const handleAddItem = () => {
    if (!isEditMode) return; // Only allow adding in edit mode
    setItems([
      ...items,
      { sNo: items.length + 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' },
    ]);
  };

   const handleRemoveItem = (indexToRemove: number) => {
    if (!isEditMode) return; // Only allow removal in edit mode
    if (items.length <= 1) {
        toast({ variant: "destructive", title: "Cannot Remove", description: "At least one item row is required." });
        return;
    }
    setItems(items.filter((_, index) => index !== indexToRemove));
  };


  const handleInputChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!isEditMode) return; // Only allow changes in edit mode

    const newItems = [...items];
    const currentItem = { ...newItems[index], [field]: value };

    // Ensure numeric fields are handled correctly
    const grossWt = parseFloat(currentItem.grossWt) || 0;
    const stoneWt = parseFloat(currentItem.stoneWt) || 0;
    const meltingTouch = parseFloat(currentItem.meltingTouch) || 0;

    // Recalculate Net Weight
    currentItem.netWt = (grossWt - stoneWt).toFixed(3);

    // Recalculate Final Weight
    const netWt = parseFloat(currentItem.netWt) || 0; // Use recalculated netWt
    // Use 100 for melting/touch calculation as it's a percentage
    currentItem.finalWt = ((netWt * meltingTouch) / 100).toFixed(3);


    newItems[index] = currentItem;
    setItems(newItems);
  };

  const calculateTotal = (field: keyof ReceiptItem) => {
     return items.reduce((acc, item) => {
       // Ensure the value is treated as a number, default to 0 if not parseable
       const value = parseFloat(item[field]) || 0;
       return acc + value;
     }, 0);
   };

  const handleEditReceipt = () => {
    if (initialState) {
        // Store current state before entering edit mode if not already stored
         setInitialState({ date, metal, weight, weightUnit, items });
    } else if (existingReceiptId) {
        // If editing an existing receipt but initialState is somehow null, store current view state
         setInitialState({ date, metal, weight, weightUnit, items });
    }
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
     if (initialState) {
       // Restore state from before editing started
       setDate(initialState.date);
       setMetal(initialState.metal);
       setWeight(initialState.weight);
       setWeightUnit(initialState.weightUnit);
       setItems(initialState.items);
     } else {
       // If no initial state (shouldn't happen when canceling an existing edit, but as fallback)
       // Refetch original data
        fetchReceipt();
     }
     setIsEditMode(false);
   };

   const handleSaveReceipt = async () => {
    if (!clientIdParam) {
      toast({ variant: 'destructive', title: 'Error', description: 'Client ID is missing.' });
      return;
    }
    if (!date) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an issue date.' });
      return;
    }
    if (!metal) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a metal type.' });
      return;
    }
     // Filter out completely empty rows before validation
     const validItems = items.filter(item =>
         item.itemName.trim() !== '' ||
         item.tag.trim() !== '' || // Assuming tag is relevant
         item.grossWt.trim() !== '' ||
         item.stoneWt.trim() !== '' ||
         item.meltingTouch.trim() !== '' ||
         item.stoneAmt.trim() !== ''
     );

    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please add at least one valid item to the receipt.' });
      return;
    }


    setIsSaving(true);

     // Calculate totals based on valid items
     const totalGrossWt = validItems.reduce((acc, item) => acc + (parseFloat(item.grossWt) || 0), 0);
     const totalStoneWt = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneWt) || 0), 0);
     const totalNetWt = validItems.reduce((acc, item) => acc + (parseFloat(item.netWt) || 0), 0);
     const totalFinalWt = validItems.reduce((acc, item) => acc + (parseFloat(item.finalWt) || 0), 0);
     const totalStoneAmt = validItems.reduce((acc, item) => acc + (parseFloat(item.stoneAmt) || 0), 0);


    // Create receipt object according to the new schema
    // Exclude sNo from tableData and overall weight/unit from the main object
    const receiptData: Omit<ClientReceiptData, 'createdAt' | 'updatedAt'> = {
      clientId: clientIdParam,
      clientName: clientNameParam, // Include name
      shopName: clientShopName, // Include shop name
      phoneNumber: clientPhoneNumber, // Include phone number
      metalType: metal,
      issueDate: date.toISOString(), // Store date as ISO string
      tableData: validItems.map(({ sNo, ...item }) => item), // Remove sNo before saving
      totals: {
        grossWt: parseFloat(totalGrossWt.toFixed(3)), // Ensure 3 decimal places for totals where appropriate
        stoneWt: parseFloat(totalStoneWt.toFixed(3)),
        netWt: parseFloat(totalNetWt.toFixed(3)),
        finalWt: parseFloat(totalFinalWt.toFixed(3)),
        stoneAmt: parseFloat(totalStoneAmt.toFixed(2)), // Assuming stoneAmt can have decimals
      },
    };

    try {
      if (existingReceiptId) {
        // Update existing receipt
        const receiptRef = doc(db, 'ClientReceipts', existingReceiptId);
        await updateDoc(receiptRef, {
          ...receiptData,
          updatedAt: serverTimestamp(), // Add/Update updatedAt timestamp
        });
        toast({ title: 'Receipt Updated!', description: 'The receipt has been updated successfully.' });
        // Update initial state to current saved state after successful update
        setInitialState({ date, metal, weight, weightUnit, items });
      } else {
        // Create new receipt
        const docRef = await addDoc(collection(db, 'ClientReceipts'), {
          ...receiptData,
          createdAt: serverTimestamp(), // Add createdAt timestamp
          updatedAt: serverTimestamp(),
        });
         setExistingReceiptId(docRef.id); // Store the new ID
         // Update URL without navigation to include the new receiptId
         router.replace(`/receipt/details?clientId=${clientIdParam}&clientName=${encodeURIComponent(clientNameParam)}&receiptId=${docRef.id}`, undefined);
         toast({ title: 'Receipt Created!', description: 'The receipt has been saved successfully.' });
         // Set initial state after successful creation
         setInitialState({ date, metal, weight, weightUnit, items });
      }
      setIsEditMode(false); // Exit edit mode after save/update
       // Optionally redirect to the bill page after saving
       // router.push('/bill');
    } catch (error) {
      console.error("Error saving receipt:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save receipt.' });
    } finally {
      setIsSaving(false);
    }
  };


  const downloadReceipt = () => {
     if (!date) {
        toast({ variant: "destructive", title: "Error", description: "Cannot download receipt without a date." });
        return;
    }
    if (items.length === 0 || items.every(item => !item.itemName && !item.grossWt)) {
        toast({ variant: "destructive", title: "Error", description: "Cannot download an empty receipt." });
        return;
    }

    const doc = new jsPDF();

    // --- Styling ---
    const primaryColor = '#000000'; // Black for text
    const backgroundColor = '#FFFFFF'; // White background
    const borderColor = '#D4AF37'; // Gold-like border color (adjust as needed) gold: #FFD700, dark gold: #B8860B
    const headerColor = '#F5F5F5'; // Light grey for header background
    const titleFontSize = 20;
    const headingFontSize = 14;
    const textFontSize = 10;
    const tableHeaderFontSize = 10;
    const tableBodyFontSize = 9;
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Border ---
    doc.setDrawColor(borderColor);
    doc.setLineWidth(1);
    doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

    // --- Background ---
    // Removing fill to keep it white
    // doc.setFillColor(backgroundColor);
    // doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 'F');

    // --- Title ---
    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor); // Keep title black
    const title = 'Goldsmith Receipt';
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2; // Center align
    doc.text(title, titleX, margin + 10);

    // --- Client Details ---
    doc.setFontSize(textFontSize);
    doc.setFont('helvetica', 'normal'); // Regular font for details
    doc.setTextColor(primaryColor);
    let startY = margin + 25;
    doc.text(`Name: ${clientNameParam}`, margin + 5, startY);
    startY += 6;
    doc.text(`Date: ${format(date, 'PPP')}`, margin + 5, startY);
    startY += 6;
    doc.text(`Metals: ${metal || 'N/A'}`, margin + 5, startY);
    startY += 6;
    // Weight and Unit are not part of the saved schema, only show if entered in UI (optional)
    if (weight && weightUnit) {
        doc.text(`Weight: ${weight} ${weightUnit}`, margin + 5, startY);
        startY += 6;
    }


    // --- Table ---
    const tableColumn = ['Item Name', 'Tag', 'Gross (wt)', 'Stone (wt)', 'Net (wt)', 'Melting/Touch', 'Final (wt)', 'Stone Amt'];
    const tableRows = items.map((item) => [
      item.itemName || '',
      item.tag || '',
      item.grossWt ? parseFloat(item.grossWt).toFixed(3) : '', // Keep empty if 0 or NaN
      item.stoneWt ? parseFloat(item.stoneWt).toFixed(3) : '',
      item.netWt ? parseFloat(item.netWt).toFixed(3) : '',
      item.meltingTouch ? parseFloat(item.meltingTouch).toFixed(2) : '', // Assuming 2 decimals for melting
      item.finalWt ? parseFloat(item.finalWt).toFixed(3) : '',
      item.stoneAmt ? parseFloat(item.stoneAmt).toFixed(2) : '', // Assuming 2 decimals for amount
    ]);

     // Calculate totals again for the PDF
     const totalGrossWt = calculateTotal('grossWt');
     const totalStoneWt = calculateTotal('stoneWt');
     const totalNetWt = calculateTotal('netWt');
     const totalFinalWt = calculateTotal('finalWt');
     const totalStoneAmt = calculateTotal('stoneAmt');


    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 5, // Add some space before the table
        theme: 'grid', // Use grid theme for clear borders
        headStyles: {
            fillColor: headerColor, // Light grey header remains
            textColor: primaryColor, // Black header text
            fontStyle: 'bold',
            fontSize: tableHeaderFontSize,
            lineWidth: 0.1,
            lineColor: [180, 180, 180], // Grey lines
            halign: 'center' // Center align header text
        },
        bodyStyles: {
            textColor: primaryColor, // Black body text
            fontSize: tableBodyFontSize,
            lineWidth: 0.1,
            lineColor: [180, 180, 180],
            cellPadding: 1.5, // Adjust cell padding
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248], // Very light grey for alternate rows
        },
        footStyles: { // Style the total row
            fillColor: headerColor, // Match header background
            textColor: primaryColor, // Black total text
            fontStyle: 'bold',
            fontSize: tableHeaderFontSize,
            lineWidth: 0.1,
            lineColor: [180, 180, 180],
            halign: 'right' // Right align totals by default (can be overridden per cell)
        },
        tableLineColor: [150, 150, 150],
        tableLineWidth: 0.1,
        margin: { left: margin + 5, right: margin + 5 }, // Adjust table margins
         didParseCell: function (data) {
             // Right align numeric columns in the body
             const numericColumns = [2, 3, 4, 5, 6, 7]; // Indices of numeric columns (0-based)
             if (data.section === 'body' && numericColumns.includes(data.column.index)) {
                 data.cell.styles.halign = 'right';
             }
             // Ensure "Total" label in the footer aligns right if not already specified
             if (data.section === 'foot' && data.column.index === 0) {
                  if (typeof data.cell.content === 'string' && data.cell.content === 'Total') {
                     data.cell.styles.halign = 'right';
                  }
             }
             // Right align numeric totals in the footer
              if (data.section === 'foot' && numericColumns.includes(data.column.index)) {
                 data.cell.styles.halign = 'right';
             }
         },
          // Add the total row as the foot
         showFoot: 'lastPage', // Show footer only on the last page if table spans multiple pages
         foot: [ // Define the content for the footer row
              [
                  { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }, // Span 'Total' across first 2 columns
                  //'', // Skip Tag column in footer - handled by colSpan
                  { content: totalGrossWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  { content: totalStoneWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  { content: totalNetWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  '', // Skip Melting/Touch column
                  { content: totalFinalWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  { content: totalStoneAmt.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }, // Assuming 2 decimals for amount total
              ]
          ],
    });

    doc.save(`receipt_${clientNameParam.replace(/\s+/g, '_')}_${format(date, 'yyyyMMdd')}.pdf`);
    toast({ title: 'Success', description: 'Receipt downloaded.' });
  };

  const isNewReceipt = !existingReceiptId; // Determine if it's a new receipt based on state


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
      <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
        <Card className="w-full max-w-5xl"> {/* Increased max-width */}
          <CardHeader className="space-y-1">
             <div className="flex justify-between items-center">
                 <div>
                    <CardTitle className="text-2xl">Client Receipt</CardTitle>
                     <CardDescription>
                       Client: {clientNameParam} {existingReceiptId ? `(ID: ${existingReceiptId})` : '(New Receipt)'}
                     </CardDescription>
                 </div>
                 {/* Action Buttons based on mode */}
                 <div className="flex justify-end gap-3">
                    {!isEditMode && existingReceiptId ? ( // View mode for existing receipt
                        <>
                            <Button onClick={handleEditReceipt} variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" /> Edit Receipt
                            </Button>
                            <Button onClick={downloadReceipt} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" /> Download Receipt
                            </Button>
                        </>
                    ) : isEditMode && existingReceiptId ? ( // Edit mode for existing receipt
                         <>
                             <Button onClick={handleSaveReceipt} disabled={isSaving} size="sm">
                                <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                             </Button>
                             <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving} size="sm">
                                 <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                             </Button>
                         </>
                    ) : ( // New receipt mode (always edit mode)
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
          <CardContent className="grid gap-6"> {/* Increased gap */}
            {/* Top Section: Date, Metal, Weight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full md:w-[240px] justify-start text-left font-normal', // Adjusted width
                      !date && 'text-muted-foreground'
                    )}
                    disabled={!isEditMode} // Disable in view mode
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick Issue Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={!isEditMode} // Disable in view mode
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select onValueChange={setMetal} value={metal} disabled={!isEditMode}> {/* Disable in view mode */}
                <SelectTrigger className="w-full md:w-[200px]"> {/* Adjusted width */}
                  <SelectValue placeholder="Select Metal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                  {/* Add other metal types as needed */}
                </SelectContent>
              </Select>

               {/* Weight and Unit - Enable/disable based on edit mode */}
              <div className="flex items-center space-x-2">
                 <Input
                   type="number"
                   placeholder="Overall Weight (Optional)"
                   value={weight}
                   onChange={(e) => setWeight(e.target.value)}
                   disabled={!isEditMode} // Disable in view mode
                   className="flex-1"
                   step="0.001"
                 />
                 <Select onValueChange={setWeightUnit} value={weightUnit} disabled={!isEditMode}> {/* Disable in view mode */}
                     <SelectTrigger className="w-[100px]">
                     <SelectValue placeholder="Unit" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="mg">mg</SelectItem>
                     <SelectItem value="g">g</SelectItem>
                     <SelectItem value="kg">kg</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
            </div>

             {/* Separator */}
            <hr className="border-border my-2" />


            {/* Dynamic Table */}
            <div className="overflow-x-auto">
              <h3 className="text-lg font-medium mb-2">Receipt Items</h3>
              <table className="min-w-full border border-collapse border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 border text-left text-sm">S.No</th>
                    <th className="p-2 border text-left text-sm">Item Name</th>
                    <th className="p-2 border text-left text-sm">Tag</th>
                    <th className="p-2 border text-right text-sm">Gross (wt)</th>
                    <th className="p-2 border text-right text-sm">Stone (wt)</th>
                    <th className="p-2 border text-right text-sm">Net (wt)</th>
                    <th className="p-2 border text-right text-sm">Melting/Touch (%)</th>
                    <th className="p-2 border text-right text-sm">Final (wt)</th>
                    <th className="p-2 border text-right text-sm">Stone Amt</th>
                     {isEditMode && <th className="p-2 border text-center text-sm">Action</th>} {/* Show Action header only in edit mode */}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-1 border align-middle text-center">{index + 1}</td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleInputChange(index, 'itemName', e.target.value)}
                          disabled={!isEditMode} // Disable in view mode
                          className="text-sm h-8"
                          placeholder='Item name'
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="text" // Assuming tag can be alphanumeric
                          value={item.tag}
                          onChange={(e) => handleInputChange(index, 'tag', e.target.value)}
                          disabled={!isEditMode} // Disable in view mode
                           className="text-sm h-8"
                           placeholder='Tag'
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.grossWt}
                          onChange={(e) => handleInputChange(index, 'grossWt', e.target.value)}
                          disabled={!isEditMode} // Disable in view mode
                          className="text-sm h-8 text-right"
                          step="0.001"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.stoneWt}
                          onChange={(e) => handleInputChange(index, 'stoneWt', e.target.value)}
                          disabled={!isEditMode} // Disable in view mode
                          className="text-sm h-8 text-right"
                          step="0.001"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="p-1 border text-right align-middle text-sm">
                           {/* Display calculated Net Wt */}
                           {(parseFloat(item.grossWt || '0') - parseFloat(item.stoneWt || '0')).toFixed(3)}
                      </td>
                       <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.meltingTouch}
                          onChange={(e) => handleInputChange(index, 'meltingTouch', e.target.value)}
                          disabled={!isEditMode} // Disable in view mode
                          className="text-sm h-8 text-right"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-1 border text-right align-middle text-sm">
                           {/* Display calculated Final Wt */}
                          {(( (parseFloat(item.grossWt || '0') - parseFloat(item.stoneWt || '0')) * parseFloat(item.meltingTouch || '0')) / 100).toFixed(3)}
                       </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.stoneAmt}
                          onChange={(e) => handleInputChange(index, 'stoneAmt', e.target.value)}
                          disabled={!isEditMode} // Disable in view mode
                          className="text-sm h-8 text-right"
                          step="0.01" // Assuming amount can have cents
                          placeholder="0.00"
                        />
                      </td>
                      {isEditMode && ( // Show remove button only in edit mode
                          <td className="p-1 border text-center align-middle">
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(index)}
                                  disabled={items.length <= 1} // Disable if only one item
                                  className="text-destructive hover:text-destructive/80 h-8 w-8" // Smaller icon button
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </td>
                      )}
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-muted font-semibold">
                    <td className="p-2 border text-sm" colSpan={3}>Total</td>
                    {/* <td className="p-2 border"></td> */}
                    {/* <td className="p-2 border"></td> */}
                    <td className="p-2 border text-right text-sm">{calculateTotal('grossWt').toFixed(3)}</td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('stoneWt').toFixed(3)}</td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('netWt').toFixed(3)}</td>
                    <td className="p-2 border"></td> {/* Melting/Touch doesn't usually have a total */}
                    <td className="p-2 border text-right text-sm">{calculateTotal('finalWt').toFixed(3)}</td>
                    <td className="p-2 border text-right text-sm">{calculateTotal('stoneAmt').toFixed(2)}</td> {/* Assuming 2 decimals for amount */}
                    {isEditMode && <td className="p-2 border"></td>} {/* Empty cell for action column total */}
                  </tr>
                </tbody>
              </table>
               {isEditMode && ( // Only show Add Item button in edit mode
                <Button onClick={handleAddItem} variant="outline" size="sm" className="mt-3">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item Row
                </Button>
              )}
            </div>

            {/* Action Buttons moved to CardHeader */}

          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
