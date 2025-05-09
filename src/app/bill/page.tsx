'use client';

import type { ChangeEvent} from 'react';
import {useState, useEffect, useCallback} from 'react';
import {useRouter}from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
  limit,
  DocumentData, // Added DocumentData
} from 'firebase/firestore';
import {format, parseISO, isValid } from 'date-fns';
import {Calendar as CalendarIcon, Trash2, Eye} from 'lucide-react';

import Layout from '@/components/Layout';
import {Button, buttonVariants} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {cn} from '@/lib/utils';
import {db}from '@/lib/firebase';
import {useToast}from '@/hooks/use-toast';
import {useDebounce}from '@/hooks/use-debounce';

interface ClientReceipt {
  id: string;
  clientId: string;
  clientName: string;
  shopName?: string;
  phoneNumber?: string;
  metalType: string;
  issueDate: string; // Stored as ISO string
  tableData: any[]; // Simplified for listing, detailed structure in details page
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number; // Added optional stoneWt as it's in new structure
  };
  createdAt?: Timestamp; // Firestore Timestamp
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
      const receiptsRef = collection(db, 'ClientReceipts');
      // Querying by 'createdAt' (desc) requires an index.
      const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const fetchedReceipts: ClientReceipt[] = [];
      querySnapshot.forEach(docSnap => { // Renamed doc to docSnap for clarity
        const data = docSnap.data() as DocumentData; // Use DocumentData
        // issueDate is stored as ISO string, no complex parsing needed here for list display
        // createdAt should be a Firestore Timestamp
        fetchedReceipts.push({
          id: docSnap.id,
          clientId: data.clientId || '',
          clientName: data.clientName || 'Unknown Client',
          shopName: data.shopName || '',
          phoneNumber: data.phoneNumber || '',
          metalType: data.metalType || 'N/A',
          issueDate: data.issueDate || '', // Expecting ISO string
          tableData: data.tableData || [],
          totals: data.totals || { grossWt: 0, netWt: 0, finalWt: 0, stoneAmt: 0, stoneWt: 0 },
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
        } as ClientReceipt); // Casting to ClientReceipt
      });
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error('Error fetching client receipts:', error);
      toast({
        variant: 'destructive', title: 'Error Fetching Client Receipts',
        description: "Could not load receipts. This often means a Firestore index is missing. Please ensure an index on 'ClientReceipts' collection for 'createdAt' field (descending) exists. Check console and firestore.indexes.md.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    if (!receipts) return;
    let currentReceipts = [...receipts];
    if (debouncedShopName.trim() !== '') {
      currentReceipts = currentReceipts.filter(receipt => receipt.shopName?.toLowerCase().includes(debouncedShopName.toLowerCase()));
    }
    if (debouncedClientName.trim() !== '') {
      currentReceipts = currentReceipts.filter(receipt => receipt.clientName.toLowerCase().includes(debouncedClientName.toLowerCase()));
    }
    if (debouncedPhoneNumber.trim() !== '') {
      currentReceipts = currentReceipts.filter(receipt => receipt.phoneNumber?.includes(debouncedPhoneNumber));
    }
    if (debouncedDateFilter && isValid(debouncedDateFilter)) {
      const filterDateStr = format(debouncedDateFilter, 'yyyy-MM-dd');
      currentReceipts = currentReceipts.filter(receipt => {
        if (!receipt.issueDate || typeof receipt.issueDate !== 'string') return false;
        try {
          // Assuming issueDate is stored as ISO string (e.g., "2023-04-21T...")
          // We only need to compare the date part.
          const issueDateOnly = receipt.issueDate.substring(0, 10);
          return issueDateOnly === filterDateStr;
        } catch (e) { return false; } // Should not happen if issueDate is ISO string
      });
    }
    setFilteredReceipts(currentReceipts);
  }, [debouncedShopName, debouncedClientName, debouncedPhoneNumber, debouncedDateFilter, receipts]);

  const handleViewReceipt = (receipt: ClientReceipt) => {
    // Navigate to the details page, passing necessary identifiers
    router.push(`/receipt/details?clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}&receiptId=${receipt.id}`);
  };

  const handleDeleteReceipt = async (receiptToDelete: ClientReceipt) => {
    try {
      const receiptRef = doc(db, 'ClientReceipts', receiptToDelete.id);
      await deleteDoc(receiptRef);
      setReceipts(prevReceipts => prevReceipts.filter(r => r.id !== receiptToDelete.id)); // Update local state
      toast({title: 'Success', description: `Receipt for ${receiptToDelete.clientName} deleted.`});
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({variant: 'destructive', title: 'Error Deleting Receipt', description: 'Could not delete receipt. Check console for details.'});
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-5xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Client Bills</CardTitle>
          <CardDescription>View and manage client receipts. Slow loading? Check Firestore index for 'ClientReceipts' on 'createdAt' (descending). See firestore.indexes.md.</CardDescription>
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
                Loading client receipts... If slow, ensure a Firestore index for 'ClientReceipts' on 'createdAt' (descending) is active. See firestore.indexes.md.
              </p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map(receipt => {
                  let formattedIssueDate = 'N/A';
                  if (receipt.issueDate && isValid(parseISO(receipt.issueDate))) {
                     formattedIssueDate = format(parseISO(receipt.issueDate), 'PPP');
                  }
                  return (
                    <li key={receipt.id} className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors">
                      <div className="mb-3 md:mb-0 md:flex-1">
                        <p className="font-semibold text-lg">
                          {receipt.clientName}
                          {receipt.shopName && <span className="text-sm text-muted-foreground"> ({receipt.shopName})</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">Issue Date: {formattedIssueDate}</p>
                        <p className="text-sm text-muted-foreground">Metal: {receipt.metalType}</p>
                        <p className="text-xs text-muted-foreground">ID: {receipt.id.substring(0,10)}...</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt)} className="flex items-center gap-1">
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex items-center gap-1">
                              <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete the receipt for {receipt.clientName}.</AlertDialogDescription>
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
              <p className="text-muted-foreground text-center">No client receipts found for current filters. If loading was slow, check Firestore indexes for 'ClientReceipts' on 'createdAt' (descending). Refer to firestore.indexes.md.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
