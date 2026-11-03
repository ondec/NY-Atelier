import { PreviewScreen } from '@/components/preview-screen';

export default function HomeScreen() {
  return (
    <PreviewScreen
      eyebrow="MODERN EDITORIAL · HERITAGE CRAFT"
      title="Made to be worn beautifully."
      description="Explore NY Atelier's Ready-to-Wear collection, discover the Atelier, and follow each order from first conversation to handover."
      actionLabel="VIEW YOUR ORDERS"
      actionRoute="/orders"
    />
  );
}
