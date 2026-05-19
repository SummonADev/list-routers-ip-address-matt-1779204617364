import styles from '@/components/ui/ConfirmDialog.module.css';

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirm} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
