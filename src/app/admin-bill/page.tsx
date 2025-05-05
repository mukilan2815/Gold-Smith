'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { format, startOfDay, endOfDay, isValid } from 'date-fns';
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

// Interface matching the AdminReceipts structure in Firestore
interface AdminReceipt {
  id: string; // Firestore document ID
  clientId: string;
  clientName: string;
  dateGiven: string | null;
  given: any[]; // Define more specific type if needed
  dateReceived: string | null;
  received: any[] | null; // Can be null if not saved yet
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true);
      try {
        const receiptsRef = collection(db, 'AdminReceipts');
        // Order by creation date, newest first (optional)
        const q = query(receiptsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedReceipts: AdminReceipt[] = [];
        querySnapshot.forEach((doc) => {
          fetchedReceipts.push({ id: doc.id, ...doc.data() } as AdminReceipt);
        });
        setReceipts(fetchedReceipts);
        setFilteredReceipts(fetchedReceipts); // Initially show all
      } catch (error) {
        console.error("Error fetching admin receipts:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load receipts." });
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [toast]);

  // --- Filter Logic ---
  useEffect(() => {
    let currentReceipts = [...receipts];

    // Filter by Client Name
    if (clientNameFilter.trim() !== '') {
      currentReceipts = currentReceipts.filter((receipt) =>
        receipt.clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
      );
    }

    // Filter by Date (check if either dateGiven or dateReceived matches)
    if (dateFilter && isValid(dateFilter)) {
       const filterDateStr = format(dateFilter, 'yyyy-MM-dd');
        currentReceipts = currentReceipts.filter(receipt => {
            const givenDateStr = receipt.dateGiven ? format(new Date(receipt.dateGiven), 'yyyy-MM-dd') : null;
            const receivedDateStr = receipt.dateReceived ? format(new Date(receipt.dateReceived), 'yyyy-MM-dd') : null;
            return givenDateStr === filterDateStr || receivedDateStr === filterDateStr;
        });
    }


    setFilteredReceipts(currentReceipts);
  }, [clientNameFilter, dateFilter, receipts]);

  // --- Determine Receipt Status ---
  const getReceiptStatus = (receipt: AdminReceipt): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    const hasGiven = receipt.given && receipt.given.length > 0 && receipt.dateGiven;
    const hasReceived = receipt.received && receipt.received.length > 0 && receipt.dateReceived;

    if (hasGiven && hasReceived) {
      return { text: 'Completed', variant: 'default' }; // Use default for completed (often green/primary)
    } else if (hasGiven || hasReceived) {
      return { text: 'Incomplete', variant: 'secondary' }; // Use secondary for incomplete (yellow/grey)
    } else {
      return { text: 'Empty', variant: 'destructive' }; // Should ideally not happen if saved correctly
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
      <Card className="w-full max-w-5xl"> {/* Increased max-width */}
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
                    'w-full md:w-[240px] justify-start text-left font-normal', // Adjusted width
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
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4"> {/* Increased height */}
            {loading ? (
              <p className="text-muted-foreground text-center">Loading receipts...</p>
            ) : filteredReceipts.length > 0 ? (
              <ul className="space-y-3">
                {filteredReceipts.map((receipt) => {
                  const status = getReceiptStatus(receipt);
                  // Determine a display date (e.g., last updated or creation date)
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
                         <Badge variant={status.variant} className="text-xs"> {/* Smaller badge text */}
                           {status.text}
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