import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { FlowStrip } from '@/components/FlowStrip';
import { ChartPanel } from '@/components/ChartPanel';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import styles from './App.module.css';

export default function App() {
  const [isFirstRun, setIsFirstRun] = useState(false);

  return (
    <Layout header={<Header onFirstRun={setIsFirstRun} />}>
      {isFirstRun && (
        <div className={styles.banner}>
          Bridge connected — first energy data appears within ~15 minutes. Polling every 60s.
        </div>
      )}
      <FlowStrip />
      <ChartPanel />
      <div className={styles.twoCol}>
        <ArrayHealthPanel />
        <TrueupPanel />
      </div>
    </Layout>
  );
}
