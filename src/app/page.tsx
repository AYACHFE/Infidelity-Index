import { getAllTerminalData } from '@/lib/db';
import TerminalDashboard from '@/components/TerminalDashboard';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { scandals, redFlags, tips } = getAllTerminalData();

  return (
    <TerminalDashboard
      initialScandals={scandals}
      initialRedFlags={redFlags}
      initialTips={tips}
    />
  );
}
