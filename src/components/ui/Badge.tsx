import clsx from 'clsx';
import styles from '@/components/ui/Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

export default function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[variant])}>
      {children}
    </span>
  );
}
