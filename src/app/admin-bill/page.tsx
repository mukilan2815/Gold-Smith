'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, Timestamp, DocumentData, limit } from 'firebase/firestore'; 
import { format, isValid, parseISO, startOfDay, endOfDay } from 'date-fns'; 
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

interface GivenData {
    date: string | null;
    items: any[];
    totalPureWeight: number;
    total: number;
}

interface ReceivedData {
    date: string | null;
    items: any[];
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

export default function AdminBillPage() {
  return (
    <Layout>
      <AdminBillContent />
    </Layout>
  );
}

function AdminBillContent() {
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<AdminReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();

  const debouncedClientName = useDebounce(clientNameFilter, 300); 
  const debouncedDateFilter = useDebounce(dateFilter, 300);


   const fetchReceipts = async () => {
     setLoading(true);
     try {
       const receiptsRef = collection(db, 'AdminReceipts');
       const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(50)); 
       const querySnapshot = await getDocs(q);
       const fetchedReceipts: AdminReceipt[] = [];
       querySnapshot.forEach((doc) => {
         const data = doc.data() as DocumentData; 
         const givenDateStr = data.given?.date;
         const receivedDateStr = data.received?.date;

         fetchedReceipts.push({
           id: doc.id,
           clientId: data.clientId || '',
           clientName: data.clientName || 'Unknown Client',
           given: { ...data.given, date: givenDateStr } || null, 
           received: { ...data.received, date: receivedDateStr } || null, 
           status: data.status || 'empty',
           createdAt: data.createdAt || Timestamp.now(), 
           updatedAt: data.updatedAt || Timestamp.now(), 
         } as AdminReceipt); 
       });
       setReceipts(fetchedReceipts);
     } catch (error) {
       console.error("Error fetching admin receipts:", error);
       toast({ variant: "destructive", title: "Error fetching receipts", description: "Could not load admin receipts. This query sorts by 'createdAt'. Ensure all 'AdminReceipts' documents have this field as a Firestore Timestamp and a descending index exists on 'createdAt' in your Firestore console." });
     } finally {
       setLoading(false);
     }
   };


  useEffect(() => {
    fetchReceipts();
  }, []); 

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
            let givenDateStr = null;
            if (receipt.given?.date && typeof receipt.given.date === 'string') {
                try {
                    const parsedDate = parseISO(receipt.given.date);
                    if (isValid(parsedDate)) {
                        givenDateStr = format(parsedDate, 'yyyy-MM-dd');
                    }
                } catch (e) { console.warn('Invalid given date format:', receipt.given.date); }
            }
            if (givenDateStr === filterDateStr) return true;

            let receivedDateStr = null;
            if (receipt.received?.date && typeof receipt.received.date === 'string') {
                 try {
                     const parsedDate = parseISO(receipt.received.date);
                     if (isValid(parsedDate)) {
                         receivedDateStr = format(parsedDate, 'yyyy-MM-dd');
                     }
                 } catch (e) { console.warn('Invalid received date format:', receipt.received.date); }
            }
            if (receivedDateStr === filterDateStr) return true;

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
          <CardDescription>View and manage admin receipts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              type="text"
              placeholder="Filter by Client Name"
              value={clientNameFilter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setClientNameFilter(e.target.value)} 
              className="rounded-md"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full md:w-[240px] justify-start text-left font-normal',
                    !dateFilter && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter} 
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            {loading ? (
              <p className="text-muted-foreground text-center">
                Loading admin receipts... This query sorts by 'createdAt'. For optimal performance, ensure all 'AdminReceipts' documents have a 'createdAt' field (Firestore Timestamp type) and that a descending index exists on 'createdAt' in your Firestore console. If loading is slow, these are the primary areas to investigate.
              </p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map((receipt) => {
                  const statusVariant = getStatusVariant(receipt.status);
                  const displayDate = receipt.updatedAt?.toDate() ?? receipt.createdAt?.toDate();

                  return (
                    <li
                      key={receipt.id}
                      className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="mb-3 md:mb-0 md:flex-1">
                        <p className="font-semibold text-lg">
                          {receipt.clientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {receipt.id}
                        </p>
                         {displayDate && (
                           <p className="text-sm text-muted-foreground">
                             Last Updated: {format(displayDate, 'PPP p')}
                           </p>
                         )}
                      </div>
                       <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0">
                         <Badge variant={statusVariant} className="text-xs capitalize"> 
                           {receipt.status}
                         </Badge>
                         <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReceipt(receipt.id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" /> View
                         </Button>
                         <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditReceipt(receipt)}
                            className="flex items-center gap-1"
                          >
                           <Edit className="h-4 w-4" /> Edit
                         </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No admin receipts found matching your criteria. If loading took long, please check Firestore indexes and data consistency for the 'createdAt' field.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
