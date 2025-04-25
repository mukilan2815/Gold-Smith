'use client';

import Layout from '@/components/Layout';

export default function LoginPage() {
  return <LoginContent />;
}

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from '@/hooks/use-toast';

function LoginContent() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const {toast} = useToast();

  const handleLogin = async () => {
    // Basic login logic (replace with Firebase Authentication)
    const storedPassword = localStorage.getItem(`password-${userId}`);

    if (storedPassword && password === storedPassword) {
      localStorage.setItem('isLoggedIn', 'true');
      toast({
        title: 'Login Successful!',
        description: 'Redirecting to dashboard...',
      });
      router.push('/');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid credentials. Please try again.',
      });
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-secondary">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="userId">User ID</label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleLogin}>Login</Button>
          <Button variant="secondary" onClick={() => router.push('/signup')}>
            Create Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

