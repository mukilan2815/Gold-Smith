import { NextRequest, NextResponse } from 'next/server';
import { getClientBillById, updateClientBill, deleteClientBill } from '@/lib/services/mongooseServices';

// GET /api/receipts/[id] - Get a receipt by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const receipt = await getClientBillById(params.id);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }
    
    // Transform MongoDB document to a plain object
    const receiptObj = receipt.toObject();
    
    // Convert _id to id for frontend consistency
    const responseData = {
      ...receiptObj,
      id: receiptObj._id.toString(),
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}

// PUT /api/receipts/[id] - Update a receipt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const receiptData = await request.json();
    
    // Validate required fields
    if (receiptData.clientId === undefined || receiptData.metalType === undefined || receiptData.issueDate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate client info structure if it's being updated
    if (receiptData.clientInfo && !receiptData.clientInfo.clientName) {
      return NextResponse.json(
        { error: 'Missing client name in client information' },
        { status: 400 }
      );
    }
    
    // Validate items array if it's being updated
    if (receiptData.items !== undefined && (!Array.isArray(receiptData.items) || receiptData.items.length === 0)) {
      return NextResponse.json(
        { error: 'Receipt must contain at least one item' },
        { status: 400 }
      );
    }
    
    // Convert issueDate string to Date object if needed
    if (receiptData.issueDate && typeof receiptData.issueDate === 'string') {
      receiptData.issueDate = new Date(receiptData.issueDate);
    }
    
    // Ensure all numeric fields are properly converted to numbers
    if (receiptData.items) {
      receiptData.items = receiptData.items.map(item => ({
        ...item,
        grossWt: typeof item.grossWt === 'string' ? parseFloat(item.grossWt) || 0 : item.grossWt,
        stoneWt: typeof item.stoneWt === 'string' ? parseFloat(item.stoneWt) || 0 : item.stoneWt,
        meltingTouch: typeof item.meltingTouch === 'string' ? parseFloat(item.meltingTouch) || 0 : item.meltingTouch,
        stoneAmt: typeof item.stoneAmt === 'string' ? parseFloat(item.stoneAmt) || 0 : item.stoneAmt
      }));
    }
    
    const updatedReceipt = await updateClientBill(params.id, receiptData);
    
    if (!updatedReceipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }
    
    // Transform MongoDB document to a plain object
    const receiptObj = updatedReceipt.toObject();
    
    // Convert _id to id for frontend consistency
    const responseData = {
      ...receiptObj,
      id: receiptObj._id.toString(),
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts/[id] - Delete a receipt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteClientBill(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Receipt not found or could not be deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}