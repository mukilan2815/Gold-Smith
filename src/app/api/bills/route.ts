import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET handler to fetch client bills with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopName = searchParams.get('shopName');
    const clientName = searchParams.get('clientName');
    const phoneNumber = searchParams.get('phoneNumber');
    const issueDate = searchParams.get('issueDate');
    const clientId = searchParams.get('clientId');

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Build query based on provided filters
    const query: any = {};
    
    if (shopName) query.shopName = { $regex: shopName, $options: 'i' };
    if (clientName) query.clientName = { $regex: clientName, $options: 'i' };
    if (phoneNumber) query.phoneNumber = { $regex: phoneNumber, $options: 'i' };
    if (clientId) query.clientId = clientId;
    
    // Handle date filtering if provided
    if (issueDate) {
      const startDate = new Date(issueDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(issueDate);
      endDate.setHours(23, 59, 59, 999);
      
      query.issueDate = { $gte: startDate, $lte: endDate };
    }

    // Fetch client receipts from MongoDB - using the correct collection name
    const clientReceipts = await db
      .collection('receipts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(clientReceipts, { status: 200 });
  } catch (error) {
    console.error('Error fetching client bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client bills' },
      { status: 500 }
    );
  }
}