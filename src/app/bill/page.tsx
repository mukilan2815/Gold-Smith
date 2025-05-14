'use client';

import type { ChangeEvent} from 'react';
import {useState, useEffect, useCallback}from 'react';
import {useRouter}from 'next/navigation';
import {format, parseISO, isValid } from 'date-fns';
import {Calendar as CalendarIcon, Trash2, Eye, Edit, Download} from 'lucide-react';

import Layout from '@/components/Layout';
import {Button, buttonVariants} from '@/components/ui/button';
import {Input}from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {ScrollArea}from '@/components/ui/scroll-area';
import {Popover, PopoverContent, PopoverTrigger}from '@/components/ui/popover';
import {Calendar}from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {cn}from '@/lib/utils';
import {useToast}from '@/hooks/use-toast';
import {useDebounce}from '@/hooks/use-debounce';

// This interface should match the structure in ClientReceipts collection in MongoDB
interface ClientReceipt {
  id: string; // Corresponds to _id from MongoDB
  clientId: string;
  clientInfo: {
    clientName: string;
    shopName?: string;
    phoneNumber?: string;
  };
  clientName?: string; // For backward compatibility
  shopName?: string; // For backward compatibility
  phoneNumber?: string; // For backward compatibility
  metalType: string;
  issueDate: string; // Should be a Date object from MongoDB, formatted as string for display
  tableData: any[]; // Define more specific type if possible based on ReceiptItem
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number; 
  };
  createdAt?: Date;
}

export default function ClientBillListPage() {
  return (
    <Layout>
      <ClientBillListContent />
    </Layout>
  );
}

