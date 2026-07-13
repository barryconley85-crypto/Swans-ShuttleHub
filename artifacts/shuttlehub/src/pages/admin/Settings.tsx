import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListSettings, useUpsertSetting } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Settings() {
  const { data: settings, refetch } = useListSettings();
  const upsert = useUpsertSetting();

  const handleSave = (key: string, value: string, description: string) => {
    upsert.mutate({ data: { key, value, description } }, {
      onSuccess: () => {
        toast.success('Setting saved');
        refetch();
      }
    });
  };

  const defaultSettings = [
    { key: 'company_name', description: 'Company Name displayed on reports', defaultVal: 'Swans Travel' },
    { key: 'late_threshold_mins', description: 'Minutes after schedule before marked late', defaultVal: '5' },
    { key: 'max_capacity_warning', description: 'Highlight counts above capacity %', defaultVal: '90' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">System Settings</h1>

        <div className="space-y-6">
          {defaultSettings.map(def => {
            const existing = settings?.find(s => s.key === def.key);
            const val = existing ? existing.value : def.defaultVal;

            return (
              <Card key={def.key}>
                <CardHeader>
                  <CardTitle className="text-lg font-mono text-primary">{def.key}</CardTitle>
                  <CardDescription>{def.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form 
                    className="flex gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      handleSave(def.key, fd.get('value') as string, def.description);
                    }}
                  >
                    <Input name="value" defaultValue={val} className="max-w-md" />
                    <Button type="submit" disabled={upsert.isPending}>Save</Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
