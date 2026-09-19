// Ordo UI package — shared components and theme for both PWAs.

export {
  tailwindTheme,
  colors,
  spacing,
  radius,
  typography,
  breakpoints,
} from './theme';
export type { Theme } from './theme';

export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Textarea } from './components/Textarea';
export type { TextareaProps } from './components/Textarea';

export { Select } from './components/Select';
export type { SelectProps, SelectOption } from './components/Select';

export { Modal } from './components/Modal';
export type { ModalProps } from './components/Modal';

export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

export { Spinner } from './components/Spinner';
export type { SpinnerProps } from './components/Spinner';

export { PageHeader } from './components/PageHeader';
export type { PageHeaderProps } from './components/PageHeader';

export { Tabs } from './components/Tabs';
export type { TabsProps, TabOption } from './components/Tabs';

export { AppShell } from './components/AppShell';
export type { AppShellProps, NavItem } from './components/AppShell';

export { ToastProvider, useToast } from './components/Toast';
export type { ToastVariant } from './components/Toast';

export { ConfirmDialog } from './components/ConfirmDialog';
export type { ConfirmDialogProps } from './components/ConfirmDialog';

export { FieldError } from './components/FieldError';

export type { FormFieldProps } from './components/FormField';