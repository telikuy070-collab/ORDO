# Ordo — Domain Model

> Сущности, value objects, инварианты. 8 bounded contexts.

---

## 1. Bounded Contexts

| Модуль | Ответственность |
|---|---|
| **Identity** | Пользователи, роли, тенанты, аутентификация |
| **Academic** | Специальности, группы, семестры, дисциплины, учебные планы |
| **Resources** | Преподаватели, аудитории, корпуса, пожелания |
| **Scheduling** | Расписание, версии, конфликты, ограничения |
| **Publication** | Публикация для студентов, уведомления |
| **ImportExport** | Excel, CSV, внешние форматы |
| **Analytics** | Нагрузка, отчёты, метрики |
| **Audit** | История, аудит |

**Модули изолированы.** Общение — через `application`.

---

## 2. Identity

### Сущности

**Tenant**
- `id`: UUID
- `name`: string
- `slug`: string (уникальный)
- `settings`: JSON
- `createdAt`: Date

**User**
- `id`: UUID
- `tenantId`: UUID
- `email`: string
- `role`: Role
- `isActive`: boolean
- `createdAt`: Date

**Role** (enum)
- `owner`
- `tenant_admin`
- `schedule_owner`
- `department_head`
- `teacher`

**Session**
- `id`: UUID
- `userId`: UUID
- `token`: string
- `expiresAt`: Date

### Инварианты
- Email уникален в пределах тенанта.
- Только `owner` может создавать `tenant_admin`.
- Только `tenant_admin` и выше могут создавать `schedule_owner`.
- `role` не может быть изменена на higher-level без прав.

---

## 3. Academic

### Сущности

**Specialty**
- `id`: UUID
- `tenantId`: UUID
- `code`: string (060101, 060102...)
- `name`: string
- `isActive`: boolean

**Group**
- `id`: UUID
- `tenantId`: UUID
- `specialtyId`: UUID
- `code`: string (ЛД-1-2-26)
- `course`: number (1, 2, 3, 4)
- `semesterNumber`: number
- `isActive`: boolean

**Subgroup**
- `id`: UUID
- `groupId`: UUID
- `number`: number
- `name`: string

**Semester**
- `id`: UUID
- `tenantId`: UUID
- `number`: number
- `startDate`: Date
- `endDate`: Date
- `weeksCount`: number (16)
- `isActive`: boolean

**Discipline**
- `id`: UUID
- `tenantId`: UUID
- `name`: string
- `type`: DisciplineType (lecture | practice | seminar | lab)

**Curriculum**
- `id`: UUID
- `groupId`: UUID
- `disciplineId`: UUID
- `credits`: number
- `lectureHours`: number
- `practiceHours`: number
- `totalHours`: number
- `controlType`: string (Сынак, Экзамен)
- `weeklyLoad`: number[] (16 недель)

### Инварианты
- Код группы уникален в пределах тенанта.
- Специальность не может быть удалена, если есть активные группы.
- Curriculum привязан к группе и дисциплине.
- `weeklyLoad.length = 16`.

---

## 4. Resources

### Сущности

**Teacher**
- `id`: UUID
- `tenantId`: UUID
- `fullName`: string
- `email`: string (приватно)
- `phone`: string (приватно)
- `isActive`: boolean
- `userId`: UUID (для логина)

**Room**
- `id`: UUID
- `tenantId`: UUID
- `buildingId`: UUID
- `number`: string
- `capacity`: number
- `type`: RoomType (lecture | practice | lab | sport)

**Building**
- `id`: UUID
- `tenantId`: UUID
- `name`: string
- `address`: string

**TeacherPreference**
- `id`: UUID
- `teacherId`: UUID
- `type`: PreferenceType (cannot | prefer | max_per_day)
- `dayOfWeek`: number (1-7)
- `pairNumber`: number (1-8)
- `value`: JSON
- `status`: PreferenceStatus (pending | accepted | rejected)
- `comment`: string (от зама)

### Инварианты
- Teacher не может иметь 2 одинаковых preference.
- Room capacity > 0.
- Preference привязан к teacher.

---

## 5. Scheduling

### Сущности

**Schedule**
- `id`: UUID
- `tenantId`: UUID
- `semesterId`: UUID
- `status`: ScheduleStatus (draft | review | published | archived)
- `createdAt`: Date
- `publishedAt`: Date | null

