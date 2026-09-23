# RFC-001: Identity

## Цель
Определить границы и контракты модуля Identity в рамках Clean Architecture. Установить, как пользователи, роли и тенанты создаются, управляются и аутентифицируются в системе.

## Границы
- Внутри: сущности `Tenant`, `User`, `Role`, `Session`, аутентификация, RLS политики
- Снаружи: workspace PWA (авторизация), student PWA (анонимный доступ), Supabase Auth
- Не входит: сброс пароля, социальный вход, двухфакторная аутентификация (пока)

## Контракты (порты)
- `IUserRepository` — CRUD пользователей
- `IRoleRepository` — управление ролями и иерархией
- `IAuthProvider` — стратегии аутентификации
- `ITenantService` — создание и настройка тенанта

## Use-cases
- `RegisterUser` — регистрация нового пользователя
- `LoginUser` — вход в систему
- `AssignRole` — назначение роли пользователю
- `CreateTenant` — создание нового колледжа/тенанта
- `GetCurrentUser` — получение данных текущего пользователя

## События
- `UserRegistered` — пользователь зарегистрирован
- `RoleAssigned` — роль назначена пользователю
- `TenantCreated` — тенант создан

## Зависимости
- Domain: Identity module (сущности, инварианты)
- Application: use-cases, порты
- Infrastructure: Supabase Auth, RLS политики

## Тесты
- Unit-тесты для use-cases Identity
- Интеграционные тесты RLS политик
- Тесты создания тенанта с валидацией email

## Definition of Done
- [ ] Domain Entity: Tenant, User, Role определены с инвариантами
- [ ] Application: Use-cases реализованы с портами
- [ ] Infrastructure: Supabase RLS политики настроены
- [ ] ADR-001: Monorepo принят
- [ ] RFC-001: Identity принят