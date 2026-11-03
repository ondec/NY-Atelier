import { PreviewScreen } from '@/components/preview-screen';

export default function AccountScreen() {
  return (
    <PreviewScreen
      eyebrow="YOUR SPACE"
      title="Account"
      description="Saved details, addresses, measurements and order history will live here. Sign-in is not connected in this fictional-data preview."
      actionLabel="VIEW ORDERS"
      actionRoute="/orders"
    />
  );
}