**ScheduleVersion**
- `id`: UUID
- `scheduleId`: UUID
- `versionNumber`: number
- `authorId`: UUID
- `createdAt`: Date
- `comment`: string

**Lesson**
- `id`: UUID
- `versionId`: UUID
- `groupId`: UUID
- `subgroupIds`: UUID[]
- `teacherId`: UUID
- `roomId`: UUID
- `disciplineId`: UUID
- `dayOfWeek`: number (1-7)
- `pairNumber`: number (1-8)
- `timeStart`: string
- `timeEnd`: string
- `weekType`: WeekType (all | odd | even)
- `lessonType`: LessonType (lecture | practice | seminar | lab)

**Conflict**
- `id`: UUID
- `versionId`: UUID
- `type`: ConflictType
- `severity`: Severity (hard | soft)
- `lessonIds`: UUID[]
- `description`: string

**Constraint**
- `id`: UUID
- `tenantId`: UUID
- `type`: ConstraintType
- `severity`: Severity
- `rule`: JSON
- `isActive`: boolean

### Инварианты
- Преподаватель не может вести 2 пары одновременно.
- Группа не может слушать 2 пары одновременно.
- Аудитория не может быть занята дважды.
- Lesson всегда привязан к версии, группе, преподавателю, аудитории, дисциплине.
- `dayOfWeek` ∈ [1, 7].
- `pairNumber` ∈ [1, 8].
- `weekType` ∈ {all, odd, even}.
- Опубликованное расписание — **read-only**.

---

## 6. Publication

### Сущности

**PublishedSchedule**
- `id`: UUID
- `tenantId`: UUID
- `scheduleVersionId`: UUID
- `publishedAt`: Date
- `publishedBy`: UUID

**Notification**
- `id`: UUID
- `tenantId`: UUID
- `recipientId`: UUID
- `type`: NotificationType
- `payload`: JSON
- `status`: NotificationStatus (pending | sent | read)
- `createdAt`: Date

**Subscription**
- `id`: UUID
- `userId`: UUID
- `channel`: Channel (push | email | telegram)
- `isActive`: boolean

### Инварианты
- Публикация — только для `schedule_owner` и выше.
- Notification привязан к recipient.
- Опубликованное расписание — **immutable**.

---

## 7. ImportExport

### Сущности

**ImportJob**
- `id`: UUID
- `tenantId`: UUID
- `userId`: UUID
- `fileName`: string
- `status`: JobStatus (pending | processing | done | failed)
- `result`: JSON
- `createdAt`: Date

**ExportJob**
- `id`: UUID
- `tenantId`: UUID
- `userId`: UUID
- `format`: ExportFormat (xlsx | csv | pdf)
- `status`: JobStatus
- `result`: JSON
- `createdAt`: Date

**Mapping**
- `id`: UUID
- `tenantId`: UUID
- `sourceField`: string
- `targetField`: string

### Инварианты
- ImportJob привязан к пользователю.
- Mapping уникален в пределах тенанта.

---

## 8. Analytics

### Сущности

**WorkloadReport**
- `id`: UUID
- `tenantId`: UUID
- `teacherId`: UUID
- `semesterId`: UUID
- `totalHours`: number
- `lectureHours`: number
- `practiceHours`: number
- `generatedAt`: Date

**TeacherLoad**
- `id`: UUID
- `teacherId`: UUID
- `disciplineId`: UUID
- `hours`: number
- `weekLoad`: number[]

**GroupLoad**
- `id`: UUID
- `groupId`: UUID
- `disciplineId`: UUID
- `hours`: number
- `weekLoad`: number[]

### Инварианты
- Отчёты **read-only**.
- Генерируются из расписания и curriculum.

---

## 9. Audit

### Сущности

**AuditEvent**
- `id`: UUID
- `tenantId`: UUID
- `userId`: UUID
- `action`: string (create | update | delete | publish)
- `entity`: string (Lesson, Group, ...)
- `entityId`: UUID
- `before`: JSON
- `after`: JSON
- `createdAt`: Date

**ChangeLog**
- `id`: UUID
- `tenantId`: UUID
- `versionId`: UUID
- `changes`: JSON[]
- `createdAt`: Date

### Инварианты
- AuditEvent **immutable**.
- Никогда не удаляется.
- Хранится **вечно**.

---

## 10. Ссылки

- [Architecture](01-architecture.md)
- [RBAC](03-rbac.md)
- [Data Model](04-data-model.md)