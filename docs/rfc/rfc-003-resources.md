# RFC-003: Resources

## Цель
Определить модуль Resources: преподаватели, аудитории, корпуса и пожелания преподавателей. Установить контракты для управления ресурсами в системе.

## Границы
- Внутри: сущности `Teacher`, `Room`, `Building`, `TeacherPreference`, инварианты емкости аудиторий и предпочтений преподавателей
- Снаружи: workspace PWA (администрирование ресурсов), преподавательский кабинет (просмотр своей нагрузки)
- Не входит: расписание пар (Scheduling module), оценки, финансы

## Контракты (порты)
- `ITeacherRepository` — CRUD преподавателей
- `IRoomRepository` — управление аудиториями и корпусами
- `IPreferenceRepository` — предпочтения преподавателей (не может, предпочитает, максимум в день)

## Use-cases
- `CreateTeacher` — добавление преподавателя в систему
- `SubmitPreference` — преподаватель оставляет предпочтения
- `GetTeacherLoad` — получение нагрузки преподавателя
- `AssignRoom` — назначение аудитории на пару
- `GetAvailableRooms` — поиск свободных аудиторий

## События
- `TeacherAdded` — преподаватель добавлен в систему
- `PreferenceSubmitted` — предпочтение отправлено

## Зависимости
- Domain: Resources module (сущности, инварианты)
- Application: use-cases, порты
- Infrastructure: Supabase репозитории для Teacher, Room, Building

## Тесты
- Unit-тесты для use-cases Resources
- Тесты инвариантов: емкость аудитории > 0, уникальность предпочтений

## Definition of Done
- [ ] Domain Entity: Teacher, Room, Building, TeacherPreference определены
- [ ] Application: Use-cases реализованы для управления ресурсами
- [ ] Infrastructure: Supabase репозитории настроены
- [ ] ADR-001: Monorepo принят
- [ ] RFC-003: Resources принят