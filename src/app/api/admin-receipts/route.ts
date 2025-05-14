import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/admin-receipts - Get all admin receipts or filter by query params
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const clientId = searchParams.get('clientId');
    const clientName = searchParams.get('clientName');
    const status = searchParams.get('status');
    
    // Build query object based on provided parameters
    const query: any = {};
    if (clientId) query.clientId = clientId;
    if (clientName) query.clientName = { $regex: clientName, $options: 'i' };
    if (status) query.status = status;
    
    // Fetch admin receipts from MongoDB
    const adminReceipts = await db
      .collection('AdminReceipts')
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    
    // Transform _id to id for frontend use
    const transformedReceipts = adminReceipts.map(receipt => ({
      ...receipt,
      id: receipt._id.toString(),
    }));
    
    return NextResponse.json(transformedReceipts, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin receipts' },
      { status: 500 }
    );
  }
}

// POST /api/admin-receipts - Create a new admin receipt
export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();
    
    // Validate required fields
    if (!data.clientId || !data.clientName) {
      return NextResponse.json(
        { error: 'Client ID and Client Name are required' },
        { status: 400 }
      );
    }
    
    // Prepare receipt data with timestamps
    const adminReceiptData = {
      ...data,
      status: data.status || 'empty',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Insert into MongoDB
    const result = await db.collection('AdminReceipts').insertOne(adminReceiptData);
    
    return NextResponse.json(
      { 
        id: result.insertedId.toString(),
        ...adminReceiptData 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create admin receipt' },
      { status: 500 }
    );
  }
}