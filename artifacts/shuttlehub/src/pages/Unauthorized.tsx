import React from 'react';
import { Link } from 'wouter';

export default function Unauthorized() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground p-4">
      <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
      <p className="text-muted-foreground mb-8 text-center">You do not have permission to view this page.</p>
      <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium">
        Return Home
      </Link>
    </div>
  );
}
