import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// DELETE handler to remove a client bill by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid receipt ID format' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Delete the receipt - using the correct collection name
    const result = await db.collection('receipts').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Receipt deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting client bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete client bill' },
      { status: 500 }
    );
  }
}