import { NextRequest, NextResponse } from 'next/server';
import { getClientById, updateClient, deleteClient } from '@/lib/services/mongooseServices';

// GET /api/clients/[id] - Get a client by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClientById(params.id);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Transform MongoDB document to a plain object
    const clientObj = client.toObject();
    
    // Convert _id to id for frontend consistency
    const responseData = {
      ...clientObj,
      id: clientObj._id.toString(),
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update a client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientData = await request.json();
    const updatedClient = await updateClient(params.id, clientData);
    
    if (!updatedClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Transform MongoDB document to a plain object
    const clientObj = updatedClient.toObject();
    
    // Convert _id to id for frontend consistency
    const responseData = {
      ...clientObj,
      id: clientObj._id.toString(),
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Delete a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteClient(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Client not found or could not be deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}