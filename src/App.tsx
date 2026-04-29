import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { LiveStats } from '@/components/LiveStats';
import { EnergyChart } from '@/components/EnergyChart';
import { ArrayHealthPanel } from '@/components/ArrayHealthPanel';
import { TrueupPanel } from '@/components/TrueupPanel';
import { InverterChart } from '@/components/InverterChart';
import styles from './App.module.css';

export default function App() {
  const [selectedWindowTs, setSelectedWindowTs] = useState<number | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);

  return (
    <Layout header={<Header onFirstRun={setIsFirstRun} />}>
      {isFirstRun && (
        <div className={styles.banner}>
          Bridge connected — first energy data appears within ~15 minutes. Polling every 60s.
        </div>
      )}
      <LiveStats />
      <EnergyChart onWindowSelect={setSelectedWindowTs} />
      <div className={styles.twoCol}>
        <ArrayHealthPanel />
        <TrueupPanel />
      </div>
      <InverterChart
        selectedWindowTs={selectedWindowTs}
        onClearWindow={() => setSelectedWindowTs(null)}
        onWindowSelect={setSelectedWindowTs}
      />
    </Layout>
  );
}
