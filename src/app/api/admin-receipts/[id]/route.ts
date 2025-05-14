import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/admin-receipts/[id] - Get a specific admin receipt by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase();
    const id = params.id;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid receipt ID format' },
        { status: 400 }
      );
    }
    
    // Find the admin receipt by ID
    const adminReceipt = await db.collection('AdminReceipts').findOne({
      _id: new ObjectId(id)
    });
    
    if (!adminReceipt) {
      return NextResponse.json(
        { error: 'Admin receipt not found' },
        { status: 404 }
      );
    }
    
    // Transform _id to id for frontend use
    return NextResponse.json({
      ...adminReceipt,
      id: adminReceipt._id.toString()
    }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching admin receipt with ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch admin receipt' },
      { status: 500 }
    );
  }
}

// PUT /api/admin-receipts/[id] - Update an existing admin receipt
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase();
    const id = params.id;
    const data = await request.json();
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid receipt ID format' },
        { status: 400 }
      );
    }
    
    // Prepare update data with timestamp
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    // Remove _id from update data if present
    if (updateData._id) delete updateData._id;
    
    // Update the admin receipt
    const result = await db.collection('AdminReceipts').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Admin receipt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { id, ...updateData },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error updating admin receipt with ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update admin receipt' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-receipts/[id] - Delete an admin receipt
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase();
    const id = params.id;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid receipt ID format' },
        { status: 400 }
      );
    }
    
    // Delete the admin receipt
    const result = await db.collection('AdminReceipts').deleteOne({
      _id: new ObjectId(id)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Admin receipt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { id, deleted: true },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting admin receipt with ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete admin receipt' },
      { status: 500 }
    );
  }
}