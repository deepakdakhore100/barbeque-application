import React from 'react';
import { DailySummaryReport } from './DailySummaryReport';

export const SalesAnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Recharts Daily Summary Report Component */}
      <DailySummaryReport />
    </div>
  );
};
