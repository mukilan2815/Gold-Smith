import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// DELETE handler to remove an admin bill by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid admin receipt ID format' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
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
      { message: 'Admin receipt deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting admin bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin bill' },
      { status: 500 }
    );
  }
}