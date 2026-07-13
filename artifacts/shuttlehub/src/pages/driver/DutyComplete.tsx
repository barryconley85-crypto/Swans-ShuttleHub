import React from 'react';
import { useLocation } from 'wouter';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DutyComplete() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-primary flex flex-col items-center justify-center text-primary-foreground p-6">
      <CheckCircle className="w-32 h-32 mb-8 animate-in zoom-in duration-500" />
      <h1 className="text-4xl font-bold text-center mb-4">Duty Complete</h1>
      <p className="text-xl text-center opacity-90 mb-12">All departures have been recorded.</p>
      
      <Button 
        variant="secondary" 
        size="lg" 
        className="w-full max-w-sm h-16 text-lg font-bold rounded-xl"
        onClick={() => setLocation('/driver')}
      >
        Return to Duty Selection
      </Button>
    </div>
  );
}
