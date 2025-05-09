'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, Timestamp, DocumentData, limit } from 'firebase/firestore'; 
import { format, parseISO, isValid } from 'date-fns'; 
import { Calendar as CalendarIcon, Eye, Edit } from 'lucide-react';

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce'; 

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

interface AdminReceipt {
  id: string; 
  clientId: string;
  clientName: string;
  given: GivenData | null;
  received: ReceivedData | null;
  status: 'complete' | 'incomplete' | 'empty';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function AdminBillListPage() {
  return (
    <Layout>
      <AdminBillListContent />
    </Layout>
  );
}

function AdminBillListContent() {
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<AdminReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();

  const debouncedClientName = useDebounce(clientNameFilter, 300); 
  const debouncedDateFilter = useDebounce(dateFilter, 300);


   const fetchReceipts = useCallback(async () => {
     setLoading(true);
     try {
       const receiptsRef = collection(db, 'AdminReceipts');
       // Querying by 'createdAt' (desc) requires an index.
       const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(50)); 
       const querySnapshot = await getDocs(q);
       const fetchedReceipts: AdminReceipt[] = [];
       querySnapshot.forEach((docSnap) => {
         const data = docSnap.data() as DocumentData; 
         
         fetchedReceipts.push({
           id: docSnap.id,
           clientId: data.clientId || '',
           clientName: data.clientName || 'Unknown Client',
           given: data.given || null, // Assume structure matches GivenData or null
           received: data.received || null, // Assume structure matches ReceivedData or null
           status: data.status || 'empty',
           createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(), 
           updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now(), 
         }); 
       });
       setReceipts(fetchedReceipts);
     } catch (error) {
       console.error("Error fetching admin receipts:", error);
       toast({ 
         variant: "destructive", 
         title: "Error Fetching Admin Receipts", 
         description: "Could not load admin receipts. This often means a Firestore index is missing. Please ensure an index on 'AdminReceipts' collection for 'createdAt' field (descending) exists. Check console and firestore.indexes.md." 
        });
     } finally {
       setLoading(false);
     }
   }, [toast]);


  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    let currentReceipts = [...receipts];
    if (debouncedClientName.trim() !== '') {
      currentReceipts = currentReceipts.filter((receipt) =>
        receipt.clientName.toLowerCase().includes(debouncedClientName.toLowerCase())
      );
    }
    if (debouncedDateFilter && isValid(debouncedDateFilter)) {
       const filterDateStr = format(debouncedDateFilter, 'yyyy-MM-dd');
        currentReceipts = currentReceipts.filter(receipt => {
            // Check against given date, received date, createdAt, or updatedAt
            let givenDateMatch = false;
            if (receipt.given?.date && isValid(parseISO(receipt.given.date))) {
                if (format(parseISO(receipt.given.date), 'yyyy-MM-dd') === filterDateStr) givenDateMatch = true;
            }
            if (givenDateMatch) return true;

            let receivedDateMatch = false;
            if (receipt.received?.date && isValid(parseISO(receipt.received.date))) {
                if (format(parseISO(receipt.received.date), 'yyyy-MM-dd') === filterDateStr) receivedDateMatch = true;
            }
            if (receivedDateMatch) return true;
            
            const createdAtDate = receipt.createdAt?.toDate();
            if (createdAtDate && isValid(createdAtDate) && format(createdAtDate, 'yyyy-MM-dd') === filterDateStr) return true;
            
            const updatedAtDate = receipt.updatedAt?.toDate();
            if (updatedAtDate && isValid(updatedAtDate) && format(updatedAtDate, 'yyyy-MM-dd') === filterDateStr) return true;
            
            return false; 
        });
    }
    setFilteredReceipts(currentReceipts);
  }, [debouncedClientName, debouncedDateFilter, receipts]); 

   const getStatusVariant = (status: 'complete' | 'incomplete' | 'empty'): 'default' | 'secondary' | 'destructive' | 'outline' => {
     switch (status) {
       case 'complete': return 'default'; 
       case 'incomplete': return 'secondary'; 
       case 'empty': return 'destructive'; 
       default: return 'outline';
     }
   };

  const handleViewReceipt = (receiptId: string) => {
    router.push(`/admin-bill/view?receiptId=${receiptId}`);
  };

  const handleEditReceipt = (receipt: AdminReceipt) => {
    router.push(`/admin-receipt/details?clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}&receiptId=${receipt.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-4 md:p-8">
      <Card className="w-full max-w-5xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Admin Bill - View Receipts</CardTitle>
          <CardDescription>View and manage admin receipts. Slow loading? Check Firestore index for 'AdminReceipts' on 'createdAt' (descending). See firestore.indexes.md.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input type="text" placeholder="Filter by Client Name" value={clientNameFilter} onChange={(e: ChangeEvent<HTMLInputElement>) => setClientNameFilter(e.target.value)} className="rounded-md"/>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-full md:w-[240px] justify-start text-left font-normal', !dateFilter && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by Date</span>}
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
                Loading admin receipts... If slow, ensure Firestore index for 'AdminReceipts' on 'createdAt' (descending) is active. Refer to firestore.indexes.md.
              </p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map((receipt) => {
                  const statusVariant = getStatusVariant(receipt.status);
                  const displayDate = receipt.updatedAt?.toDate() ?? receipt.createdAt?.toDate(); // Prefer updatedAt
                  return (
                    <li key={receipt.id} className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors">
                      <div className="mb-3 md:mb-0 md:flex-1">
                        <p className="font-semibold text-lg">{receipt.clientName}</p>
                        <p className="text-sm text-muted-foreground">ID: {receipt.id.substring(0,10)}...</p>
                         {displayDate && (<p className="text-sm text-muted-foreground">Last Updated: {format(displayDate, 'PPP p')}</p>)}
                      </div>
                       <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0">
                         <Badge variant={statusVariant} className="text-xs capitalize">{receipt.status}</Badge>
                         <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt.id)} className="flex items-center gap-1">
                            <Eye className="h-4 w-4" /> View
                         </Button>
                         <Button variant="outline" size="sm" onClick={() => handleEditReceipt(receipt)} className="flex items-center gap-1">
                           <Edit className="h-4 w-4" /> Edit
                         </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No admin receipts found for current filters. If loading was slow, check Firestore indexes for 'AdminReceipts' on 'createdAt' (descending). Refer to firestore.indexes.md.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
