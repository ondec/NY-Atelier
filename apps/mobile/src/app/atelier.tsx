import { PreviewScreen } from '@/components/preview-screen';

export default function AtelierScreen() {
  return (
    <PreviewScreen
      eyebrow="BESPOKE & CUSTOM"
      title="The Atelier"
      description="A personal clothing journey, beginning with a consultation and continuing through fittings, craft and finishing. Booking will follow after the order foundation."
      actionLabel="VIEW ORDERS"
      actionRoute="/orders"
    />
  );
}
