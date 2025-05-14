import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAllClients, searchClients } from '@/lib/services/mongooseServices';

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json();
    
    // Validate required fields
    if (!clientData.shopName || !clientData.clientName || !clientData.phoneNumber || !clientData.address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const newClient = await createClient(clientData);
    
    // Transform MongoDB document to a plain object
    const clientObj = newClient.toObject();
    
    // Convert _id to id for frontend consistency
    const responseData = {
      ...clientObj,
      id: clientObj._id.toString(),
    };
    
    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

// GET /api/clients - Get all clients or search by query params
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if there are search parameters
    const shopName = searchParams.get('shopName') || undefined;
    const clientName = searchParams.get('clientName') || undefined;
    const phoneNumber = searchParams.get('phoneNumber') || undefined;
    
    // If any search params exist, use search function
    if (shopName || clientName || phoneNumber) {
      const clients = await searchClients({ shopName, clientName, phoneNumber });
      
      // Transform MongoDB documents to plain objects with id instead of _id
      const responseData = clients.map(client => {
        const clientObj = client.toObject();
        return {
          ...clientObj,
          id: clientObj._id.toString()
        };
      });
      
      return NextResponse.json(responseData);
    }
    
    // Otherwise return all clients
    const clients = await getAllClients();
    
    // Transform MongoDB documents to plain objects with id instead of _id
    const responseData = clients.map(client => {
      const clientObj = client.toObject();
      return {
        ...clientObj,
        id: clientObj._id.toString()
      };
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}