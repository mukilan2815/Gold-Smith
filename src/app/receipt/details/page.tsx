'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle, Download } from 'lucide-react';
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
  tableData: ReceiptItem[];
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
  const [date, setDate] = useState<Date | undefined>(new Date()); // Default to today
  const [metal, setMetal] = useState('');
  const [weight, setWeight] = useState(''); // Note: 'weight' isn't in the new schema, keeping for now if needed elsewhere, but won't be saved to ClientReceipts
  const [weightUnit, setWeightUnit] = useState(''); // Note: 'weightUnit' isn't in the new schema
  const [items, setItems] = useState<ReceiptItem[]>([
    { itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' },
  ]);

  // State for managing edit mode and loading
  const [isEditMode, setIsEditMode] = useState(!receiptIdParam); // Start in edit mode if creating new
  const [isLoading, setIsLoading] = useState(!!receiptIdParam); // Loading if editing
  const [isSaving, setIsSaving] = useState(false);
  const [existingReceiptId, setExistingReceiptId] = useState<string | null>(receiptIdParam);

   // --- Fetch Client Details (Optional but good for display) ---
   const [clientShopName, setClientShopName] = useState('');
   const [clientPhoneNumber, setClientPhoneNumber] = useState('');

   useEffect(() => {
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
     fetchClientData();
   }, [clientIdParam]);


  // --- Fetch Existing Receipt Data ---
  useEffect(() => {
    const fetchReceipt = async () => {
      if (existingReceiptId && clientIdParam) {
        setIsLoading(true);
        try {
          const receiptRef = doc(db, 'ClientReceipts', existingReceiptId);
          const docSnap = await getDoc(receiptRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as ClientReceiptData;
            setDate(data.issueDate && isValid(parseISO(data.issueDate)) ? parseISO(data.issueDate) : new Date());
            setMetal(data.metalType || '');
            // Weight and Unit are not in the new schema, set them if needed for display?
            // setWeight(data.weight || '');
            // setWeightUnit(data.weightUnit || '');
            setItems(data.tableData && data.tableData.length > 0 ? data.tableData : [{ itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' }]);
            setIsEditMode(false); // Start in view mode when loading existing
          } else {
            toast({ variant: "destructive", title: "Not Found", description: "Receipt not found. Creating new." });
            setExistingReceiptId(null); // Treat as new
            setIsEditMode(true);
          }
        } catch (error) {
          console.error("Error fetching receipt:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load receipt details." });
          setExistingReceiptId(null); // Treat as new on error
          setIsEditMode(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Creating a new receipt
        setIsEditMode(true);
        setIsLoading(false);
         setItems([{ itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' }]); // Ensure clean slate
         setDate(new Date()); // Default date for new receipt
         setMetal('');
         setWeight('');
         setWeightUnit('');
      }
    };

    fetchReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingReceiptId, clientIdParam]); // Rerun if receiptId changes

  const handleAddItem = () => {
    setItems([
      ...items,
      { sNo: items.length + 1, itemName: '', tag: '', grossWt: '', stoneWt: '', netWt: '', meltingTouch: '', finalWt: '', stoneAmt: '' },
    ]);
  };

  const handleInputChange = (index: number, field: keyof ReceiptItem, value: any) => {
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
    if (meltingTouch !== 0) {
        currentItem.finalWt = ((netWt * meltingTouch) / 100).toFixed(3);
    } else {
        currentItem.finalWt = '0.000'; // Avoid division by zero
    }

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
    setIsEditMode(true);
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
    const receiptData: ClientReceiptData = {
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
        stoneAmt: parseFloat(totalStoneAmt.toFixed(3)), // Assuming stoneAmt can have decimals
      },
      // createdAt will be added on creation, updatedAt on update
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
      } else {
        // Create new receipt
        const docRef = await addDoc(collection(db, 'ClientReceipts'), {
          ...receiptData,
          createdAt: serverTimestamp(), // Add createdAt timestamp
          updatedAt: serverTimestamp(),
        });
         setExistingReceiptId(docRef.id); // Store the new ID if needed for subsequent edits in the same session
         // Update URL without navigation to include the new receiptId
         router.replace(`/receipt/details?clientId=${clientIdParam}&clientName=${encodeURIComponent(clientNameParam)}&receiptId=${docRef.id}`, undefined);
        toast({ title: 'Receipt Created!', description: 'The receipt has been saved successfully.' });
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
    const doc = new jsPDF();

    // --- Styling ---
    const primaryColor = '#000000'; // Black for text
    const backgroundColor = '#FFFFFF'; // White background
    const borderColor = '#D4AF37'; // Gold-like border color
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
    doc.setFillColor(backgroundColor);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 'F');

    // --- Title ---
    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    const title = 'Goldsmith Receipt';
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, margin + 10);

    // --- Client Details ---
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
    // Weight and Unit are not part of the new schema, adjust if needed
    // doc.text(`Weight: ${weight ? `${weight} ${weightUnit}` : 'N/A'}`, margin + 5, startY);
    // startY += 6;

    // --- Table ---
    const tableColumn = ['Item Name', 'Tag', 'Gross (wt)', 'Stone (wt)', 'Net (wt)', 'Melting/Touch', 'Final (wt)', 'Stone Amt'];
    const tableRows = items.map((item) => [
      item.itemName || '',
      item.tag || '',
      item.grossWt ? parseFloat(item.grossWt).toFixed(3) : '0.000',
      item.stoneWt ? parseFloat(item.stoneWt).toFixed(3) : '0.000',
      item.netWt ? parseFloat(item.netWt).toFixed(3) : '0.000',
      item.meltingTouch ? parseFloat(item.meltingTouch).toFixed(2) : '0.00', // Assuming 2 decimals for melting
      item.finalWt ? parseFloat(item.finalWt).toFixed(3) : '0.000',
      item.stoneAmt ? parseFloat(item.stoneAmt).toFixed(2) : '0.00', // Assuming 2 decimals for amount
    ]);

     // Calculate totals again for the PDF
     const totalGrossWt = calculateTotal('grossWt');
     const totalStoneWt = calculateTotal('stoneWt');
     const totalNetWt = calculateTotal('netWt');
     const totalFinalWt = calculateTotal('finalWt');
     const totalStoneAmt = calculateTotal('stoneAmt');

    // Add total row to PDF data
    tableRows.push([
        { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, // Align 'Total' label right
        '', // Empty cell for Tag total
        { content: totalGrossWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: totalStoneWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: totalNetWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
        '', // Empty cell for Melting/Touch total
        { content: totalFinalWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: totalStoneAmt.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }, // Assuming 2 decimals for amount total
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 5, // Add some space before the table
        theme: 'grid', // Use grid theme for clear borders
        headStyles: {
            fillColor: headerColor, // Light grey header
            textColor: primaryColor,
            fontStyle: 'bold',
            fontSize: tableHeaderFontSize,
            lineWidth: 0.1,
            lineColor: [180, 180, 180], // Grey lines
            halign: 'center' // Center align header text
        },
        bodyStyles: {
            textColor: primaryColor,
            fontSize: tableBodyFontSize,
            lineWidth: 0.1,
            lineColor: [180, 180, 180],
            cellPadding: 1.5, // Adjust cell padding
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248], // Very light grey for alternate rows
        },
        footStyles: { // Style the total row
            fillColor: headerColor,
            textColor: primaryColor,
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
         foot: [ // Define the content for the footer row (matches the structure of the last row pushed to body)
              [
                  { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }, // Span 'Total' across first 2 columns
                  //'', // Skip Tag column in footer
                  { content: totalGrossWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  { content: totalStoneWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  { content: totalNetWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  '', // Skip Melting/Touch column
                  { content: totalFinalWt.toFixed(3), styles: { fontStyle: 'bold', halign: 'right' } },
                  { content: totalStoneAmt.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
              ]
          ],
    });

    doc.save(`receipt_${clientNameParam.replace(/\s+/g, '_')}_${format(date, 'yyyyMMdd')}.pdf`);
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
            <CardTitle className="text-2xl">Client Receipt</CardTitle>
             <CardDescription>
               Client: {clientNameParam} {existingReceiptId ? `(ID: ${existingReceiptId})` : '(New Receipt)'}
             </CardDescription>
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
                    disabled={!isEditMode}
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
                    disabled={!isEditMode}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select onValueChange={setMetal} value={metal} disabled={!isEditMode}>
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

               {/* Weight and Unit - Kept for display continuity, but not saved */}
              <div className="flex items-center space-x-2">
                 <Input
                   type="number"
                   placeholder="Overall Weight (Optional)"
                   value={weight}
                   onChange={(e) => setWeight(e.target.value)}
                   disabled // Always disabled as it's not part of the schema
                   className="flex-1"
                 />
                 <Select onValueChange={setWeightUnit} value={weightUnit} disabled>
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
                          disabled={!isEditMode}
                          className="text-sm h-8"
                          placeholder='Item name'
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="text" // Assuming tag can be alphanumeric
                          value={item.tag}
                          onChange={(e) => handleInputChange(index, 'tag', e.target.value)}
                          disabled={!isEditMode}
                           className="text-sm h-8"
                           placeholder='Tag'
                        />
                      </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.grossWt}
                          onChange={(e) => handleInputChange(index, 'grossWt', e.target.value)}
                          disabled={!isEditMode}
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
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right"
                          step="0.001"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="p-1 border text-right align-middle text-sm">
                           {/* Display calculated Net Wt */}
                           {item.netWt}
                      </td>
                       <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.meltingTouch}
                          onChange={(e) => handleInputChange(index, 'meltingTouch', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-1 border text-right align-middle text-sm">
                           {/* Display calculated Final Wt */}
                          {item.finalWt}
                       </td>
                      <td className="p-1 border align-middle">
                        <Input
                          type="number"
                          value={item.stoneAmt}
                          onChange={(e) => handleInputChange(index, 'stoneAmt', e.target.value)}
                          disabled={!isEditMode}
                          className="text-sm h-8 text-right"
                          step="0.01" // Assuming amount can have cents
                          placeholder="0.00"
                        />
                      </td>
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
                  </tr>
                </tbody>
              </table>
               {isEditMode && ( // Only show Add Item button in edit mode
                <Button onClick={handleAddItem} variant="outline" size="sm" className="mt-3">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item Row
                </Button>
              )}
            </div>


            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
                {!isEditMode ? (
                    <>
                        <Button onClick={handleEditReceipt} disabled={isSaving}>Edit Receipt</Button>
                        <Button onClick={downloadReceipt} variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Download Receipt
                        </Button>
                    </>
                ) : (
                     <Button onClick={handleSaveReceipt} disabled={isSaving}>
                       {isSaving ? 'Saving...' : (existingReceiptId ? 'Save Changes' : 'Create Receipt')}
                     </Button>
                )}
                {isEditMode && existingReceiptId && ( // Show Cancel button only when editing an existing receipt
                    <Button variant="outline" onClick={() => {
                         setIsEditMode(false);
                         // Optionally refetch data to discard changes or rely on useEffect rerun
                         fetchReceipt(); // Refetch to reset form
                    }} disabled={isSaving}>
                        Cancel Edit
                    </Button>
                )}
                <Button variant="secondary" onClick={() => router.back()} disabled={isSaving}>
                    Back
                </Button>
            </div>

            {/* Summary Section (Removed - Download serves this purpose) */}
             {/*
             <div ref={summaryRef} className="mt-6 p-4 border rounded-md bg-card">
                 <h3 className="text-xl font-semibold mb-3">Summary Preview</h3>
                 <p><strong>Name:</strong> {clientNameParam}</p>
                 <p><strong>Date:</strong> {date ? format(date, 'PPP') : 'N/A'}</p>
                 <p><strong>Metals:</strong> {metal || 'N/A'}</p>
                 <div className="overflow-x-auto mt-3">
                     <table className="min-w-full border border-collapse border-border text-sm">
                         <thead className="bg-muted">
                         <tr>
                             <th className="p-2 border">Item Name</th>
                             <th className="p-2 border text-right">Gross (wt)</th>
                             <th className="p-2 border text-right">Stone (wt)</th>
                             <th className="p-2 border text-right">Net (wt)</th>
                             <th className="p-2 border text-right">Final (wt)</th>
                             <th className="p-2 border text-right">Stone Amt</th>
                         </tr>
                         </thead>
                         <tbody>
                         {items.filter(item => item.itemName || item.grossWt).map((item, index) => ( // Filter items for summary preview
                             <tr key={`summary-${index}`}>
                             <td className="p-2 border">{item.itemName}</td>
                             <td className="p-2 border text-right">{parseFloat(item.grossWt || '0').toFixed(3)}</td>
                             <td className="p-2 border text-right">{parseFloat(item.stoneWt || '0').toFixed(3)}</td>
                             <td className="p-2 border text-right">{item.netWt}</td>
                             <td className="p-2 border text-right">{item.finalWt}</td>
                             <td className="p-2 border text-right">{parseFloat(item.stoneAmt || '0').toFixed(2)}</td>
                             </tr>
                         ))}
                         <tr className="font-semibold bg-muted">
                             <td className="p-2 border">Total</td>
                             <td className="p-2 border text-right">{calculateTotal('grossWt').toFixed(3)}</td>
                             <td className="p-2 border text-right">{calculateTotal('stoneWt').toFixed(3)}</td>
                             <td className="p-2 border text-right">{calculateTotal('netWt').toFixed(3)}</td>
                             <td className="p-2 border text-right">{calculateTotal('finalWt').toFixed(3)}</td>
                             <td className="p-2 border text-right">{calculateTotal('stoneAmt').toFixed(2)}</td>
                         </tr>
                         </tbody>
                     </table>
                 </div>
             </div>
            */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Helper function to fetch receipt data (needed for cancel edit)
async function fetchReceipt() {
    const searchParams = useSearchParams();
    const receiptId = searchParams.get('receiptId');
    const clientId = searchParams.get('clientId');
    const { toast } = useToast(); // Assuming useToast is accessible here or passed down

    if (receiptId && clientId) {
        // Simulate fetching logic inside the component's useEffect
        // This is a placeholder - the actual fetch logic is within the main component's useEffect
        console.log("Refetching receipt data for ID:", receiptId);
        // In a real scenario, you'd call the actual fetch function here
        // and update the state using the setters passed down or context.
        // Example:
        // const data = await getReceiptDataFromFirestore(receiptId);
        // if (data) {
        //     setDate(data.issueDate ? parseISO(data.issueDate) : new Date());
        //     setMetal(data.metalType || '');
        //     setItems(data.tableData || []);
        // } else {
        //    toast({ variant: "destructive", title: "Error", description: "Could not refetch receipt." });
        // }
    }
}
