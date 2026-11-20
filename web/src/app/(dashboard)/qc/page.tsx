'use client';

import { Header, PageContainer } from '@/components/global';
import QcInspectionTab from './components/QcInspectionTab';

export default function QcPage() {
  return (
    <PageContainer>
      <Header
        title="Quality Control"
        description="Perform quality inspections"
        icon="🧪"
      />

      <div className="mt-6">
        <QcInspectionTab />
      </div>
    </PageContainer>
  );
}
