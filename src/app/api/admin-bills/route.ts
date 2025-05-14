import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET handler to fetch admin bills with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientName = searchParams.get('clientName');
    const date = searchParams.get('date');
    const clientId = searchParams.get('clientId');
    const receiptId = searchParams.get('receiptId');

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Build query based on provided filters
    const query: any = {};
    
    if (clientName) query.clientName = { $regex: clientName, $options: 'i' };
    if (clientId) query.clientId = clientId;
    
    // Handle specific receipt ID request
    if (receiptId) {
      try {
        query._id = new ObjectId(receiptId);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid receipt ID format' },
          { status: 400 }
        );
      }
    }
    
    // Handle date filtering if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Check for date in given or received sections, or in created/updated dates
      query.$or = [
        { 'given.date': { $gte: startDate, $lte: endDate } },
        { 'received.date': { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } }
      ];
    }

    // If requesting a specific receipt
    if (receiptId) {
      const adminReceipt = await db.collection('AdminReceipts').findOne(query);
      
      if (!adminReceipt) {
        return NextResponse.json(
          { error: 'Admin receipt not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(adminReceipt, { status: 200 });
    }

    // Fetch admin receipts from MongoDB
    const adminReceipts = await db
      .collection('AdminReceipts')
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(adminReceipts, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin bills' },
      { status: 500 }
    );
  }
}