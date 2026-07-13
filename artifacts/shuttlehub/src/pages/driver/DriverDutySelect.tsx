import React from 'react';
import { useLocation } from 'wouter';
import { useListDuties } from '@workspace/api-client-react';
import { Bus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useLogout } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function DriverDutySelect() {
  const [, setLocation] = useLocation();
  const { data: duties, isLoading } = useListDuties();
  const { user, refresh } = useAuth();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        refresh();
        setLocation('/login');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Driver interface expects exactly 8 large touch cards. We pad or slice to 8.
  const displayDuties = (duties || []).filter(d => d.isActive).slice(0, 8);
  while (displayDuties.length < 8) {
    displayDuties.push({ id: -displayDuties.length, name: `Duty ${displayDuties.length + 1}`, number: displayDuties.length + 1, isActive: true, createdAt: '' });
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-safe">
      <header className="h-16 px-4 flex items-center justify-between border-b bg-card">
        <div className="flex items-center gap-2">
          <Bus className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">Select Duty</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </header>

      <div className="p-4 flex-1">
        <p className="text-muted-foreground mb-4">Welcome, {user?.driverName || user?.username}. Tap a duty to start your shift.</p>
        
        <div className="grid grid-cols-2 gap-4 h-[calc(100vh-140px)]">
          {displayDuties.map((duty) => (
            <button
              key={duty.id}
              disabled={duty.id <= 0} // dummy duties are disabled
              onClick={() => setLocation(`/driver/duty/${duty.id}`)}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${
                duty.id > 0 
                  ? 'bg-card border-primary/20 text-card-foreground shadow-sm hover:border-primary active:bg-primary/10' 
                  : 'bg-muted/50 border-muted text-muted-foreground opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="text-3xl font-bold">{duty.number}</span>
              <span className="text-sm font-medium mt-1 truncate w-full px-2 text-center">{duty.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
