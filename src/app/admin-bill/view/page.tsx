'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState, useRef } from 'react'; // Added useRef
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore'; // Import Timestamp, DocumentData
import { format, isValid, parseISO } from 'date-fns'; // Import isValid, parseISO
import jsPDF from 'jspdf'; // Import jsPDF
import autoTable from 'jspdf-autotable'; // Import jspdf-autotable

import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react'; // Added Download icon
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// --- Interfaces matching the NEW Firestore structure ---
interface GivenItem {
  // id is not stored, only needed for UI in details page
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number; // Stored as calculated number
}

interface ReceivedItem {
  // id is not stored
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string; // Changed from makingCharge
  subTotal: number; // Stored as calculated number
  total: number; // Stored as calculated number
}

interface GivenData {
    date: string | null; // ISO String or null
    items: GivenItem[];
    totalPureWeight: number;
    total: number;
}

interface ReceivedData {
    date: string | null; // ISO String or null
    items: ReceivedItem[];
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
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

// Helper functions (adjust if needed, but calculations are stored now)
const getDisplayValue = (value: string | number | undefined | null, decimals = 3): string => {
    if (value === undefined || value === null) return '0.' + '0'.repeat(decimals);
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (isNaN(num) ? 0 : num).toFixed(decimals);
}

// --- Component ---
export default function AdminBillViewPage() {
  return (
    <Layout>
      <AdminBillViewContent />
    </Layout>
  );
}

function AdminBillViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const receiptId = searchParams.get('receiptId');

  const [receiptData, setReceiptData] = useState<AdminReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  // State for manual calculation (now "Total" section)
  const [givenTotalInput, setGivenTotalInput] = useState(''); // Renamed for clarity
  const [receivedTotalInput, setReceivedTotalInput] = useState(''); // Renamed for clarity
  const [operation, setOperation] = useState<'add' | 'subtract'>('subtract'); // Renamed for clarity


