import { createRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { Button, Card, FormField, Input, PageHeader } from '@ordo/ui';

import { useSession } from '../auth/session';
import { RootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/login',
  component: LoginPage,
});

function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      await navigate({ to: '/schedule' });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось войти в систему',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Вход" description="Доступ для сотрудников колледжа" />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Email" required>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Пароль" required>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting}>
            Войти
          </Button>

          <p className="text-xs text-text-muted">
            Самостоятельная регистрация закрыта. Учётную запись создаёт
            администратор тенанта.
          </p>
        </form>
      </Card>
    </div>
  );
}
