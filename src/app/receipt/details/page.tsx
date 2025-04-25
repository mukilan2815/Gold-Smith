'use client';

import Layout from '@/components/Layout';
import {useSearchParams, useRouter} from 'next/navigation';
import {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import {format, parseISO} from 'date-fns';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReceiptDetailsPage() {
  return (
    <Layout>
      <ReceiptDetailsContent />
    </Layout>
  );
}

function ReceiptDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {toast} = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);

  // Extract receipt details from search parameters
  const clientNameParam = searchParams.get('clientName') || '[Client Name]';
  const dateParam = searchParams.get('date');
  const metalParam = searchParams.get('metal');
  const weightParam = searchParams.get('weight');
  const weightUnitParam = searchParams.get('weightUnit');
  const itemsParam = searchParams.get('items');

  // Initialize state with values from URL parameters or defaults
  const [clientName, setClientName] = useState(clientNameParam);
  const [date, setDate] = useState<Date | undefined>(
    dateParam ? parseISO(dateParam) : undefined
  );
  const [metal, setMetal] = useState(metalParam || '');
  const [weight, setWeight] = useState(weightParam || '');
  const [weightUnit, setWeightUnit] = useState(weightUnitParam || '');
  const [items, setItems] = useState<any[]>(itemsParam ? JSON.parse(itemsParam) : []);

  // New state for managing edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (dateParam) {
      setDate(parseISO(dateParam));
    }
  }, [dateParam]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        sNo: items.length + 1,
        itemName: '',
        tag: '',
        grossWt: 0,
        stoneWt: 0,
        netWt: 0,
        meltingTouch: 0,
        finalWt: 0,
        stoneAmt: 0,
      },
    ]);
  };

  const handleInputChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Recalculate Net Weight and Final Weight
    if (typeof newItems[index].grossWt === 'number' && typeof newItems[index].stoneWt === 'number') {
      newItems[index].netWt = newItems[index].grossWt - newItems[index].stoneWt;
    } else {
      newItems[index].netWt = 0;
    }

    if (typeof newItems[index].netWt === 'number' && typeof newItems[index].meltingTouch === 'number') {
      newItems[index].finalWt = newItems[index].netWt * (newItems[index].meltingTouch / 100);
    } else {
      newItems[index].finalWt = 0;
    }

    setItems(newItems);
  };

  const calculateTotal = (field: string) => {
    return items.reduce((acc, item) => acc + Number(item[field]), 0);
  };

  const handleEditReceipt = () => {
    setIsEditMode(true);
  };

  const handleSaveReceipt = () => {
    // Basic validation
    if (!date) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a date.',
      });
      return;
    }

    if (!metal) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a metal type.',
      });
      return;
    }

    if (!weight || !weightUnit) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter the weight and select a unit.',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please add at least one item to the receipt.',
      });
      return;
    }

    // Create receipt object
    const updatedReceipt = {
      clientName: clientName,
      date: date.toISOString(), // Store date as ISO string
      metal: metal,
      weight: weight,
      weightUnit: weightUnit,
      items: items,
      totalGrossWt: calculateTotal('grossWt'),
      totalStoneWt: calculateTotal('stoneWt'),
      totalNetWt: calculateTotal('netWt'),
      totalFinalWt: calculateTotal('finalWt'),
      totalStoneAmt: calculateTotal('stoneAmt'),
    };

    // Retrieve existing receipts from localStorage
    const existingReceipts = localStorage.getItem('receipts');
    let receipts = existingReceipts ? JSON.parse(existingReceipts) : [];

    // Find the index of the receipt to update (matching clientName and date)
    const receiptIndex = receipts.findIndex(
      (receipt) =>
        receipt.clientName === clientNameParam && receipt.date === dateParam
    );

    if (receiptIndex !== -1) {
      // Update the receipt in the array
      receipts[receiptIndex] = updatedReceipt;
    } else {
      // If receipt doesn't exist, add the new receipt to the array
      receipts.push(updatedReceipt);
    }

    // Save the updated receipts array back to localStorage
    localStorage.setItem('receipts', JSON.stringify(receipts));

    toast({
      title: 'Receipt Saved!',
      description: 'The receipt has been saved successfully.',
    });

    setIsEditMode(false);
    // Redirect to bill page
    router.push('/bill');
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();

    // Define colors
    const primaryColor = '#FFD700'; // Gold
    const secondaryColor = '#FFFDD0'; // Cream
    const textColor = '#000000'; // Black
    const accentColor = '#008080'; // Teal

    // Add background color
    doc.setFillColor(secondaryColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

    // Set text color
    doc.setTextColor(textColor);

    // Title
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = 'Goldsmith Receipt';
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor);  // Title color in Black
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 10);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);

    doc.text(`Name: ${clientName}`, 10, 20);
    doc.text(`Date: ${date ? format(date, 'PPP') : 'No date selected'}`, 10, 30);
    doc.text(`Metals: ${metal || 'No metal selected'}`, 10, 40);
    doc.text(
      `Weight: ${weight ? `${weight} ${weightUnit || 'Unit not selected'}` : 'Weight not specified'}`,
      10,
      50
    );

    // Prepare table data for items
    const tableColumn = ['Item Name', 'Gross (wt)', 'Stone (wt)', 'Net (wt)', 'Final (wt)', 'Stone Amt'];
    const tableRows = items.map((item) => [
      item.itemName,
      item.grossWt,
      item.stoneWt,
      item.netWt?.toFixed(3) || '0.000',
      item.finalWt?.toFixed(3) || '0.000',
      item.stoneAmt,
    ]);

    // Calculate totals
    const totalGrossWt = calculateTotal('grossWt');
    const totalStoneWt = calculateTotal('stoneWt');
    const totalNetWt = calculateTotal('netWt');
    const totalFinalWt = calculateTotal('finalWt');
    const totalStoneAmt = calculateTotal('stoneAmt');

    // Add total row
    tableRows.push([
      'Total',
      totalGrossWt,
      totalStoneWt,
      totalNetWt.toFixed(3),
      totalFinalWt.toFixed(3),
      totalStoneAmt,
    ]);

    // Define table style
    const tableStyle = {
      headStyles: {
        fillColor: '#ADD8E6', // Light blue for header
        textColor: textColor,
        fontStyle: 'bold',
        fontSize: 12,
        lineWidth: 0.1,
        lineColor: textColor,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 10,
        lineWidth: 0.1,
        lineColor: textColor,
      },
      alternateRowStyles: {
        fillColor: '#F0F8FF', // AliceBlue for alternate rows
      },
      tableLineColor: textColor,
      tableLineWidth: 0.1,
      startY: 60,
      margin: { horizontal: 10 },
    };

    // Add the table to the PDF
    (autoTable as any)(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      styles: tableStyle,
    });

    doc.save(`receipt_${clientName}_${format(date || new Date(), 'yyyyMMdd')}.pdf`);
  };

  const isNewReceipt = !searchParams.get('date');

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-secondary p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Receipt Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[200px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate} // Update the date state
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>

            <Select onValueChange={setMetal} value={metal}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Metal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="Weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <Select onValueChange={setWeightUnit} value={weightUnit}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border border-collapse border-border">
              <thead>
                <tr>
                  <th className="p-2 border">S.No</th>
                  <th className="p-2 border">Item Name</th>
                  <th className="p-2 border">Tag</th>
                  <th className="p-2 border">Gross (wt)</th>
                  <th className="p-2 border">Stone (wt)</th>
                  <th className="p-2 border">Net (wt)</th>
                  <th className="p-2 border">Melting / Touch</th>
                  <th className="p-2 border">Final (wt)</th>
                  <th className="p-2 border">Stone Amt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2 border">{index + 1}</td>
                    <td className="p-2 border">
                      <Input
                        type="text"
                        value={item.itemName || ''}
                        onChange={(e) =>
                          handleInputChange(index, 'itemName', e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        type="text"
                        value={item.tag || ''}
                        onChange={(e) => handleInputChange(index, 'tag', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.grossWt !== null ? item.grossWt : ''}
                        onChange={(e) =>
                          handleInputChange(index, 'grossWt', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.stoneWt !== null ? item.stoneWt : ''}
                        onChange={(e) =>
                          handleInputChange(index, 'stoneWt', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-2 border">{item.netWt?.toFixed(3) || '0.000'}</td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.meltingTouch !== null ? item.meltingTouch : ''}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            'meltingTouch',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="p-2 border">{item.finalWt?.toFixed(3) || '0.000'}</td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.stoneAmt !== null ? item.stoneAmt : ''}
                        onChange={(e) =>
                          handleInputChange(index, 'stoneAmt', parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="p-2 border"></td>
                  <td className="p-2 border">Total</td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border">{calculateTotal('grossWt')}</td>
                  <td className="p-2 border">{calculateTotal('stoneWt')}</td>
                  <td className="p-2 border">{calculateTotal('netWt')?.toFixed(3) || '0.000'}</td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border">{calculateTotal('finalWt')?.toFixed(3) || '0.000'}</td>
                  <td className="p-2 border">{calculateTotal('stoneAmt')}</td>
                </tr>
              </tbody>
            </table>
            <Button onClick={handleAddItem} className="mt-2">
              Add Item
            </Button>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 border rounded-md" ref={summaryRef}>
            <h3 className="text-xl font-semibold">Summary</h3>
            <p>Name: {clientName}</p>
            <p>Date: {date ? format(date, 'PPP') : 'No date selected'}</p>
            <p>Metals: {metal || 'No metal selected'}</p>
            <p>
              Weight:{' '}
              {weight
                ? `${weight} ${weightUnit || 'Unit not selected'}`
                : 'Weight not specified'}
            </p>
            {/* Table Summary */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-collapse border-border">
                <thead>
                  <tr>
                    <th className="p-2 border">Item Name</th>
                    <th className="p-2 border">Gross (wt)</th>
                    <th className="p-2 border">Stone (wt)</th>
                    <th className="p-2 border">Net (wt)</th>
                    <th className="p-2 border">Final (wt)</th>
                    <th className="p-2 border">Stone Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2 border">{item.itemName}</td>
                      <td className="p-2 border">{item.grossWt}</td>
                      <td className="p-2 border">{item.stoneWt}</td>
                      <td className="p-2 border">{item.netWt?.toFixed(3) || '0.000'}</td>
                      <td className="p-2 border">{item.finalWt?.toFixed(3) || '0.000'}</td>
                      <td className="p-2 border">{item.stoneAmt}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 border">Total</td>
                    <td className="p-2 border">{calculateTotal('grossWt')}</td>
                    <td className="p-2 border">{calculateTotal('stoneWt')}</td>
                    <td className="p-2 border">{calculateTotal('netWt')?.toFixed(3) || '0.000'}</td>
                    <td className="p-2 border">{calculateTotal('finalWt')?.toFixed(3) || '0.000'}</td>
                    <td className="p-2 border">{calculateTotal('stoneAmt')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {isNewReceipt ? (
            <Button onClick={handleSaveReceipt}>Create Receipt</Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleEditReceipt}>Edit Receipt</Button>
              <Button onClick={downloadReceipt}>Download Receipt</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
