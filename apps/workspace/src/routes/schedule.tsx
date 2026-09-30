import { createRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

import { UserRole } from '@ordo/domain';
import {
  PublishBlockedError,
  SupabasePublishedScheduleRepository,
  SupabaseScheduleVersionRepository,
  getSupabaseClient,
} from '@ordo/infrastructure';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  useToast,
} from '@ordo/ui';

import { useSession } from '../auth/session';
import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/schedule',
  component: SchedulePage,
});

interface ScheduleRow {
  id: string;
  semesterId: string;
  status: string;
  publishedAt: string | null;
  versionCount: number;
  publishedVersionId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  review: 'На проверке',
  published: 'Опубликовано',
  archived: 'Архив',
};

function SchedulePage() {
  const { user } = useSession();
  const { toast } = useToast();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const canPublish =
    user?.role === UserRole.ScheduleOwner || user?.role === UserRole.TenantAdmin;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const client = getSupabaseClient();

      // Schedule, version and publication data live in three tables with
      // different RLS policies, so they are read separately and joined here
      // rather than through an embedded select PostgREST cannot resolve.
      const [schedules, versions, published] = await Promise.all([
        client
          .from('schedules')
          .select('id, semester_id, status, published_at')
          .order('created_at', { ascending: false }),
        client.from('schedule_versions').select('id, schedule_id'),
        client.from('published_schedules').select('schedule_version_id, published_at'),
      ]);

      if (schedules.error) throw new Error(schedules.error.message);

      const versionsBySchedule = new Map<string, number>();
      for (const v of (versions.data ?? []) as Array<{ schedule_id: string }>) {
        versionsBySchedule.set(v.schedule_id, (versionsBySchedule.get(v.schedule_id) ?? 0) + 1);
      }

      const latestPublished = new Map<string, string>();
      for (const p of (published.data ?? []) as Array<{
        schedule_version_id: string;
        published_at: string;
      }>) {
        const current = latestPublished.get(p.schedule_version_id);
        if (!current) latestPublished.set(p.schedule_version_id, p.published_at);
      }

      const versionOwner = new Map<string, string>();
      for (const v of (versions.data ?? []) as Array<{ id: string; schedule_id: string }>) {
        versionOwner.set(v.id, v.schedule_id);
      }

      setRows(
        ((schedules.data ?? []) as Array<{
          id: string;
          semester_id: string;
          status: string;
          published_at: string | null;
        }>).map((s) => {
          const publishedVersion = ((published.data ?? []) as Array<{
            schedule_version_id: string;
            published_at: string;
          }>)
            .filter((p) => versionOwner.get(p.schedule_version_id) === s.id)
            .sort((a, b) => b.published_at.localeCompare(a.published_at))[0];

          return {
            id: s.id,
            semesterId: s.semester_id,
            status: s.status,
            publishedAt: s.published_at,
            versionCount: versionsBySchedule.get(s.id) ?? 0,
            publishedVersionId: publishedVersion?.schedule_version_id ?? null,
          };
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить расписания');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublish = async (scheduleId: string) => {
    setPending(scheduleId);
    try {
      const versionRepository = new SupabaseScheduleVersionRepository();
      const version = await versionRepository.getLatest(scheduleId);
      if (!version) {
        toast({ title: 'У расписания нет ни одной версии', variant: 'error' });
        return;
      }

      await new SupabasePublishedScheduleRepository().publishVersion(version.id);
      toast({ title: 'Расписание опубликовано', variant: 'success' });
      await load();
    } catch (cause) {
      toast({
        title:
          cause instanceof PublishBlockedError
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : 'Не удалось опубликовать',
        variant: 'error',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Расписание"
        description="Версии и публикация учебного расписания"
      />

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="Расписаний пока нет"
          description="Создайте расписание для семестра, чтобы начать работу."
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="text-text-secondary">
              <tr>
                <th className="py-2 pr-4 font-medium">Семестр</th>
                <th className="py-2 pr-4 font-medium">Статус</th>
                <th className="py-2 pr-4 font-medium">Версий</th>
                <th className="py-2 pr-4 font-medium">Публикация</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-surface-border">
                  <td className="py-2 pr-4 font-mono text-xs">{row.semesterId.slice(0, 8)}</td>
                  <td className="py-2 pr-4">
                    <Badge>{STATUS_LABELS[row.status] ?? row.status}</Badge>
                  </td>
                  <td className="py-2 pr-4">{row.versionCount}</td>
                  <td className="py-2 pr-4">
                    {row.publishedAt
                      ? new Date(row.publishedAt).toLocaleString('ru-RU')
                      : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {canPublish ? (
                      <Button
                        size="sm"
                        loading={pending === row.id}
                        disabled={row.versionCount === 0}
                        onClick={() => handlePublish(row.id)}
                      >
                        Опубликовать
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted">
                        нужно право владельца расписания
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
