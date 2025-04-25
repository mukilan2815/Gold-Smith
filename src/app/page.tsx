'use client';

import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <HomePageContent />
    </Layout>
  );
}

import Image from 'next/image';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {useToast} from '@/hooks/use-toast';

function HomePageContent() {
  const router = useRouter();
  const {toast} = useToast();

  useEffect(() => {
    // Check if the user is authenticated (example using localStorage)
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    toast({
      title: 'Logged out successfully!',
      description: 'Redirecting to login page...',
    });
    router.push('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-semibold mb-4">Welcome to Goldsmith Assistant</h1>
      <Image
        src="https://picsum.photos/500/300"
        alt="Placeholder Image"
        width={500}
        height={300}
        className="rounded-lg shadow-md mb-6"
      />
      <Button variant="destructive" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}

    

