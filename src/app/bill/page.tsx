
'use client';

import { useState, useEffect, ChangeEvent } from 'react'; // Added ChangeEvent
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc, Timestamp, limit } from 'firebase/firestore'; // Added Timestamp, deleteDoc, doc, limit
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns'; // Added isValid, startOfDay, endOfDay
import { Calendar as CalendarIcon, Trash2, Eye } from 'lucide-react'; // Added Trash2, Eye

import Layout from '@/components/Layout';
import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';


// Interface matching the ClientReceipts structure in Firestore
interface ClientReceipt {
  id: string; // Firestore document ID
  clientId: string;
  clientName: string;
  shopName?: string; // Optional, but good for display
  phoneNumber?: string; // Optional, but good for display
  metalType: string;
  issueDate: string; // ISO string date
  tableData: any[]; // Define more specific type if needed
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number; // Make stoneWt optional as it might not exist in older docs
  };
  createdAt?: Timestamp; // Firestore Timestamp
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
  const { toast } = useToast();

  // --- Fetch Receipts from Firestore ---
  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const receiptsRef = collection(db, 'ClientReceipts'); // Fetch from ClientReceipts
      // Order by creation date, newest first, and limit
      const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(50)); // Limit to 50
      const querySnapshot = await getDocs(q);
      const fetchedReceipts: ClientReceipt[] = [];
      querySnapshot.forEach((doc) => {
        fetchedReceipts.push({ id: doc.id, ...doc.data() } as ClientReceipt);
      });
      setReceipts(fetchedReceipts);
      // setFilteredReceipts(fetchedReceipts); // Moved to filter useEffect
    } catch (error) {
      console.error("Error fetching client receipts:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load receipts." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Changed dependency to [] to fetch on mount

  // --- Filter Logic ---
  useEffect(() => {
    let currentReceipts = [...receipts];

    // Filter by Shop Name (if shopName exists)
    if (shopNameFilter.trim() !== '') {
      currentReceipts = currentReceipts.filter((receipt) =>
        receipt.shopName?.toLowerCase().includes(shopNameFilter.toLowerCase())
      );
    }

    // Filter by Client Name
    if (clientNameFilter.trim() !== '') {
      currentReceipts = currentReceipts.filter((receipt) =>
        receipt.clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
      );
    }

    // Filter by Phone Number (if phoneNumber exists)
    if (phoneNumberFilter.trim() !== '') {
      currentReceipts = currentReceipts.filter((receipt) =>
        receipt.phoneNumber?.includes(phoneNumberFilter)
      );
    }

    // Filter by Issue Date
    if (dateFilter && isValid(dateFilter)) {
        const filterDateStr = format(dateFilter, 'yyyy-MM-dd');
        currentReceipts = currentReceipts.filter(receipt => {
            if (!receipt.issueDate) return false; // Skip receipts without an issue date
            try {
                 // Parse ISO string date from Firestore before formatting
                const issueDate = parseISO(receipt.issueDate);
                // Check if parsing was successful and the date is valid
                return isValid(issueDate) && format(issueDate, 'yyyy-MM-dd') === filterDateStr;
            } catch (e) {
                console.warn(`Invalid date format for receipt ${receipt.id}: ${receipt.issueDate}`);
                return false; // Treat invalid date formats as non-matching
            }
        });
    }

    setFilteredReceipts(currentReceipts);
  }, [shopNameFilter, clientNameFilter, phoneNumberFilter, dateFilter, receipts]); // Rerun when filters or base receipts change

  // --- Navigation Handlers ---
  const handleViewReceipt = (receipt: ClientReceipt) => {
     // Navigate to the details page, passing the Firestore receipt ID
     router.push(`/receipt/details?clientId=${receipt.clientId}&clientName=${encodeURIComponent(receipt.clientName)}&receiptId=${receipt.id}`);
  };


 const handleDeleteReceipt = async (receiptToDelete: ClientReceipt) => {
    try {
      const receiptRef = doc(db, 'ClientReceipts', receiptToDelete.id); // Reference by ID
      await deleteDoc(receiptRef);
      // Fetch receipts again after deletion
       await fetchReceipts(); // Refetch data to update UI
      toast({ title: 'Success', description: `Receipt for ${receiptToDelete.clientName} deleted.` });
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete receipt.' });
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
          {/* Filter Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              type="text"
              placeholder="Filter by Shop Name"
              value={shopNameFilter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setShopNameFilter(e.target.value)}
               className="rounded-md"
            />
            <Input
              type="text"
              placeholder="Filter by Client Name"
              value={clientNameFilter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setClientNameFilter(e.target.value)}
               className="rounded-md"
            />
            <Input
              type="text" // Keep as text for flexibility
              placeholder="Filter by Phone Number"
              value={phoneNumberFilter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPhoneNumberFilter(e.target.value)}
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
                  {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by Issue Date</span>}
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
                   let formattedIssueDate = 'Invalid Date';
                   if (receipt.issueDate && isValid(parseISO(receipt.issueDate))) {
                       try {
                           formattedIssueDate = format(parseISO(receipt.issueDate), 'PPP');
                       } catch (e) {
                            console.warn(`Invalid date format for receipt ${receipt.id}: ${receipt.issueDate}`);
                       }
                   }

                  return (
                  <li
                    key={receipt.id} // Use Firestore document ID as key
                    className="border rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mb-3 md:mb-0 md:flex-1">
                      <p className="font-semibold text-lg">
                        {receipt.clientName}
                         {receipt.shopName && <span className="text-sm text-muted-foreground"> ({receipt.shopName})</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Issue Date: {formattedIssueDate}
                      </p>
                       <p className="text-sm text-muted-foreground">
                         Metal: {receipt.metalType}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         ID: {receipt.id}
                       </p>
                    </div>
                     <div className="flex items-center gap-2 mt-2 md:mt-0"> {/* Button container */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt(receipt)}
                        className="flex items-center gap-1"
                       >
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
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will delete
                              the receipt permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteReceipt(receipt)}
                              className={cn(buttonVariants({ variant: "destructive" }))} // Style delete button
                            >
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
              <p className="text-muted-foreground text-center">No receipts found matching your criteria.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
