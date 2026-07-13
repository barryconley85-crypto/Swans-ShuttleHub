import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListAuditLog } from '@workspace/api-client-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AuditLog() {
  const { data: auditData } = useListAuditLog({ limit: 100 });

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">System action trail for compliance.</p>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex-1">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditData?.entries.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{log.username || 'System'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.action.includes('create') ? 'bg-green-500/10 text-green-500' :
                      log.action.includes('update') ? 'bg-blue-500/10 text-blue-500' :
                      log.action.includes('delete') ? 'bg-red-500/10 text-red-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {log.action.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{log.tableName} #{log.recordId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={log.newValue || ''}>
                    {log.newValue ? 'Changed' : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {(!auditData || auditData.entries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">No audit logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
