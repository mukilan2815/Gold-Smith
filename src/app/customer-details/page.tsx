'use client';

import Layout from '@/components/Layout';

export default function CustomerDetailsPage() {
  return (
    <Layout>
      <CustomerDetailsContent />
    </Layout>
  );
}


import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

function CustomerDetailsContent() {
  return (
    <div className="flex justify-center items-center h-screen bg-secondary">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Customer Details</CardTitle>
          <CardDescription>Frontend Layout Only</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Placeholder Content */}
          <p className="text-muted-foreground">
            This is a placeholder for the Customer Details page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    

