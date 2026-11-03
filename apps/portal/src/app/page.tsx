import { DemoOrder, getDemoOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${value}T12:00:00Z`),
      )
    : "To be agreed";
}

function OrderCard({ order }: { order: DemoOrder }) {
  return (
    <article className="order-card">
      <div className="card-topline">
        <span className="category">{order.category}</span>
        <span className="reference">{order.reference}</span>
      </div>
      <h3>{order.items.map((item) => item.garment_name).join(" · ")}</h3>
      <p className="customer">{order.customer_name}</p>
      <div className="order-meta">
        <div><span>Current stage</span><strong>{order.status}</strong></div>
        <div><span>Expected</span><strong>{formatDate(order.expected_completion_date)}</strong></div>
        <div><span>Handover</span><strong>{order.fulfilment_method ?? "To be agreed"}</strong></div>
      </div>
      {order.category === "Custom" && (
        <p className="completion-note">
          {order.completed_item_count} of {order.item_count} outfits complete. Collection waits until all are ready.
        </p>
      )}
      <div className="garment-list">
        {order.items.map((item) => (
          <div className="garment-row" key={`${order.reference}-${item.garment_name}`}>
            <span>{item.wearer_name ? `${item.wearer_name} · ` : ""}{item.garment_name}</span>
            <span>{item.status}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default async function Home() {
  let orders: DemoOrder[] = [];
  let unavailable = false;
  try {
    orders = await getDemoOrders();
  } catch {
    unavailable = true;
  }

  const active = orders.filter((order) => !order.is_complete);
  const history = orders.filter((order) => order.is_complete);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand"><span className="brand-mark">NY</span><span>ATELIER</span></div>
          <span className="preview-badge">Staff preview · fictional data</span>
        </div>
      </header>
      <main className="main-content">
        <div className="eyebrow">Orders &amp; production</div>
        <div className="page-heading">
          <div>
            <h1>Order overview</h1>
            <p>Ready-to-Wear, Atelier and Alterations in one view.</p>
          </div>
          <div className="count-panel"><strong>{active.length}</strong><span>active orders</span></div>
        </div>
        {unavailable ? (
          <div className="empty-state">The demo orders are unavailable. Start the local NY Atelier API, then refresh this page.</div>
        ) : (
          <>
            <section aria-labelledby="active-title">
              <div className="section-title"><h2 id="active-title">Active</h2><span>{active.length} orders</span></div>
              <div className="order-grid">{active.map((order) => <OrderCard key={order.reference} order={order} />)}</div>
            </section>
            <section aria-labelledby="history-title">
              <div className="section-title"><h2 id="history-title">History</h2><span>{history.length} orders</span></div>
              <div className="order-grid">{history.map((order) => <OrderCard key={order.reference} order={order} />)}</div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
