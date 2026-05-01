import type { ReactNode } from 'react';
import styles from './Layout.module.css';

interface Props {
  header: ReactNode;
  children: ReactNode;
  tabletMode?: boolean;
}

export function Layout({ header, children, tabletMode }: Props) {
  return (
    <div className={styles.root} data-tablet={tabletMode ? 'true' : undefined}>
      <header className={styles.header}>{header}</header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
