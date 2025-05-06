
'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, Timestamp, DocumentData, limit } from 'firebase/firestore'; // Added DocumentData, limit
import { format, isValid, parseISO, startOfDay, endOfDay } from 'date-fns'; // Added startOfDay, endOfDay
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

// Interface matching the NEW AdminReceipts structure in Firestore
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
  id: string; // Firestore document ID
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

   // --- Fetch Receipts from Firestore ---
   const fetchReceipts = async () => {
     setLoading(true);
     try {
       const receiptsRef = collection(db, 'AdminReceipts');
       // Order by creation time and limit initial fetch
       const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(50)); // Limit to 50
       const querySnapshot = await getDocs(q);
       const fetchedReceipts: AdminReceipt[] = [];
       querySnapshot.forEach((doc) => {
          // Ensure data matches the AdminReceipt interface, provide defaults if needed
         const data = doc.data() as DocumentData; // Use DocumentData initially
         fetchedReceipts.push({
           id: doc.id,
           clientId: data.clientId || '',
           clientName: data.clientName || 'Unknown Client',
           given: data.given || null,
           received: data.received || null,
           status: data.status || 'empty',
           createdAt: data.createdAt || Timestamp.now(), // Provide default timestamp
           updatedAt: data.updatedAt || Timestamp.now(), // Provide default timestamp
         } as AdminReceipt); // Cast to AdminReceipt
       });
       setReceipts(fetchedReceipts);
       // setFilteredReceipts(fetchedReceipts); // Moved to filter useEffect
     } catch (error) {
       console.error("Error fetching admin receipts:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not load receipts." });
     } finally {
       setLoading(false);
     }
   };


  useEffect(() => {
    fetchReceipts();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Fetch receipts on initial load

  // --- Filter Logic ---
  useEffect(() => {
    let currentReceipts = [...receipts];

    // Filter by Client Name
    if (clientNameFilter.trim() !== '') {
      currentReceipts = currentReceipts.filter((receipt) =>
        receipt.clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
      );
    }

    // Filter by Date (check if given.date OR received.date matches the selected date)
    if (dateFilter && isValid(dateFilter)) {
       const filterDateStr = format(dateFilter, 'yyyy-MM-dd');
        currentReceipts = currentReceipts.filter(receipt => {
            // Check given date
            const givenDate = receipt.given?.date ? parseISO(receipt.given.date) : null;
            const givenDateStr = givenDate && isValid(givenDate) ? format(givenDate, 'yyyy-MM-dd') : null;
            if (givenDateStr === filterDateStr) return true;

            // Check received date
            const receivedDate = receipt.received?.date ? parseISO(receipt.received.date) : null;
            const receivedDateStr = receivedDate && isValid(receivedDate) ? format(receivedDate, 'yyyy-MM-dd') : null;
            if (receivedDateStr === filterDateStr) return true;

            return false; // No match
        });
    }


    setFilteredReceipts(currentReceipts);
  }, [clientNameFilter, dateFilter, receipts]); // Rerun filter when filters or base receipts change

   // --- Determine Receipt Status Variant for Badge ---
   const getStatusVariant = (status: 'complete' | 'incomplete' | 'empty'): 'default' | 'secondary' | 'destructive' | 'outline' => {
     switch (status) {
       case 'complete': return 'default'; // Green/Success or primary color
       case 'incomplete': return 'secondary'; // Yellow/Warning or secondary color
       case 'empty': return 'destructive'; // Red/Error
       default: return 'outline';
     }
   };

  // --- Navigation Handlers ---
  const handleViewReceipt = (receiptId: string) => {
    router.push(`/admin-bill/view?receiptId=${receiptId}`);
  };

  const handleEditReceipt = (receipt: AdminReceipt) => {
    // Navigate to the details page with client info and receipt ID for editing
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
          {/* Filter Inputs */}
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

          {/* Receipt List */}
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            {loading ? (
              <p className="text-muted-foreground text-center">Loading receipts...</p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map((receipt) => {
                  const statusVariant = getStatusVariant(receipt.status);
                  // Use updatedAt first, then createdAt for display date
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
                         <Badge variant={statusVariant} className="text-xs capitalize"> {/* Capitalize status text */}
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
              <p className="text-muted-foreground text-center">No receipts found matching your criteria.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
