'use client';

import Layout from '@/components/Layout';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

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
  const [receipts, setReceipts] = useState<any[]>([]);

  useEffect(() => {
    // Load receipts from localStorage
    const storedReceipts = localStorage.getItem('receipts');
    if (storedReceipts) {
      setReceipts(JSON.parse(storedReceipts));
    }
  }, []);

  const filteredReceipts = receipts.filter((receipt) => {
    return (
      receipt.clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Receipts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <strong>Date:</strong> {receipt.date}
                      </p>
                      {/* Display other receipt details as needed */}
                    </div>
                    <Button onClick={() => console.log('View Receipt Clicked')}>
                      View Receipt
                    </Button>
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
