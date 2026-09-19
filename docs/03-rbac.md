# Ordo — RBAC

> Role-Based Access Control. Мультитенантная система ролей и прав.

---

## 1. Роли на уровне тенанта

Каждый тенант (колледж) имеет своих пользователей с накоплением ролей. Один пользователь может иметь несколько ролей на одном тенанте.

### Роли

| Роль | Код | Описание |
|---|---|---|
| `owner` | `owner` | Основатель платформы. Всё в платформе. |
| `tenant_admin` | `tenant_admin` | Директор колледжа. Всё в тенанте. |
| `schedule_owner` | `schedule_owner` | Заместитель директора. Всё в расписании. |
| `department_head` | `department_head` | Зав. отделением. Своё отделение. |
| `teacher` | `teacher` | Преподаватель. Свои пары, нагрузка, пожелания. |
| `anon` | `anon` | Студент (анонимно). Публичное расписание. |

### Множественные роли

У пользователя может быть набор ролей на тенанте:

- `director` = `tenant_admin` + `teacher` (директор видит админ-панель и свои пары)
- `department_head` + `teacher` (если тоже преподает)

**Функция:** `has_role(user_uuid, tenant_uuid, role_name)` — проверяет, есть ли у пользователя роль (или комбинация ролей).

---

## 2. Функция `has_role()` вместо `get_user_role()`

```sql
CREATE OR REPLACE FUNCTION has_role(
  user_uuid UUID, tenant_uuid UUID, role_name TEXT
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
      AND tenant_id = tenant_uuid
      AND role = role_name
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;
```

**Использование:** везде, вместо прямого доступа к `user_roles` или `auth.jwt()`.

**Удалено:** `get_user_role()` — заменено на `has_role()`.

---

## 3. RLS через `has_role(auth.uid(), tenant_id, 'role')`

Все политики RLS используют функцию `has_role()` для проверки прав.

### Пример: директор видит админ-панель и свои пары

```sql
-- Директор видит меню админки (tenant_admin)
CREATE POLICY "tenant_admin_view" ON admin_menu
FOR SELECT TO authenticated
USING (has_role(auth.uid(), tenant_id, 'tenant_admin'));

-- Директор видит свои пары (teacher)
CREATE POLICY "teacher_own_schedule" ON schedule_lessons
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), tenant_id, 'teacher')
  OR has_role(auth.uid(), tenant_id, 'schedule_owner')
);
```

### Пример: преподаватель видит только свои пары

```sql
CREATE POLICY "teacher_own" ON schedule_lessons
FOR SELECT TO authenticated
USING (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
  AND has_role(auth.uid(), tenant_id, 'teacher')
);
```

### Пример: преподаватель-зав. отделением

```sql
CREATE POLICY "department_head_own" ON schedule_lessons
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), tenant_id, 'department_head')
  OR has_role(auth.uid(), tenant_id, 'teacher')
);
```

---

## 4. Удалено

- Упоминание **одной роли на тенант** — теперь поддерживаются множественные роли.
- Дублирование прав через `auth.jwt()` — везлом `has_role()`.

---

## 5. Ссылки

ADR-003, ADR-011, ADR-014.