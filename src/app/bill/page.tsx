'use client';

import Layout from '@/components/Layout';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useRouter} from 'next/navigation';
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
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import {format, parseISO} from 'date-fns';

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
  const [receipts, setReceipts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load receipts from localStorage
    const storedReceipts = localStorage.getItem('receipts');
    if (storedReceipts) {
      setReceipts(JSON.parse(storedReceipts));
    }
  }, []);

  const filteredReceipts = receipts.filter((receipt) => {
    const shopNameMatch = receipt.shopName
      ? receipt.shopName.toLowerCase().includes(shopNameFilter.toLowerCase())
      : true;
    const clientNameMatch = receipt.clientName
      ? receipt.clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
      : true;
    const phoneNumberMatch = receipt.phoneNumber
      ? receipt.phoneNumber.includes(phoneNumberFilter)
      : true;

    const dateMatch = dateFilter
      ? format(dateFilter, 'yyyy-MM-dd') ===
        format(parseISO(receipt.date), 'yyyy-MM-dd')
      : true;

    return shopNameMatch && clientNameMatch && phoneNumberMatch && dateMatch;
  });

  const handleViewReceipt = (receipt: any) => {
    // Navigate to a new page to display the receipt details
    router.push(
      `/receipt/details?clientName=${receipt.clientName}&date=${receipt.date}&metal=${receipt.metal}&weight=${receipt.weight}&weightUnit=${receipt.weightUnit}&items=${JSON.stringify(
        receipt.items
      )}`
    );
  };

  const handleDeleteReceipt = (receiptToDelete: any) => {
    // Delete receipt from localStorage
    const updatedReceipts = receipts.filter(
      (r) =>
        r.date !== receiptToDelete.date ||
        r.clientName !== receiptToDelete.clientName
    );
    localStorage.setItem('receipts', JSON.stringify(updatedReceipts));
    setReceipts(updatedReceipts);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Receipts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Shop Name"
              value={shopNameFilter}
              onChange={(e) => setShopNameFilter(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Client Name"
              value={clientNameFilter}
              onChange={(e) => setClientNameFilter(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Phone Number"
              value={phoneNumberFilter}
              onChange={(e) => setPhoneNumberFilter(e.target.value)}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[200px] justify-start text-left font-normal',
                    !dateFilter && 'text-muted-foreground'
                  )}
                >
                  {dateFilter ? format(dateFilter, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Receipt List */}
          <div>
            {filteredReceipts.length > 0 ? (
              <ul>
                {filteredReceipts.map((receipt, index) => (
                  <li
                    key={index}
                    className="border rounded-md p-4 mb-2 flex justify-between items-center"
                  >
                    <div>
                      <p>
                        <strong>Client Name:</strong> {receipt.clientName}
                      </p>
                      <p>
                        <strong>Date:</strong> {format(parseISO(receipt.date), 'PPP')}
                      </p>
                      {/* Display other receipt details as needed */}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewReceipt(receipt)}>
                        View Receipt
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will delete
                              the receipt permanently from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteReceipt(receipt)}
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No receipts found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