function ClientBillListContent() {
  const [shopNameFilter, setShopNameFilter] = useState('');
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [phoneNumberFilter, setPhoneNumberFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ClientReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const {toast} = useToast();

  const debouncedShopName = useDebounce(shopNameFilter, 300);
  const debouncedClientName = useDebounce(clientNameFilter, 300);
  const debouncedPhoneNumber = useDebounce(phoneNumberFilter, 300);
  const debouncedDateFilter = useDebounce(dateFilter, 300);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params for filtering
      const queryParams = new URLSearchParams();
      if (debouncedShopName) queryParams.append('shopName', debouncedShopName);
      if (debouncedClientName) queryParams.append('clientName', debouncedClientName);
      if (debouncedPhoneNumber) queryParams.append('phoneNumber', debouncedPhoneNumber);
      if (debouncedDateFilter) queryParams.append('issueDate', format(debouncedDateFilter, 'yyyy-MM-dd'));
      
      // Fetch client receipts from API using the receipts endpoint
      const response = await fetch(`/api/receipts?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch client receipts');
      }
      
      const data = await response.json();
      
      // Transform MongoDB _id to id for frontend use
      setReceipts(data.map((receipt: any) => ({
        ...receipt,
        id: receipt.id || receipt._id?.toString(), // Handle both formats
        issueDate: receipt.issueDate ? new Date(receipt.issueDate).toISOString() : null
      })));
    } catch (error) {
      console.error('Error fetching client receipts:', error);
      toast({
        variant: 'destructive',
        title: 'Error Fetching Receipts',
        description: 'There was a problem loading receipt data. Please try again.'
      });
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [toast, debouncedShopName, debouncedClientName, debouncedPhoneNumber, debouncedDateFilter]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    // Client-side filtering can be a fallback. Ideally, filtering is done server-side with MongoDB.
    if (!receipts) return;
    let currentReceipts = [...receipts];
    if (debouncedShopName.trim() !== '') {
      currentReceipts = currentReceipts.filter(receipt => {
        const shopName = receipt.clientInfo?.shopName || receipt.shopName || '';
        return shopName.toLowerCase().includes(debouncedShopName.toLowerCase());
      });
    }
    if (debouncedClientName.trim() !== '') {
      currentReceipts = currentReceipts.filter(receipt => {
        const clientName = receipt.clientInfo?.clientName || receipt.clientName || '';
        return clientName.toLowerCase().includes(debouncedClientName.toLowerCase());
      });
    }
    if (debouncedPhoneNumber.trim() !== '') {
      currentReceipts = currentReceipts.filter(receipt => {
        const phoneNumber = receipt.clientInfo?.phoneNumber || receipt.phoneNumber || '';
        return phoneNumber.includes(debouncedPhoneNumber);
      });
    }
    if (debouncedDateFilter && isValid(debouncedDateFilter)) {
      const filterDateStr = format(debouncedDateFilter, 'yyyy-MM-dd');
      currentReceipts = currentReceipts.filter(receipt => {
        if (!receipt.issueDate || typeof receipt.issueDate !== 'string') return false;
        try {
          // Assuming issueDate is stored as ISO string or Date and needs formatting for comparison
          const issueDateOnly = format(parseISO(receipt.issueDate), 'yyyy-MM-dd');
          return issueDateOnly === filterDateStr;
        } catch (e) { return false; } 
      });
    }
    setFilteredReceipts(currentReceipts);
  }, [debouncedShopName, debouncedClientName, debouncedPhoneNumber, debouncedDateFilter, receipts]);

  const handleViewReceipt = (receipt: ClientReceipt) => {
    router.push(`/receipt/details?clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}&receiptId=${receipt.id}`);
  };

  const handleEditReceipt = (receipt: ClientReceipt) => {
    // Navigate to receipt details page with edit=true parameter to enable edit mode
    router.push(`/receipt/details?clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}&receiptId=${receipt.id}&edit=true`);
  };

  const handleDownloadReceipt = async (receipt: ClientReceipt) => {
    try {
      toast({
        title: 'Preparing Download',
        description: 'Generating PDF receipt...',
        variant: 'default'
      });

      // First get the receipt details
      const response = await fetch(`/api/receipts/${receipt.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch receipt details');
      }
      
      const receiptData = await response.json();
      
      // Generate PDF on client side using the same logic as in receipt/details page
      // Import jsPDF directly instead of using dynamic import with destructuring
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      
      // Set up document with better styling
      const primaryColor = '#000000'; 
      const borderColor = '#B8860B'; 
      const headerColor = '#FFF8DC'; 
      const titleFontSize = 20;
      const textFontSize = 10;
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add border
      doc.setDrawColor(borderColor); 
      doc.setLineWidth(0.5); 
      doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);
      
      // Title
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      const title = 'Goldsmith Receipt';
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, margin + 10);
         
      // Client info
      doc.setFontSize(textFontSize);
      doc.setFont('helvetica', 'normal');
      let startY = margin + 25;
      
      // Handle client name with proper fallback
      const clientName = receiptData.clientInfo?.clientName || receiptData.clientName || receipt.clientName || 'N/A';
      doc.text(`Client: ${clientName === 'undefined' ? 'N/A' : clientName}`, margin + 5, startY);
      startY += 6;
      
      // Format date
      doc.text(`Date: ${receiptData.issueDate ? format(new Date(receiptData.issueDate), 'PPP') : 'N/A'}`, margin + 5, startY);
      startY += 6;
      
      // Handle shop name with proper fallback
      const shopName = receiptData.clientInfo?.shopName || receipt.shopName || 'N/A';
      doc.text(`Shop: ${shopName === 'undefined' ? 'N/A' : shopName}`, margin + 5, startY);
      startY += 6;
      
      // Handle phone number with proper fallback
      const phoneNumber = receiptData.clientInfo?.phoneNumber || receipt.phoneNumber || 'N/A';
      doc.text(`Phone: ${phoneNumber === 'undefined' ? 'N/A' : phoneNumber}`, margin + 5, startY);
      startY += 6;
      
      doc.text(`Metal Type: ${receiptData.metalType || 'N/A'}`, margin + 5, startY);
      startY += 10;
      
      // Prepare table data
      const tableColumn = ['S.No.', 'Item Name', 'Tag', 'Gross (wt)', 'Stone (wt)', 'Net (wt)', 'M/T (%)', 'Final (wt)', 'Stone Amt'];
      const tableRows = [];
      
      // Check if we have items in the correct format
      if (receiptData.items && Array.isArray(receiptData.items)) {
        receiptData.items.forEach((item, index) => {
          // Calculate net and final weight
          const grossWt = parseFloat(item.grossWt) || 0;
          const stoneWt = parseFloat(item.stoneWt) || 0;
          const meltingTouch = parseFloat(item.meltingTouch) || 0;
          const netWt = grossWt - stoneWt;
          const finalWt = (netWt * meltingTouch) / 100;
          const stoneAmt = parseFloat(item.stoneAmt) || 0;
          
          tableRows.push([
            (index + 1).toString(),
            item.itemName || '',
            item.tag || '',
            grossWt.toFixed(3),
            stoneWt.toFixed(3),
            netWt.toFixed(3),
            meltingTouch.toFixed(2),
            finalWt.toFixed(3),
            stoneAmt.toFixed(2)
          ]);
        });
      } else if (receiptData.tableData && Array.isArray(receiptData.tableData)) {
        // Fallback to tableData if items is not available
        receiptData.tableData.forEach((item, index) => {
          const grossWt = parseFloat(item.grossWt) || 0;
          const stoneWt = parseFloat(item.stoneWt) || 0;
          const meltingTouch = parseFloat(item.meltingTouch) || 0;
          const netWt = grossWt - stoneWt;
          const finalWt = (netWt * meltingTouch) / 100;
          const stoneAmt = parseFloat(item.stoneAmt) || 0;
          
          tableRows.push([
            (index + 1).toString(),
            item.itemName || '',
            item.tag || '',
            grossWt.toFixed(3),
            stoneWt.toFixed(3),
            netWt.toFixed(3),
            meltingTouch.toFixed(2),
            finalWt.toFixed(3),
            stoneAmt.toFixed(2)
          ]);
        });
      }
      
      // Calculate totals
      const totalGrossWt = receiptData.totals?.grossWt || 
        tableRows.reduce((sum, row) => sum + parseFloat(row[3]), 0);
      const totalStoneWt = receiptData.totals?.stoneWt || 
        tableRows.reduce((sum, row) => sum + parseFloat(row[4]), 0);
      const totalNetWt = receiptData.totals?.netWt || 
        tableRows.reduce((sum, row) => sum + parseFloat(row[5]), 0);
      const totalFinalWt = receiptData.totals?.finalWt || 
        tableRows.reduce((sum, row) => sum + parseFloat(row[7]), 0);
      const totalStoneAmt = receiptData.totals?.stoneAmt || 
        tableRows.reduce((sum, row) => sum + parseFloat(row[8]), 0);
      
      // Add table with autotable
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        headStyles: {
          fillColor: headerColor,
          textColor: primaryColor,
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'center'
        },
        bodyStyles: {
          textColor: primaryColor,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        footStyles: {
          fillColor: headerColor,
          textColor: primaryColor,
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: borderColor,
          halign: 'right'
        },
        didParseCell: (data) => {
          const numericColumns = [0, 3, 4, 5, 6, 7, 8];
          if (data.column.index === 0 && (data.section === 'body' || data.section === 'foot')) {
            data.cell.styles.halign = 'center';
          } else if ((data.section === 'body' || data.section === 'foot') && numericColumns.includes(data.column.index)) {
            data.cell.styles.halign = 'right';
          }
        },
        showFoot: 'lastPage',
        foot: [
          [
            {content: '', styles: {halign: 'center'}},
            {content: 'Total', colSpan: 2, styles: {fontStyle: 'bold', halign: 'right'}},
            {content: totalGrossWt.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
            {content: totalStoneWt.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
            {content: totalNetWt.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
            {content: '', styles: {halign: 'right'}},
            {content: totalFinalWt.toFixed(3), styles: {fontStyle: 'bold', halign: 'right'}},
            {content: totalStoneAmt.toFixed(2), styles: {fontStyle: 'bold', halign: 'right'}},
          ],
        ],
      });
      
      // Save the PDF with try-catch to handle any potential errors
      try {
        const clientNameForFile = (receipt.clientInfo?.clientName || receipt.clientName || 'unnamed').replace(/\s+/g, '_');
        doc.save(`receipt_${clientNameForFile}_${receipt.issueDate ? format(parseISO(receipt.issueDate), 'yyyyMMdd') : 'nodate'}.pdf`);
        
        toast({ 
          title: 'Receipt Downloaded', 
          description: `Receipt for ${receipt.clientInfo?.clientName || receipt.clientName || 'N/A'} has been successfully downloaded.`,
          variant: 'default'
        });
      } catch (saveError) {
        console.error('Error saving PDF:', saveError);
        throw new Error('Failed to save the PDF file');
      }
    } catch (error) {
      console.error(`Error downloading receipt ID ${receipt.id}:`, error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'There was a problem downloading the receipt. Please try again.'
      });
    }
  };

  const handleDeleteReceipt = async (receiptToDelete: ClientReceipt) => {
    try {
      // Call API to delete the receipt
      const response = await fetch(`/api/receipts/${receiptToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete receipt');
      }
      
      // Update UI by removing the deleted receipt
      setReceipts(prevReceipts => prevReceipts.filter(r => r.id !== receiptToDelete.id));
      toast({ 
        title: 'Receipt Deleted', 
        description: `Receipt for ${receiptToDelete.clientInfo?.clientName || receiptToDelete.clientName || 'N/A'} has been successfully deleted.`,
        variant: 'default'
      });
    } catch (error) {
      console.error(`Error deleting receipt ID ${receiptToDelete.id}:`, error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'There was a problem deleting the receipt. Please try again.'
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-5xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Client Bills</CardTitle>
          <CardDescription>View and manage client receipts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input type="text" placeholder="Filter by Shop Name" value={shopNameFilter} onChange={(e: ChangeEvent<HTMLInputElement>) => setShopNameFilter(e.target.value)} className="rounded-md"/>
            <Input type="text" placeholder="Filter by Client Name" value={clientNameFilter} onChange={(e: ChangeEvent<HTMLInputElement>) => setClientNameFilter(e.target.value)} className="rounded-md"/>
            <Input type="text" placeholder="Filter by Phone Number" value={phoneNumberFilter} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhoneNumberFilter(e.target.value)} className="rounded-md"/>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-full md:w-[240px] justify-start text-left font-normal', !dateFilter && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by Issue Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus/>
              </PopoverContent>
            </Popover>
          </div>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            {loading ? (
              <p className="text-muted-foreground text-center">
                Loading client receipts...
              </p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map(receipt => {
                  let formattedIssueDate = 'N/A';
                  if (receipt.issueDate && isValid(parseISO(receipt.issueDate))) {
                     formattedIssueDate = format(parseISO(receipt.issueDate), 'PPP');
                  } else if (receipt.issueDate) { // If it's a Date object but not string
                    try { formattedIssueDate = format(new Date(receipt.issueDate), 'PPP'); } catch (e) {/* ignore */}
                  }
                  return (
                    <li key={receipt.id} className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors">
                      <div className="mb-3 md:mb-0 md:flex-1">
                        <p className="font-semibold text-lg">
                          {receipt.clientInfo?.clientName || receipt.clientName || 'N/A'}
                          {(receipt.clientInfo?.shopName || receipt.shopName) && <span className="text-sm text-muted-foreground"> ({receipt.clientInfo?.shopName || receipt.shopName})</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">Client: {receipt.clientInfo?.clientName || receipt.clientName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Issue Date: {formattedIssueDate}</p>
                        <p className="text-sm text-muted-foreground">Shop: {receipt.clientInfo?.shopName || receipt.shopName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Phone: {receipt.clientInfo?.phoneNumber || receipt.phoneNumber || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt)} className="flex items-center gap-1">
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditReceipt(receipt)} className="flex items-center gap-1">
                            <Edit className="h-4 w-4" /> Edit
                          </Button>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex items-center gap-1">
                              <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete the receipt for {receipt.clientInfo?.clientName || receipt.clientName || 'N/A'}.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteReceipt(receipt)} className={cn(buttonVariants({variant: 'destructive'}))}>
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No client receipts found.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
