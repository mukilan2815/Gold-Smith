'use client';

import type { ChangeEvent} from 'react';
import {useState, useEffect, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
  limit,
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
import {db} from '@/lib/firebase';
import {useToast} from '@/hooks/use-toast';
import {useDebounce} from '@/hooks/use-debounce';

interface ClientReceipt {
  id: string;
  clientId: string;
  clientName: string;
  shopName?: string;
  phoneNumber?: string;
  metalType: string;
  issueDate: string;
  tableData: any[];
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number;
  };
  createdAt?: Timestamp;
}

export default function BillPage() {
  return (
    <Layout>
      <BillContent />
    </Layout>
  );
}

function BillContent() {
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
      const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const fetchedReceipts: ClientReceipt[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        let issueDateStr = '';
        if (data.issueDate) {
          if (data.issueDate instanceof Timestamp) {
            issueDateStr = data.issueDate.toDate().toISOString();
          } else if (typeof data.issueDate === 'string') {
            try {
              const parsedDate = parseISO(data.issueDate);
              if (isValid(parsedDate)) issueDateStr = parsedDate.toISOString();
              else issueDateStr = data.issueDate;
            } catch (e) { issueDateStr = data.issueDate; }
          }
        }
        fetchedReceipts.push({
          id: doc.id, ...data, issueDate: issueDateStr,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
        } as ClientReceipt);
      });
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error('Error fetching client receipts:', error);
      toast({
        variant: 'destructive', title: 'Error fetching receipts',
        description: "Could not load receipts. Ensure Firestore indexes exist for 'ClientReceipts' on 'createdAt' (descending). Check console.",
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
          const issueDate = parseISO(receipt.issueDate);
          return isValid(issueDate) && format(issueDate, 'yyyy-MM-dd') === filterDateStr;
        } catch (e) { return false; }
      });
    }
    setFilteredReceipts(currentReceipts);
  }, [debouncedShopName, debouncedClientName, debouncedPhoneNumber, debouncedDateFilter, receipts]);

  const handleViewReceipt = (receipt: ClientReceipt) => {
    router.push(`/receipt/details?clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}&receiptId=${receipt.id}`);
  };

  const handleDeleteReceipt = async (receiptToDelete: ClientReceipt) => {
    try {
      const receiptRef = doc(db, 'ClientReceipts', receiptToDelete.id);
      await deleteDoc(receiptRef);
      setReceipts(prevReceipts => prevReceipts.filter(r => r.id !== receiptToDelete.id));
      toast({title: 'Success', description: `Receipt for ${receiptToDelete.clientName} deleted.`});
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({variant: 'destructive', title: 'Error', description: 'Could not delete receipt.'});
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-5xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Client Bills</CardTitle>
          <CardDescription>View and manage client receipts. Slow loading? Check Firestore indexes for 'ClientReceipts'.</CardDescription>
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
                Loading receipts... For optimal performance, ensure a descending index exists on 'createdAt' in your 'ClientReceipts' Firestore collection.
              </p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map(receipt => {
                  let formattedIssueDate = 'N/A';
                  if (receipt.issueDate && typeof receipt.issueDate === 'string') {
                    try {
                      const parsedDate = parseISO(receipt.issueDate);
                      if (isValid(parsedDate)) formattedIssueDate = format(parsedDate, 'PPP');
                      else {
                        const parts = receipt.issueDate.split('-');
                        if (parts.length === 3) {
                            const directDate = new Date(Number(parts[0]), Number(parts[1]) -1, Number(parts[2]));
                            if (isValid(directDate)) formattedIssueDate = format(directDate, 'PPP');
                        }
                      }
                    } catch (e) { /* Silently ignore parse error for display */ }
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
                        <p className="text-xs text-muted-foreground">ID: {receipt.id}</p>
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
                              <AlertDialogDescription>This action cannot be undone. This will delete the receipt permanently.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteReceipt(receipt)} className={cn(buttonVariants({variant: 'destructive'}))}>
                                Delete
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
              <p className="text-muted-foreground text-center">No receipts found. Slow loading? Check Firestore indexes for 'ClientReceipts' on 'createdAt' (descending).</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
