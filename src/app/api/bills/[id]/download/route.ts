import { NextRequest, NextResponse } from 'next/server';
import { getReceiptById } from '@/lib/services/receiptService';
import { ObjectId } from 'mongodb';

// GET handler to download a client receipt by ID
export async function GET(
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

    // Get receipt details from MongoDB
    const receipt = await getReceiptById(id);

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Return receipt data for download
    // The frontend will handle the actual PDF generation
    return NextResponse.json(receipt, { status: 200 });
  } catch (error) {
    console.error('Error downloading client receipt:', error);
    return NextResponse.json(
      { error: 'Failed to download client receipt' },
      { status: 500 }
    );
  }
}