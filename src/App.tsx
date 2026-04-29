import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { RightNowSection } from '@/components/RightNowSection';
import { TodaySummary } from '@/components/TodaySummary';
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
      <TodaySummary />
      <RightNowSection />
      <ChartPanel />
      <div className={styles.twoCol}>
        <ArrayHealthPanel />
        <TrueupPanel />
      </div>
    </Layout>
  );
}
