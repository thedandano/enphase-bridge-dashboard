import type { ReactNode } from 'react';
import styles from './Layout.module.css';

interface Props {
  header: ReactNode;
  children: ReactNode;
}

export function Layout({ header, children }: Props) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>{header}</header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
