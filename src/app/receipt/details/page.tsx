'use client';

import Layout from '@/components/Layout';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import {format} from 'date-fns';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

function ReceiptDetailsContent() {
  const searchParams = useSearchParams();
  const clientName = searchParams.get('clientName') || '[Client Name]';
  const [metal, setMetal] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState([
    {
      sNo: 1,
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
    newItems[index].netWt = newItems[index].grossWt - newItems[index].stoneWt;
    newItems[index].finalWt =
      newItems[index].netWt * (newItems[index].meltingTouch / 100);

    setItems(newItems);
  };

  const calculateTotal = (field: string) => {
    return items.reduce((acc, item) => acc + Number(item[field]), 0);
  };

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
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>

            <Select onValueChange={setMetal}>
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
              <Select onValueChange={setWeightUnit}>
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
                        value={item.itemName}
                        onChange={(e) =>
                          handleInputChange(index, 'itemName', e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        type="text"
                        value={item.tag}
                        onChange={(e) => handleInputChange(index, 'tag', e.target.value)}
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.grossWt}
                        onChange={(e) =>
                          handleInputChange(index, 'grossWt', parseFloat(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.stoneWt}
                        onChange={(e) =>
                          handleInputChange(index, 'stoneWt', parseFloat(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2 border">{item.netWt.toFixed(3)}</td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.meltingTouch}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            'meltingTouch',
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>
                    <td className="p-2 border">{item.finalWt.toFixed(3)}</td>
                    <td className="p-2 border">
                      <Input
                        type="number"
                        value={item.stoneAmt}
                        onChange={(e) =>
                          handleInputChange(index, 'stoneAmt', parseFloat(e.target.value))
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
                  <td className="p-2 border">{calculateTotal('netWt')}</td>
                  <td className="p-2 border"></td>
                  <td className="p-2 border">{calculateTotal('finalWt')}</td>
                  <td className="p-2 border">{calculateTotal('stoneAmt')}</td>
                </tr>
              </tbody>
            </table>
            <Button onClick={handleAddItem} className="mt-2">
              Add Item
            </Button>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 border rounded-md">
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
                      <td className="p-2 border">{item.netWt.toFixed(3)}</td>
                      <td className="p-2 border">{item.finalWt.toFixed(3)}</td>
                      <td className="p-2 border">{item.stoneAmt}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 border">Total</td>
                    <td className="p-2 border">{calculateTotal('grossWt')}</td>
                    <td className="p-2 border">{calculateTotal('stoneWt')}</td>
                    <td className="p-2 border">{calculateTotal('netWt')}</td>
                    <td className="p-2 border">{calculateTotal('finalWt')}</td>
                    <td className="p-2 border">{calculateTotal('stoneAmt')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Button>Create Receipt</Button>
        </CardContent>
      </Card>
    </div>
  );
}
