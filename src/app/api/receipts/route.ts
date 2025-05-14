import { NextRequest, NextResponse } from 'next/server';
 import mongoose from 'mongoose';
import { createClientBill, getAllClientBills, getClientBillsByClientId, searchClientBills } from '@/lib/services/mongooseServices';

// GET /api/receipts - Get all receipts or filter by clientId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const clientName = searchParams.get('clientName') || undefined;
    const metalType = searchParams.get('metalType') || undefined;
    
    // Parse date filters if provided
    let fromDate, toDate;
    if (searchParams.get('fromDate')) {
      fromDate = new Date(searchParams.get('fromDate') as string);
    }
    if (searchParams.get('toDate')) {
      toDate = new Date(searchParams.get('toDate') as string);
    }
    
    // If any search params exist, use search function
    if (clientId || clientName || metalType || fromDate || toDate) {
      const receipts = await searchClientBills({ 
        clientId, 
        clientName, 
        metalType,
        fromDate,
        toDate
      });
      
      // Transform MongoDB documents to plain objects with id instead of _id
      const responseData = receipts.map(receipt => {
        const receiptObj = receipt.toObject();
        return {
          ...receiptObj,
          id: receiptObj._id.toString()
        };
      });
      
      // Sort by issueDate in descending order (newest first)
      responseData.sort((a, b) => {
        const dateA = a.issueDate ? new Date(a.issueDate) : new Date(0);
        const dateB = b.issueDate ? new Date(b.issueDate) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      return NextResponse.json(responseData);
    }
    
    // Otherwise return all receipts
    const receipts = await getAllClientBills();
    
    // Transform MongoDB documents to plain objects with id instead of _id
    const responseData = receipts.map(receipt => {
      const receiptObj = receipt.toObject();
      return {
        ...receiptObj,
        id: receiptObj._id.toString()
      };
    });
    
    // Sort by issueDate in descending order (newest first)
    responseData.sort((a, b) => {
      const dateA = a.issueDate ? new Date(a.issueDate) : new Date(0);
      const dateB = b.issueDate ? new Date(b.issueDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

// POST /api/receipts - Create a new receipt
export async function POST(request: NextRequest) {
  try {
    const receiptData = await request.json();
    
    // Validate required fields
    if (!receiptData.clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      );
    }
    
    if (!receiptData.metalType) {
      return NextResponse.json(
        { error: 'Missing required field: metalType' },
        { status: 400 }
      );
    }
    
    if (!receiptData.issueDate) {
      return NextResponse.json(
        { error: 'Missing required field: issueDate' },
        { status: 400 }
      );
    }
    
    // Validate client info structure
    if (!receiptData.clientInfo || !receiptData.clientInfo.clientName) {
      return NextResponse.json(
        { error: 'Missing client information: clientName is required' },
        { status: 400 }
      );
    }
    
    // Validate items array
    if (!Array.isArray(receiptData.items) || receiptData.items.length === 0) {
      return NextResponse.json(
        { error: 'Receipt must contain at least one item' },
        { status: 400 }
      );
    }
    
    // Validate clientId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiptData.clientId)) {
      return NextResponse.json(
        { error: 'Invalid clientId format' },
        { status: 400 }
      );
    }
    
    // Convert issueDate string to Date object if needed
    if (typeof receiptData.issueDate === 'string') {
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
    
    try {
      const newReceipt = await createClientBill(receiptData);
      
      // Transform MongoDB document to a plain object
      const receiptObj = newReceipt.toObject();
      
      // Convert _id to id for frontend consistency
      const responseData = {
        ...receiptObj,
        id: receiptObj._id.toString(),
      };
      
      return NextResponse.json(responseData, { status: 201 });
    } catch (dbError: any) {
      console.error('Database error creating receipt:', dbError);
      
      // Handle specific MongoDB validation errors
      if (dbError.name === 'ValidationError') {
        const validationErrors = Object.keys(dbError.errors).map(field => {
          return `${field}: ${dbError.errors[field].message}`;
        }).join(', ');
        
        return NextResponse.json(
          { error: `Validation error: ${validationErrors}` },
          { status: 400 }
        );
      }
      
      // Handle duplicate key errors
      if (dbError.code === 11000) {
        return NextResponse.json(
          { error: 'A receipt with this information already exists' },
          { status: 409 }
        );
      }
      
      throw dbError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create receipt' },
      { status: 500 }
    );
  }
}