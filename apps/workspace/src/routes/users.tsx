import { createRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import type { User } from '@ordo/domain';
import { UserRole } from '@ordo/domain';
import { SupabaseUserRepository } from '@ordo/infrastructure';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  useToast,
} from '@ordo/ui';

import { useIsTenantAdmin, useSession } from '../auth/session';
import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/users',
  component: UsersPage,
});

const ASSIGNABLE_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: UserRole.Teacher, label: 'Преподаватель' },
  { value: UserRole.DepartmentHead, label: 'Заведующий отделением' },
  { value: UserRole.ScheduleOwner, label: 'Владелец расписания' },
  { value: UserRole.TenantAdmin, label: 'Администратор' },
];

function UsersPage() {
  const { user } = useSession();
  const isAdmin = useIsTenantAdmin();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const repository = new SupabaseUserRepository();
      setUsers(await repository.findByTenant(user.tenantId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);

    try {
      await new SupabaseUserRepository().delete(target.id);
      toast({ title: 'Пользователь удалён', variant: 'success' });
      await load();
    } catch (cause) {
      toast({
        title:
          cause instanceof Error
            ? cause.message
            : 'Не удалось удалить пользователя',
        variant: 'error',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Сотрудники" />
        <EmptyState
          title="Недостаточно прав"
          description="Управление сотрудниками доступно только администратору тенанта."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        description="Учётные записи вашего колледжа"
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>Добавить сотрудника</Button>
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState
          title="Сотрудников пока нет"
          description="Добавьте первого сотрудника, чтобы он мог войти в систему."
        />
      )}

      {!loading && !error && users.length > 0 && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="text-text-secondary">
              <tr>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Имя</th>
                <th className="py-2 pr-4 font-medium">Роль</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {users.map((member) => (
                <tr key={member.id} className="border-t border-surface-border">
                  <td className="py-2 pr-4">{member.email}</td>
                  <td className="py-2 pr-4">{member.name || '—'}</td>
                  <td className="py-2 pr-4">
                    <Badge>{ASSIGNABLE_ROLES.find((r) => r.value === member.role)?.label ?? member.role}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    {member.id === user?.id ? (
                      <span className="text-xs text-text-muted">это вы</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(member)}
                      >
                        Удалить
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={load}
        onCreated={setCreatedAccount}
      />

      <Modal
        open={createdAccount !== null}
        onClose={() => setCreatedAccount(null)}
        title="Учётная запись создана"
        description="Передайте эти данные сотруднику. Пароль показывается один раз."
      >
        {createdAccount && (
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-text-secondary">Email</dt>
              <dd className="font-mono">{createdAccount.email}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Временный пароль</dt>
              <dd className="font-mono select-all">{createdAccount.temporaryPassword}</dd>
            </div>
            <p className="text-xs text-text-muted">
              Попросите сотрудника сменить пароль после первого входа.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setCreatedAccount(null)}>Готово</Button>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Удалить сотрудника?"
        description={
          pendingDelete
            ? `${pendingDelete.email} потеряет доступ к системе. Действие необратимо.`
            : ''
        }
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvited,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => Promise<void>;
  onCreated: (account: { email: string; temporaryPassword: string }) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Teacher);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail('');
    setFullName('');
    setRole(UserRole.Teacher);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await new SupabaseUserRepository().invite(
        email.trim(),
        role,
        fullName.trim() || undefined,
      );
      toast({ title: 'Сотрудник добавлен', variant: 'success' });
      onCreated({
        email: result.email,
        temporaryPassword: result.temporaryPassword,
      });
      reset();
      onClose();
      await onInvited();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось добавить сотрудника',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новый сотрудник">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Имя" hint="Необязательно">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormField>

        <FormField label="Роль" required>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ASSIGNABLE_ROLES}
          />
        </FormField>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={submitting}>
            Добавить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
