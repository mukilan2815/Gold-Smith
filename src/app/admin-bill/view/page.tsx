'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
// import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore'; // Firebase removed
import { format, isValid, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
// import { db } from '@/lib/firebase'; // Firebase removed
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Keep interfaces for data structure, will be mapped from SQL later
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

const getDisplayValue = (value: string | number | undefined | null, decimals = 3): string => {
    if (value === undefined || value === null) return '0.' + '0'.repeat(decimals);
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (isNaN(num) ? 0 : num).toFixed(decimals);
};

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

  const [givenTotalInput, setGivenTotalInput] = useState('');
  const [receivedTotalInput, setReceivedTotalInput] = useState('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('subtract');


  useEffect(() => {
    const fetchReceipt = async () => {
      if (!receiptId) {
        toast({ variant: "destructive", title: "Error", description: "Admin Receipt ID is missing." });
        setLoading(false);
        router.push('/admin-bill');
        return;
      }
      setLoading(true);
      // TODO: Implement SQL data fetching for the specific receipt
      // Example: const data = await fetchAdminReceiptFromSQL(receiptId);
      // if (data) {
      //   setReceiptData(data);
      //   setGivenTotalInput(data.given?.total?.toFixed(3) ?? '');
      //   setReceivedTotalInput(data.received?.total?.toFixed(3) ?? '');
      // } else {
      //   toast({ variant: "destructive", title: "Not Found", description: `Admin receipt with ID ${receiptId} not found.` });
      //   router.push('/admin-bill');
      // }
      console.warn(`Data fetching for receipt ID ${receiptId} not implemented. Waiting for SQL database setup.`);
      toast({
          title: "Data Fetching Pending",
          description: `Details for admin receipt ${receiptId} will be loaded once SQL DB is configured.`,
          variant: "default"
      });
      setReceiptData(null); // Initialize with null
      setLoading(false);
    };

    fetchReceipt();
  }, [receiptId, toast, router]);

  const givenTotals = receiptData?.given;
  const receivedTotals = receiptData?.received;

   const calculateResult = () => {
     const given = parseFloat(givenTotalInput) || 0;
     const received = parseFloat(receivedTotalInput) || 0;
     let result = 0;
     if (operation === 'add') {
       result = given + received;
     } else { 
       result = given - received;
     }
     return result.toFixed(3);
   };

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
             toast({ variant: "destructive", title: "Error", description: "Cannot download an empty admin receipt." });
             return;
        }

        const doc = new jsPDF();
        const primaryColor = '#000000'; 
        const borderColor = '#B8860B'; 
        const headerColor = '#FFF8DC'; 
        const rowColor = '#FFFFFF'; 
        const alternateRowColor = '#FAF0E6'; 
        const titleFontSize = 18;
        const textFontSize = 10;
        const companyFontSize = 13; 
        const tableHeaderFontSize = 9;
        const tableBodyFontSize = 8;
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let startY = margin + 20;

        doc.setDrawColor(borderColor);
        doc.setLineWidth(0.5);
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

        doc.setFontSize(titleFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        const title = 'Admin Receipt';
        const titleWidth = doc.getTextWidth(title);
        doc.text(title, (pageWidth - titleWidth) / 2, startY);
        startY += 10;

        doc.setFontSize(textFontSize);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(primaryColor);
        doc.text(`Client Name: ${receiptData.clientName || 'N/A'}`, margin + 5, startY);
        startY += 6;
        const receiptCreationDate = receiptData.createdAt; // Already a Date object
        if (receiptCreationDate && isValid(receiptCreationDate)) {
            doc.text(`Receipt Date: ${format(receiptCreationDate, 'PPP p')}`, margin + 5, startY);
            startY += 6;
        }


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
        
        const sealSpace = 100 / doc.internal.scaleFactor; 
        let companyStartY = (doc as any).lastAutoTable.finalY + sealSpace;

        doc.setFontSize(companyFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);

        const companyNameLine1 = 'ANTIQUES';
        const companyNameLine2 = 'JEWELLERY MANUFACTURERS';
        const companyLineHeight = companyFontSize * 0.5; 

        const addCompanyName = (currentY: number) => {
            let yPos = currentY;
            if (yPos + companyLineHeight * 2 > pageHeight - margin - 30) { 
                doc.addPage();
                yPos = margin + 20; 
                doc.setDrawColor(borderColor);
                doc.setLineWidth(0.5);
                doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);
            }
            const textX = pageWidth - margin - 40; 
            let textY = pageHeight - margin - 30 - companyLineHeight; 

            doc.text(companyNameLine2, textX, textY, { align: 'right' });
            textY -= companyLineHeight * 1.2; 
            doc.text(companyNameLine1, textX, textY, { align: 'right' });

            return yPos;
        };
        companyStartY = addCompanyName(companyStartY);

        doc.save(`admin_receipt_${receiptData.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
        toast({ title: 'Success', description: 'Admin receipt downloaded.' });
    };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p>Loading admin receipt view... Waiting for SQL database configuration.</p>
        </div>
      </Layout>
    );
  }

  if (!receiptData) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center min-h-screen p-4">
          <p className="text-destructive mb-4">Admin receipt data could not be loaded or was not found.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const hasGivenData = receiptData.given && receiptData.given.items.length > 0;
  const hasReceivedData = receiptData.received && receiptData.received.items.length > 0;

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
                <CardDescription>Client: {receiptData.clientName} (ID: {receiptData.clientId.substring(0,10)}...)</CardDescription>
             </div>
              <div className="flex gap-2">
                 <Button onClick={downloadReceipt} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Download Receipt
                 </Button>
                 <Button onClick={() => router.back()} variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                 </Button>
              </div>
         </CardHeader>
        </Card>

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
                    {receiptData.given?.items?.map((item, index) => (
                      <tr key={`given-${index}`}>
                        <td className="p-2 border">{index + 1}</td>
                        <td className="p-2 border">{item.productName}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.pureWeight)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.purePercent, 2)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.melting, 2)}</td>
                        <td className="p-2 border text-right">{getDisplayValue(item.total)}</td>
                      </tr>
                    ))}
                     {givenTotals && (
                       <tr className="bg-muted font-semibold">
                         <td colSpan={2} className="p-2 border text-right">Total:</td>
                         <td className="p-2 border text-right">{getDisplayValue(givenTotals.totalPureWeight)}</td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border"></td>
                         <td className="p-2 border text-right">{getDisplayValue(givenTotals.total)}</td>
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
                    No "Given" items recorded for this admin receipt.
                </CardContent>
            </Card>
        )}

        {hasGivenData && hasReceivedData && <Separator className="my-6" />}

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
                        {receiptData.received?.items?.map((item, index) => (
                           <tr key={`received-${index}`}>
                              <td className="p-2 border">{index + 1}</td>
                              <td className="p-2 border">{item.productName}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.finalOrnamentsWt)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.stoneWeight)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.subTotal)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.makingChargePercent,2)}</td>
                              <td className="p-2 border text-right">{getDisplayValue(item.total)}</td>
                           </tr>
                        ))}
                         {receivedTotals && (
                           <tr className="bg-muted font-semibold">
                               <td colSpan={2} className="p-2 border text-right">Total:</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalOrnamentsWt)}</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalStoneWeight)}</td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.totalSubTotal)}</td>
                               <td className="p-2 border"></td>
                               <td className="p-2 border text-right">{getDisplayValue(receivedTotals.total)}</td>
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
                   No "Received" items recorded for this admin receipt.
               </CardContent>
           </Card>
       )}

        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
            <CardDescription>Final calculation based on Given and Received totals. This is for on-screen viewing and can be manually adjusted.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="givenTotal" className="block text-sm font-medium text-muted-foreground mb-1">Given Total</label>
              <Input
                id="givenTotal"
                type="number"
                value={givenTotalInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setGivenTotalInput(e.target.value)}
                placeholder="Enter Given Total"
                step="0.001"
                className="text-right"
              />
            </div>
            <div>
              <label htmlFor="operation" className="block text-sm font-medium text-muted-foreground mb-1">Operation</label>
              <select
                id="operation"
                value={operation}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setOperation(e.target.value as 'add' | 'subtract')}
                className={cn(
                   "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                )} >
                <option value="subtract">Subtract (Given - Received)</option>
                <option value="add">Add (Given + Received)</option>
              </select>
            </div>
            <div>
              <label htmlFor="receivedTotal" className="block text-sm font-medium text-muted-foreground mb-1">Received Total</label>
              <Input
                id="receivedTotal"
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
                value={calculateResult()}
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
