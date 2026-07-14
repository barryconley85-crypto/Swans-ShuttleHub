import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { 
  useListDuties, 
  useListStops, 
  useListTimetables,
  getListTimetablesQueryKey,
  useCreateTimetableEntry,
  useUpdateTimetableEntry,
  useDeleteTimetableEntry 
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function Timetables() {
  const [selectedDutyId, setSelectedDutyId] = useState<string>('');
  
  const { data: duties } = useListDuties();
  const { data: stops } = useListStops();
  const dutyId = selectedDutyId ? parseInt(selectedDutyId) : undefined;
  
  const { data: timetables, refetch } = useListTimetables({ dutyId }, { query: { queryKey: getListTimetablesQueryKey({ dutyId }), enabled: !!dutyId } });
  
  const create = useCreateTimetableEntry();
  const remove = useDeleteTimetableEntry();

  const [newStopId, setNewStopId] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('08:00');

  const handleAdd = () => {
    if (!dutyId || !newStopId || !newTime) {
      toast.error('Fill all fields');
      return;
    }
    
    // Auto-calculate next sequence order
    const nextSeq = timetables && timetables.length > 0 
      ? Math.max(...timetables.map(t => t.sequenceOrder)) + 1 
      : 1;

    create.mutate({
      data: {
        dutyId,
        stopId: parseInt(newStopId),
        scheduledTime: newTime,
        sequenceOrder: nextSeq
      }
    }, {
      onSuccess: () => {
        toast.success('Entry added');
        setNewStopId('');
        refetch();
      }
    });
  };

  const handleDelete = (id: number) => {
    remove.mutate({ id }, {
      onSuccess: () => {
        toast.success('Entry removed');
        refetch();
      }
    });
  };

  const sortedTimetables = timetables ? [...timetables].sort((a, b) => a.sequenceOrder - b.sequenceOrder) : [];

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetables</h1>
          <p className="text-muted-foreground">Manage routes and scheduled stops for duties.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Duty</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDutyId} onValueChange={setSelectedDutyId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a duty..." />
              </SelectTrigger>
              <SelectContent>
                {duties?.filter(d => d.isActive).map(duty => (
                  <SelectItem key={duty.id} value={duty.id.toString()}>
                    {duty.number} - {duty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {dutyId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
              <CardTitle>Route Sequence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-8">
                {sortedTimetables.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="text-muted-foreground w-6 text-center">{index + 1}</div>
                    <div className="font-mono font-bold text-lg w-20">{entry.scheduledTime}</div>
                    <div className="flex-1 font-medium">{entry.stopName}</div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {sortedTimetables.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl">
                    No stops scheduled for this duty.
                  </div>
                )}
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Add Stop</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-[150px] space-y-2">
                    <label className="text-sm font-medium">Time (HH:MM)</label>
                    <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Stop</label>
                    <Select value={newStopId} onValueChange={setNewStopId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stop..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stops?.filter(s => s.isActive).map(stop => (
                          <SelectItem key={stop.id} value={stop.id.toString()}>{stop.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAdd} className="w-full sm:w-auto gap-2" disabled={create.isPending}>
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
