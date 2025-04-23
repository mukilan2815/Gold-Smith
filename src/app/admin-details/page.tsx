
import Layout from '@/components/Layout';

export default function AdminDetailsPage() {
  return (
    <Layout>
      <AdminDetailsContent />
    </Layout>
  );
}

'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

function AdminDetailsContent() {
  return (
    <div className="flex justify-center items-center h-screen bg-secondary">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Admin Details</CardTitle>
          <CardDescription>Frontend Layout Only</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Placeholder Content */}
          <p className="text-muted-foreground">
            This is a placeholder for the Admin Details page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    