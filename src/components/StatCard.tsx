import styles from './StatCard.module.css';

interface Props {
  label: string;
  value: string;
  color: string;
  isInProgress?: boolean;
}

export function StatCard({ label, value, color, isInProgress }: Props) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={{ color }}>{value}</span>
      {isInProgress && (
        <span className={styles.badge}>~ in progress</span>
      )}
    </div>
  );
}
