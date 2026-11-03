import { PreviewScreen } from '@/components/preview-screen';

export default function ShopScreen() {
  return (
    <PreviewScreen
      eyebrow="READY-TO-WEAR"
      title="The collection"
      description="A considered selection of pieces for everyday expression. The product catalogue and checkout are planned for the next build slice."
      actionLabel="VIEW ORDERS"
      actionRoute="/orders"
    />
  );
}
