import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { FlowStrip } from '@/components/FlowStrip';
import { ChartPanel } from '@/components/ChartPanel';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import { useDisplayPrefs } from '@/context/DisplayPrefsContext';
import styles from './App.module.css';

export default function App() {
  const [isFirstRun, setIsFirstRun] = useState(false);
  const { tabletMode, visibleComponents } = useDisplayPrefs();

  return (
    <Layout tabletMode={tabletMode} header={<Header onFirstRun={setIsFirstRun} />}>
      {isFirstRun && (
        <div className={styles.banner}>
          Bridge connected — first energy data appears within ~15 minutes. Polling every 60s.
        </div>
      )}
      {visibleComponents.flowStrip && <FlowStrip />}
      <ChartPanel />
      {(visibleComponents.arrayHealth || visibleComponents.trueup) && (
        <div className={styles.twoCol}>
          {visibleComponents.arrayHealth && <ArrayHealthPanel />}
          {visibleComponents.trueup && <TrueupPanel />}
        </div>
      )}
    </Layout>
  );
}