  // --- Fetch Receipt Data ---
  useEffect(() => {
    const fetchReceipt = async () => {
      if (!receiptId) {
        toast({ variant: "destructive", title: "Error", description: "Receipt ID is missing." });
        setLoading(false);
        router.push('/admin-bill');
        return;
      }
      setLoading(true);
      try {
        const receiptRef = doc(db, 'AdminReceipts', receiptId);
        const docSnap = await getDoc(receiptRef);

        if (docSnap.exists()) {
           // Cast directly to the new interface
           const data = docSnap.data() as AdminReceiptData;
            // Validate or provide defaults if necessary, though structure should be more consistent now
           setReceiptData({
             ...data,
             // Ensure timestamps are Timestamps, handle potential Firestore data inconsistencies
             createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
             updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now(),
           });
           // Optionally pre-fill total inputs from receipt data if needed
           setGivenTotalInput(data.given?.total?.toFixed(3) ?? '');
           setReceivedTotalInput(data.received?.total?.toFixed(3) ?? '');
        } else {
          toast({ variant: "destructive", title: "Not Found", description: "Receipt not found." });
          router.push('/admin-bill');
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load receipt details." });
         router.push('/admin-bill');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId, toast, router]);

  // Totals are now directly available in receiptData.given and receiptData.received
  const givenTotals = receiptData?.given;
  const receivedTotals = receiptData?.received;


   // --- Total Calculation ---
   const calculateResult = () => { // Renamed for clarity
     const given = parseFloat(givenTotalInput) || 0;
     const received = parseFloat(receivedTotalInput) || 0;
     let result = 0;
     if (operation === 'add') {
       result = given + received;
     } else { // Subtract
       result = given - received;
     }
     return result.toFixed(3);
   };


   // --- Download Receipt ---
    const downloadReceipt = () => {
        if (!receiptData) {
            toast({ variant: "destructive", title: "Error", description: "Cannot download receipt, data not loaded." });
            return;
        }
        const hasGiven = receiptData.given && receiptData.given.items.length > 0;
        const hasReceived = receiptData.received && receiptData.received.items.length > 0;
        const givenDate = receiptData.given?.date ? parseISO(receiptData.given.date) : null;
        const receivedDate = receiptData.received?.date ? parseISO(receiptData.received.date) : null;

        if (!hasGiven && !hasReceived) {
             toast({ variant: "destructive", title: "Error", description: "Cannot download an empty receipt." });
             return;
        }

        const doc = new jsPDF();

        // --- Styling ---
        const primaryColor = '#000000'; // Black for text
        const borderColor = '#B8860B'; // Dark Gold
        const headerColor = '#FFF8DC'; // Cornsilk (Light Yellow)
        const rowColor = '#FFFFFF'; // White
        const alternateRowColor = '#FAF0E6'; // Linen (Very Light Beige)
        const titleFontSize = 18;
        const textFontSize = 10;
        const companyFontSize = 13; // Adjusted company name font size
        const tableHeaderFontSize = 9;
        const tableBodyFontSize = 8;
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let startY = margin + 20;

        // --- Border ---
        doc.setDrawColor(borderColor);
        doc.setLineWidth(0.5);
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

        // --- Title ---
        doc.setFontSize(titleFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        const title = 'Admin Receipt';
        const titleWidth = doc.getTextWidth(title);
        doc.text(title, (pageWidth - titleWidth) / 2, startY);
        startY += 10;

        // --- Client Details ---
        doc.setFontSize(textFontSize);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(primaryColor);
        doc.text(`Client Name: ${receiptData.clientName || 'N/A'}`, margin + 5, startY);
        startY += 6;

        // --- Given Section ---
        if (hasGiven && receiptData.given) {
            const formattedGivenDate = givenDate && isValid(givenDate) ? format(givenDate, 'PPP') : 'N/A';
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Given Details (Date: ${formattedGivenDate})`, margin + 5, startY);
            startY += 8;

            const givenTableColumns = ['S.No', 'Product Name', 'Pure Weight', 'Pure %', 'Melting', 'Total'];
            const givenTableRows = receiptData.given.items.map((item, index) => [
                index + 1,
                item.productName || '',
                getDisplayValue(item.pureWeight, 3),
                getDisplayValue(item.purePercent, 2),
                getDisplayValue(item.melting, 2),
                getDisplayValue(item.total, 3)
            ]);
            const givenTotalRow = [
                { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
                { content: getDisplayValue(receiptData.given.totalPureWeight, 3), styles: { fontStyle: 'bold', halign: 'right' } },
                '', '',
                { content: getDisplayValue(receiptData.given.total, 3), styles: { fontStyle: 'bold', halign: 'right' } }
            ];

            autoTable(doc, {
                head: [givenTableColumns],
                body: givenTableRows,
                foot: [givenTotalRow],
                startY: startY,
                theme: 'grid',
                headStyles: { fillColor: headerColor, textColor: primaryColor, fontStyle: 'bold', fontSize: tableHeaderFontSize, lineWidth: 0.1, lineColor: borderColor, halign: 'center' },
                bodyStyles: { fillColor: rowColor, textColor: primaryColor, fontSize: tableBodyFontSize, lineWidth: 0.1, lineColor: borderColor, cellPadding: 1.5 },
                alternateRowStyles: { fillColor: alternateRowColor },
                footStyles: { fillColor: headerColor, textColor: primaryColor, fontStyle: 'bold', fontSize: tableHeaderFontSize, lineWidth: 0.1, lineColor: borderColor, halign: 'right' },
                tableLineColor: borderColor,
                tableLineWidth: 0.1,
                margin: { left: margin + 5, right: margin + 5 },
                didParseCell: (data) => {
                     const numericColumns = [2, 3, 4, 5];
                     if ((data.section === 'body' || data.section === 'foot') && numericColumns.includes(data.column.index)) {
                         data.cell.styles.halign = 'right';
                     }
                     if (data.section === 'foot' && data.row.index === 0 && data.column.index === 0) {
                         data.cell.styles.halign = 'right';
                     }
                 },
                 didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
            });
             startY = (doc as any).lastAutoTable.finalY + 10;
        }

        // --- Received Section ---
        if (hasReceived && receiptData.received) {
             if (hasGiven) startY += 5;

             const formattedReceivedDate = receivedDate && isValid(receivedDate) ? format(receivedDate, 'PPP') : 'N/A';
             doc.setFontSize(12);
             doc.setFont('helvetica', 'bold');
             doc.text(`Received Details (Date: ${formattedReceivedDate})`, margin + 5, startY);
             startY += 8;

            const receivedTableColumns = ['S.No', 'Product Name', 'Final Ornaments (wt)', 'Stone Weight', 'Sub Total', 'Making Charge (%)', 'Total'];
            const receivedTableRows = receiptData.received.items.map((item, index) => [
                index + 1,
                item.productName || '',
                getDisplayValue(item.finalOrnamentsWt, 3),
                getDisplayValue(item.stoneWeight, 3),
                getDisplayValue(item.subTotal, 3),
                getDisplayValue(item.makingChargePercent, 2),
                getDisplayValue(item.total, 3)
            ]);
             const receivedTotalRow = [
                 { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
                 { content: getDisplayValue(receiptData.received.totalOrnamentsWt, 3), styles: { fontStyle: 'bold', halign: 'right' } },
                 { content: getDisplayValue(receiptData.received.totalStoneWeight, 3), styles: { fontStyle: 'bold', halign: 'right' } },
                 { content: getDisplayValue(receiptData.received.totalSubTotal, 3), styles: { fontStyle: 'bold', halign: 'right' } },
                 '',
                 { content: getDisplayValue(receiptData.received.total, 3), styles: { fontStyle: 'bold', halign: 'right' } }
             ];

             autoTable(doc, {
                 head: [receivedTableColumns],
                 body: receivedTableRows,
                 foot: [receivedTotalRow],
                 startY: startY,
                 theme: 'grid',
                 headStyles: { fillColor: headerColor, textColor: primaryColor, fontStyle: 'bold', fontSize: tableHeaderFontSize, lineWidth: 0.1, lineColor: borderColor, halign: 'center' },
                 bodyStyles: { fillColor: rowColor, textColor: primaryColor, fontSize: tableBodyFontSize, lineWidth: 0.1, lineColor: borderColor, cellPadding: 1.5 },
                 alternateRowStyles: { fillColor: alternateRowColor },
                 footStyles: { fillColor: headerColor, textColor: primaryColor, fontStyle: 'bold', fontSize: tableHeaderFontSize, lineWidth: 0.1, lineColor: borderColor, halign: 'right' },
                 tableLineColor: borderColor,
                 tableLineWidth: 0.1,
                 margin: { left: margin + 5, right: margin + 5 },
                  didParseCell: (data) => {
                     const numericColumns = [2, 3, 4, 5, 6];
                     if ((data.section === 'body' || data.section === 'foot') && numericColumns.includes(data.column.index)) {
                         data.cell.styles.halign = 'right';
                     }
                      if (data.section === 'foot' && data.row.index === 0 && data.column.index === 0) {
                         data.cell.styles.halign = 'right';
                     }
                 },
                 didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
            });
             startY = (doc as any).lastAutoTable.finalY + 10;
        }

        // --- Total Section ---
        startY += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Summary', margin + 5, startY);
        startY += 8;

        doc.setFontSize(textFontSize);
        doc.setFont('helvetica', 'normal');
        const finalGivenTotal = parseFloat(givenTotalInput) || 0;
        const finalReceivedTotal = parseFloat(receivedTotalInput) || 0;
        const finalResult = calculateResult();
        const operationText = operation === 'add' ? '+' : '-';

        autoTable(doc, {
           startY: startY,
           theme: 'plain',
           body: [
             ['Given Total:', getDisplayValue(finalGivenTotal, 3)],
             [`Received Total: (${operationText})`, getDisplayValue(finalReceivedTotal, 3)],
             ['Result:', { content: finalResult, styles: { fontStyle: 'bold' } }],
           ],
           columnStyles: {
             0: { halign: 'right', cellWidth: 40 },
             1: { halign: 'right', cellWidth: 40 },
           },
           margin: { left: pageWidth - margin - 5 - 80 },
           tableWidth: 80,
           styles: { fontSize: textFontSize },
           didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
        });

        // --- Space for Seal ---
        const sealSpace = 100 / doc.internal.scaleFactor; // Convert 100px to PDF units (approx)
        let companyStartY = (doc as any).lastAutoTable.finalY + sealSpace;

        // --- Company Name (Footer) ---
        doc.setFontSize(companyFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);

        const companyNameLine1 = 'ANTIQUES';
        const companyNameLine2 = 'JEWELLERY MANUFACTURERS';
        const companyLineHeight = companyFontSize * 0.5; // Compact line spacing

        // Function to add company name, checking for page overflow
        const addCompanyName = (currentY: number) => {
            let yPos = currentY;
            // Check if text fits on current page, considering bottom margin and padding
            if (yPos + companyLineHeight * 2 > pageHeight - margin - 30) {
                doc.addPage();
                yPos = margin + 20; // Reset Y for new page
                // Re-draw border on new page
                doc.setDrawColor(borderColor);
                doc.setLineWidth(0.5);
                doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);
            }
            // Position at bottom-right with padding
            const textX = pageWidth - margin - 40; // 40px from right
            let textY = pageHeight - margin - 30 - companyLineHeight; // 30px from bottom, adjust for second line

            // Draw text, aligning right
            doc.text(companyNameLine2, textX, textY, { align: 'right' });
            textY -= companyLineHeight * 1.2; // Move up for the first line
            doc.text(companyNameLine1, textX, textY, { align: 'right' });

            return yPos; // Return the Y position after drawing (or new page Y)
        };

        companyStartY = addCompanyName(companyStartY);


        // --- Save ---
        doc.save(`admin_receipt_${receiptData.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
        toast({ title: 'Success', description: 'Admin receipt downloaded.' });
    };

  // --- Render Logic ---
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p>Loading receipt view...</p>
        </div>
      </Layout>
    );
  }

  if (!receiptData) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center min-h-screen p-4">
          <p className="text-destructive mb-4">Receipt data could not be loaded or found.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  // Check if there's valid data to display for each section
  const hasGivenData = receiptData.given && receiptData.given.items.length > 0;
  const hasReceivedData = receiptData.received && receiptData.received.items.length > 0;

  // Parse and format dates safely
  const formattedDateGiven = receiptData.given?.date && isValid(parseISO(receiptData.given.date))
                              ? format(parseISO(receiptData.given.date), 'PPP') : 'N/A';
  const formattedDateReceived = receiptData.received?.date && isValid(parseISO(receiptData.received.date))
                                ? format(parseISO(receiptData.received.date), 'PPP') : 'N/A';

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8">
        <Card className="mb-6">
         <CardHeader className="flex flex-row justify-between items-center">
             <div>
                <CardTitle className="text-2xl">Admin Receipt View</CardTitle>
                <CardDescription>Client: {receiptData.clientName} (ID: {receiptData.clientId})</CardDescription>
             </div>
              <div className="flex gap-2"> {/* Button group */}
                 <Button onClick={downloadReceipt} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Download Receipt
                 </Button>
                 <Button onClick={() => router.back()} variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                 </Button>
              </div>
         </CardHeader>
        </Card>


        {/* Given Section */}
        {hasGivenData ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Given Details</CardTitle>
              <CardDescription>Date: {formattedDateGiven}</CardDescription>
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
                    </tr>
                  </thead>
                  <tbody>
                     {/* Add null check for receiptData.given.items */}
                    {receiptData.given?.items?.map((item, index) => (
                      <tr key={`given-${index}`}> {/* Add unique key prefix */}
                        <td className="p-2 border">{index + 1}</td>
                        <td className="p-2 border">{item.productName}</td>
                        {/* Use helper for consistent display */}
                        <td className="p-2 border text-right">{getDisplayValue(item.pureWeight, 3)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.purePercent, 2)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.melting, 2)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.total, 3)}</td>
                      </tr>
                    ))}
                     {/* Total Row - Directly use stored totals */}
                     {givenTotals && (
                       <tr className="bg-muted font-semibold">
                         <td colSpan={2} className="p-2 border text-right">Total:</td>
                         <td className="p-2 border text-right">{getDisplayValue(givenTotals.totalPureWeight, 3)}</td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border text-right">{getDisplayValue(givenTotals.total, 3)}</td>
                       </tr>
                     )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
            <Card className="mb-6 border-dashed border-muted-foreground">
                <CardContent className="p-6 text-center text-muted-foreground">
                    No "Given" items recorded for this receipt.
                </CardContent>
            </Card>
        )}


        {/* Separator only if both sections have data */}
        {hasGivenData && hasReceivedData && <Separator className="my-6" />}

        {/* Received Section */}
        {hasReceivedData ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Received Details</CardTitle>
               <CardDescription>Date: {formattedDateReceived}</CardDescription>
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
                        </tr>
                    </thead>
                    <tbody>
                       {/* Add null check for receiptData.received.items */}
                        {receiptData.received?.items?.map((item, index) => (
                           <tr key={`received-${index}`}> {/* Add unique key prefix */}
                              <td className="p-2 border">{index + 1}</td>
                              <td className="p-2 border">{item.productName}</td>
                              {/* Use helper for consistent display */}
                              <td className="p-2 border text-right">{getDisplayValue(item.finalOrnamentsWt, 3)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.stoneWeight, 3)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.subTotal, 3)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.makingChargePercent, 2)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.total, 3)}</td>
                           </tr>
                        ))}
                        {/* Total Row - Directly use stored totals */}
                         {receivedTotals && (
                           <tr className="bg-muted font-semibold">
                               <td colSpan={2} className="p-2 border text-right">Total:</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalOrnamentsWt, 3)}</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalStoneWeight, 3)}</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalSubTotal, 3)}</td>
                               <td className="p-2 border"></td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.total, 3)}</td>
                           </tr>
                         )}
                    </tbody>
                 </table>
              </div>
            </CardContent>
          </Card>
        ) : (
           <Card className="mb-6 border-dashed border-muted-foreground">
               <CardContent className="p-6 text-center text-muted-foreground">
                   No "Received" items recorded for this receipt.
               </CardContent>
           </Card>
       )}

        {/* Total Section (Previously Manual Comparison) */}
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle> {/* Changed title */}
            <CardDescription>Final calculation based on Given and Received totals.</CardDescription> {/* Changed description */}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="givenTotal" className="block text-sm font-medium text-muted-foreground mb-1">Given Total</label> {/* Changed label */}
              <Input
                id="givenTotal" // Changed id
                type="number"
                value={givenTotalInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setGivenTotalInput(e.target.value)}
                placeholder="Enter Given Total"
                step="0.001"
                className="text-right"
              />
            </div>
            <div>
              <label htmlFor="operation" className="block text-sm font-medium text-muted-foreground mb-1">Operation</label> {/* Changed label */}
              <select
                id="operation" // Changed id
                value={operation}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setOperation(e.target.value as 'add' | 'subtract')}
                className={cn(
                   "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                )} >
                <option value="subtract">Subtract (-)</option>
                <option value="add">Add (+)</option>
              </select>
            </div>
            <div>
              <label htmlFor="receivedTotal" className="block text-sm font-medium text-muted-foreground mb-1">Received Total</label> {/* Changed label */}
              <Input
                id="receivedTotal" // Changed id
                type="number"
                value={receivedTotalInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReceivedTotalInput(e.target.value)}
                placeholder="Enter Received Total"
                step="0.001"
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Result</label>
              <Input
                type="text"
                value={calculateResult()} // Use renamed function
                readOnly
                className="font-semibold text-right bg-muted"
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}

