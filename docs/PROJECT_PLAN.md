# NY Atelier — Product requirements and build plan

> **Current implementation handoff: 20 November 2026.** Start with [AI_HANDOFF.md](AI_HANDOFF.md) and [WORK_LOG.md](WORK_LOG.md). This document preserves the earlier requirements/proposals and decision history. Its early statements about unimplemented staff login, read-only portal, local-only consultations, older navigation and inaccessible domain are historical, not current implementation facts. The latest user corrections and verified handoff take precedence for current behavior. Unfinished business requirements remain requirements until explicitly changed.

Prepared: 3 November 2026  
Status: Planning baseline and active prototype build; first connected foundation implemented  
Audience: Project owner, NY Atelier stakeholders, designers and future development/maintenance teams

## 1. Purpose and authority

Build a client mobile app for Android and iPhone, connected to a responsive management portal for NY Atelier. First deliver a polished, interactive prototype with connected sample customers and orders. Prioritise the client app experience, then develop the management portal against the same sample records.

Development and documentation belong in the attached local Ny Atelier project folder. The eventual handover must include source code, agreed stack, setup instructions, business rules, outstanding work and maintenance guidance.

This plan consolidates the planning conversation. Explicitly approved requirements are distinguished from implementation proposals and unresolved decisions. It does not claim that integrations, security controls or features are already implemented.

Brand references supplied by the user:

- https://thenyatelier.com/
- https://rtw.thenyatelier.com/
- https://www.instagram.com/ny_atelier_/

Use relevant brand-owned imagery and content when available. The existing websites contain some template material: do not import placeholder addresses, policies or commercial claims as verified business information. The three main customer services are Ready-to-Wear, Alterations and Custom/Bespoke (Atelier). Consultations, fittings, fabric selection, styling/wardrobe support and delivery remain relevant offerings or supporting activities; detailed styling/wardrobe workflows still need definition.

### Approved client app visual direction

The [shared design conversation](https://chatgpt.com/share/6ae98028-3e54-83e9-9f3d-aa2691ed70d4) established a Modern Editorial and Heritage Luxury blend. The approximate 70/30 balance is a creative guide, not a rigid layout rule. Keep the shopping interface clear and contemporary, with the NY monogram and restrained craftsmanship details providing heritage character.

| Colour | Hex | Intended role |
| --- | --- | --- |
| Deep Petrol Blue | `#123C45` | Primary brand colour and main actions |
| Warm Alabaster | `#F6F3EC` | Main canvas and light sections |
| Saddle Cognac | `#A85C32` | Secondary accents |
| Brushed Brass | `#C5A059` | Selective decorative detailing |
| Dark Slate Charcoal | `#1C2326` | Text and strong contrast |
| Muted Sage | `#7A8B7B` | Limited supporting backgrounds and accents |

The original supplied NY logo/wordmark artwork is the authoritative brand mark. The local `Logo/NY Logo.pdf` contains the monogram only. The user supplied its SVG version, now stored as `codebase/apps/mobile/assets/ny/ny-mark-original.svg` and used beside the NY Atelier name in all five client page headers, on product details, and in the Atelier tab. The original wordmark image is still unavailable. Use Alfa Slab One provisionally for large editorial headings and Josefin Sans for interface text. The exact original wordmark font remains unknown and should replace the temporary display font if identified. Verify the artwork and its embedded colour before preparing final logo variants.

- **Home:** Shopping-first, with a full-screen cinematic editorial carousel using suitable NY Atelier Ready-to-Wear photography. Let the image extend behind the status area while keeping the logo and controls below the safe area. Advance the carousel automatically while Home is focused. Slide the image and changing caption/headline for Next, indicator taps and manual swipes while the logo, Shop Collection action, progress indicators, slide count and Next control stay in place. Give the small progress indicators rounded ends. Place the headline and Shop Collection action over the image with careful contrast. Warm Alabaster shopping sections and short Atelier service promotions follow the hero; avoid unverified discounts or commercial claims.
- **Shop:** One Ready-to-Wear catalogue headed “Ready-to-wear shop,” with All, New Arrivals, Men, Women and Collections views. The current nine-piece preview includes six additional NY Atelier store images and prices. The New Arrivals view shows recently listed products with small `NEW` badges, while release dates await confirmation. Give menswear and womenswear equal visual importance, while clearly identifying any sample womenswear content until authentic catalogue items are available. Use a clean two-column product grid with rounded portrait 3:4 images, consistent garment photography and visible prices. Place a wishlist heart at the upper right. At the lower right of each card image, show up to three small close-fabric or solid-colour swatches stacked in a narrow translucent capsule, with a `+N` count when more remain. Amani's black colour remains a visual concept identified within its detail view, but its extra label is removed from the Shop card. A sample `OFFER` badge and crossed-out reference price demonstrate the sale layout; the store has no live sale items, so the example context belongs in the detail view and catalogue note rather than on the badge, and the actual listed price is used in the bag. A muted `OUT OF STOCK` card demonstrates that state and disables Add to Bag; the store did not mark any product out of stock when checked, so this state is also explained in the detail view and catalogue note. Put a filter control at the right of the item heading in every category view, with clothing type (tops and shirts, trousers, two-piece sets), colour, price, availability and sort choices. Include search as the catalogue grows. Preview wishlist and bag actions may use local state until connected shopping data is ready.
- **Product detail:** Lead with a large, rounded 3:4 portrait photo frame below the phone's status area. Show the entire source photo within it, preserving the garment when an image has a different aspect ratio. Provide photo navigation when multiple verified images are available. Follow with name, price, verified colour and size options, a short product-specific description, a quantity stepper, an expandable size and fit guide, and related items as product data becomes available. Add detailed garment information when NY Atelier supplies it. Do not invent NY Atelier measurement values; show a pending measurement notice until the official size chart is supplied. Keep wishlist and Add to Bag accessible at the bottom. The current preview uses sample size choices, requires a size before adding from detail, and adds the selected quantity to the bag before offering View Bag and Continue Shopping; it must not imply verified stock. The Amani cream gallery uses the NY store's front, fabric-detail and side photos. Switching colour replaces the whole gallery and resets it to the first image; its black visual concept currently has one image. Real colour choices must come from approved catalogue variants.
- **Atelier and Orders:** Use the main website as a reference for the custom/bespoke Atelier journey, separate from the Ready-to-Wear shopping catalogue. The Atelier hero starts at the top edge behind the status area and covers about two-thirds of the phone screen; keep the NY Atelier mark below the safe area and remove the right-side “The Atelier / 01” label. Crop the source image to cover the hero frame without distortion. Keep one Orders area for the client's distinct Ready-to-Wear, custom/bespoke and alteration orders.
- **Main navigation:** Use five client-app tabs: Home, Shop, Atelier, Orders and Account. Center them in a floating, rounded, lightly frosted navigation bar with a layered shadow, 18-point side margins on phones, and a modest gap above the phone's bottom system controls. Use soft, rounded outline icons for inactive tabs and filled icons for the selected tab, without a separate selected-tab background; use the supplied NY monogram SVG for Atelier. Keep labels visible. Atelier contains the custom/bespoke journey, consultations, fittings and measurements. Open the bag from Shop; present checkout as a focused flow for completing an order.
- **Buttons:** Use oval or fully rounded corners for primary actions and selection controls across the client app.
- **Images:** Round corners on garment cards and other contained photography; retain the full-width, full-screen Home editorial hero. Its image may extend behind the phone's status area, but its text and controls must stay below that area. Keep product-detail photography below the status safe area.

### Owner portal first visual draft

The initial management portal is desktop-focused. It carries the same Petrol, Alabaster, Cognac and Brass palette, NY monogram, and provisional fonts into a more information-dense workspace. One dark grouped sidebar leads to Overview, All orders, Appointments, Customers, the three distinct services (Ready-to-Wear, Atelier/Custom and Alterations), Inventory, Finances and Team. Atelier expands to the seven offerings from the [NY Atelier services page](https://thenyatelier.com/our-services/), matching the client app. These are subordinate offerings, not new order categories. Other menus may gain submenus as their workflows are designed. The slim leftmost workspace rail is restored with the current Owner workspace entry; additional workspace entries and role-specific menus will be defined with the user. The owner overview uses connected fictional order data for active, due-soon, customer-action and completed counts, an order desk and service shortcuts. Empty workspaces explain where future connected records will appear; they do not show invented operational figures. This is a navigation and dashboard design draft, not authenticated owner access or an implemented management workflow. Refine it screen by screen with the NY team before connecting staff actions.

## 2. Scope and delivery boundaries

### Current product direction

- Client mobile app for Android and iPhone.
- Staff management portal usable on computers, tablets and phones.
- Shared customer, order, appointment and progress information.
- Connected sample records demonstrating both sides of the experience.
- Client app design and implementation first; portal follows with connected workflows.
- The first connected foundation uses the agreed stack and fictional order records; the remaining client and staff journeys are still to be built.

### Prototype versus live operation

The prototype must demonstrate meaningful interactions rather than isolated static screens: booking requests, staff approval, measurement review, order progress, discounts and sample financial records should connect where implemented. Use synthetic customer data.

Real payment collection is explicitly deferred. Payment screens and states are demonstrations. Email, SMS, WhatsApp, meeting providers and other external integrations must be labelled simulated unless separately authorised and actually connected. The current connected order sample is persisted in local PostgreSQL and served through the Laravel demo API. Cross-device access requires the devices to reach the same running API; authenticated synchronisation is not implemented.

### Existing and future websites

Do not build a companion customer website now or change the existing sites. Later obtain authorised admin access, inspect their implementation and data, and assess integration or migration. If connection is impractical, scope a companion/replacement website and a migration plan. The staff management portal remains in current scope.

## 3. Roles and permissions

Initial roles: owner, manager, receptionist, designer and tailor. More roles may be added later. Permissions are action-specific: owner is not assumed to bypass every explicitly agreed restriction.

| Action | Owner | Manager | Receptionist | Designer | Tailor |
| --- | --- | --- | --- | --- | --- |
| Create customer records and staff-entered orders, including alterations | Yes | Yes | Yes | Not granted | Not granted |
| Approve appointments and propose other times | Yes | Yes | Yes | Not granted | Not granted |
| Read client conversations | Yes | Yes | Yes | No | No |
| Reply to client conversations | Yes | Yes | No | No | No |
| Verify/approve measurements | No: manager-only rule | Yes | No | No | No |
| Assign production work | Yes | Yes | No | No | No |
| Submit progress for assigned production work | Broader update rules TBD | Broader update rules TBD | Not granted | Yes | Yes |
| Approve stage progression or request changes | Yes | Yes | No | No | No |
| Authorise production before deposit | Yes | Yes | No | No | No |
| Add products, edit prices and upload product photos | Yes | Yes | No | No | No |
| Update stock quantities | Owner stock permission TBD | Yes | Yes | No | No |
| Create/manage discount codes | Yes | Yes | No | No | No |
| View available codes/apply order discounts | Yes | Yes | Yes | No | No |
| View/record customer deposits and balances | Yes | Yes | Yes | No | No |
| Access business expenses, debts, loans and bills | Yes | Yes | No | No | No |
| Update collection/delivery status | Yes | Yes | Yes | No | No |
| Create staff accounts, assign non-owner roles and deactivate staff | Yes | Yes | No | No | No |
| Grant/change owner access | Yes | No | No | No | No |

Designers and tailors see only work assigned to them, with the relevant measurements, design references and instructions. They do not receive unrestricted access to the customer database, business finances or private client conversations. The exact fields available to each role should be finalised before implementation.

Owner access is protected: a manager cannot remove an owner or promote an account to owner. Rules for the last remaining owner and account recovery are still to be defined.

## 4. Customers, accounts and people being fitted

- Browsing requires no account.
- In the mobile app, clients must create or sign in to an account before placing an order, booking an appointment or beginning an ongoing custom consultation. Order details, history and tracking require the client's account.
- Guest Ready-to-Wear checkout is for a future website experience, not the mobile app. The customer website is outside the current build scope.
- Receptionist, manager and owner can create a customer record and order for walk-ins without app download or registration.
- A customer record is not automatically an authenticated account. Later account linking must establish identity and prevent access merely by guessing a name, email or order number; the linking method remains to be designed.
- One account can order for multiple people, each with a separate name and measurement history.
- Account details, saved addresses, notification preferences, order history and wishlist form part of the intended client experience; detailed sign-in and recovery methods remain undecided.

## 5. Service categories and order identity

The three main services are **Ready-to-Wear**, **Alterations** and **Custom/Bespoke (Atelier)**. Keep their orders/tickets separate; do not mix categories under one fulfilment order. The shopping-first Home direction remains, while all three services should be easy to discover in the app.

“Custom clothing” and “bespoke clothing” refer to the same service and order category. **Atelier** is the client-app section where that journey begins, not an additional order type or a separate customer journey. The resulting custom/bespoke order appears in Orders for tracking.

Proposed readable references, accepted in principle as a direction but with exact numbering still to finalise:

| Category | Example | Scope |
| --- | --- | --- |
| Ready-to-wear | NY-RTW-000001 | Existing stock garments without adjustments |
| Custom | NY-CUS-000001 | Outfits produced specifically for a client |
| Alterations | NY-ALT-000001 | Stock garments adjusted following an in-store consultation/try-on |

References must be unique. Separate immutable internal identifiers are a technical proposal, not yet an agreed implementation.

### Multi-person orders

Multiple outfits for different people may share one order within a service category. Link each item to its wearer and measurements and track item progress independently. The entire order becomes ready for collection/delivery only after every item is complete. No partial fulfilment for these grouped orders.

Example: father's outfit complete, mother's outfit in final checks and child's outfit being made. Show the item states and an overall indication such as “1 of 3 outfits complete”; the order remains in progress. Do not imply that one-third of production time has elapsed.

### Alterations

Only staff create alteration orders; clients cannot initiate them as a shopping option. Following an in-store try-on, record the garment, adjustment instructions, relevant measurements, completion date and collection/delivery choice. The alteration order includes the selected garment and adjustment work, avoiding a duplicate RTW purchase record for the same item. Staff may agree same-day, next-day or another completion date.

Receptionist, manager and owner can create these orders. Inventory treatment when a stock garment becomes an alteration order needs a documented implementation rule.

## 6. Custom-order workflow and progress

Clients book through the app or a shareable booking link. Consultation involves exchanging ideas, discussing budget, choosing fabric, confirming measurements and arranging fittings before fulfilment.

Clients can state a budget. After initial conversation, staff and client agree on the quotation. A deposit is set individually for each order, followed by a balance. No fixed deposit percentage.

### Detailed internal stages

| Stage | Meaning |
| --- | --- |
| Consultation | Gather ideas, budget and requirements |
| Awaiting approval | Await client approval of design and quotation |
| Preparing for production | Confirm measurements, materials and deposit or early-start approval |
| Cutting & sewing | Make the garment |
| Ready for fitting | Garment is ready to try on |
| Adjustments in progress | Apply fitting feedback |
| Final quality check | Check fit, stitching, finish and agreed details |
| Ready for collection / delivery | All required items are ready for handover |
| Out for delivery | Dispatch has occurred, where applicable |
| Completed | Customer collected or received the order |

Allow repeat fitting/adjustment cycles. On hold and Cancelled were accepted as internal status concepts with reasons, but client cancellation requests, cancellation policy and refunds are deferred. Do not implement a cancellation workflow merely because a status exists.

### Simplified client view

| Client status | Internal stages |
| --- | --- |
| Consultation & approval | Consultation and awaiting approval |
| Preparing your order | Preparing for production |
| Your outfit is being made | Cutting & sewing |
| Fitting & adjustments | Ready for fitting and adjustments |
| Final checks | Final quality check |
| Ready for collection / delivery | Ready for handover |
| Out for delivery | Dispatched |
| Completed | Collected/received |

Display the expected completion date and actions needed from the client, such as design approval, deposit or fitting confirmation. Keep internal staff notes private.

### Staff approval flow

Designer/tailor updates assigned work and submits a stage for review. Notify the manager. Manager or owner verifies, approves progression or requests changes with feedback. A pending submission does not advance the official order stage or client-facing status. Record actor, time and relevant notes for updates and approvals.

Production normally starts after deposit receipt. Owner or manager may authorise an earlier start; record that exception. Payment and production states are separate.

## 7. Measurements and fabric selection

- Support client-submitted and staff-recorded measurements; prefer staff taking measurements at an appointment/in-person meeting.
- Record the subject/wearer, who supplied or took the measurements, who oversaw/verified them, dates and review status.
- Only the manager approves measurements. Client submissions and updates need approval before production use.
- Keep dated previous sets to account for weight/size changes. Do not overwrite verified history.
- Each order/item retains the measurement version used; new measurements do not alter earlier orders.
- Clients and authorised staff can view relevant saved measurements/history. A client can view profiles for people they order for; exact privacy/consent handling requires production design.
- Support centimetres and inches for display; define a consistent stored unit and conversion precision during technical design.
- Measurement-taking illustrations/instructions are deferred.
- Clients choose NY-supplied fabric during consultations, using a digital fabric palette/catalogue and physical samples.
- Record chosen fabric against the order. Fabric stock quantities and reservations are explicitly excluded from current scope, internally and client-facing.

## 8. Appointments and communication

### Client Atelier entry — approved direction

The Atelier tab leads with **Book a Consultation**, with in-person and virtual options. This is the entry point for the custom/bespoke clothing journey. The consultation card has 10-point corners. Below it, clients can explore the measurements/fittings, fabric selection and styling journey, then the seven offerings from the NY Atelier services brochure: Couture Experience; Bespoke Tailor-Made Clothing; Unique Idea Development for Special Events; Consultancy Services; Custom Fabric Selection; Wardrobe Revamping; and Personalized Accessories Design. These are offerings within Atelier, not additional top-level order categories. Each offering can preselect a consultation purpose in the demo. Returning clients see their upcoming appointment. Fabric selection remains part of consultation rather than a stock-managed shopping flow. Alteration orders appear in Orders after staff create them; the client app does not offer a Start Alteration action.

### Client consultation booking UI — approved direction

The client chooses in-person or virtual, provides the consultation purpose and preferred date/time, may add notes or reference images, then submits a request. Show **Awaiting confirmation** until authorised staff approve the appointment. If staff propose a different time, the client can accept it or request another change. Once confirmed, show the appointment in Atelier with its location or staff-provided meeting link and actions to reschedule or cancel. Do not present a requested time as a confirmed booking.

### Appointment rules

- Consultation booking is free.
- Support in-person appointments and virtual consultations, including measurement and fitting appointments as appropriate.
- App and shareable link booking; the link authentication/identity flow still needs definition.
- New bookings are pending until owner, manager or receptionist approves.
- If unavailable, staff propose an alternative for the client to accept.
- Clients can cancel or request rescheduling through the app/link. New times require staff approval.
- Twenty-four hours' cancellation notice is preferred, not enforced: cancellation is allowed at any time.
- Remind clients 24 hours and 2 hours before an approved appointment via their preferred channel.
- For late bookings or reschedules, notification handling must avoid obsolete or duplicate reminders; exact behaviour is a technical-design task.
- Send a friendly invitation to rebook only after staff explicitly mark the appointment as a no-show. Time passing alone must not trigger a no-show message.
- Staff attach third-party meeting links for virtual appointments. No built-in video conferencing.

### Messaging

- Support in-app conversations and WhatsApp conversations visible in the management portal.
- Support reference-image sharing for consultation discussions.
- Owner and manager read and reply; receptionist reads only; designer/tailor have no conversation access.
- Clients select email, SMS or WhatsApp as their preferred notification channel.
- Changes to messaging permissions should be confirmed with the NY team later.
- A production WhatsApp connection needs its own integration assessment and approved business setup. Do not promise imports of historical chats or synchronisation from personal WhatsApp accounts. Prototype messages/notifications can be simulated and identified as such.

## 9. Ready-to-wear shopping

- Catalogue browsing and product details with brand photos/content.
- Search by product name; filter by category, size, colour, price and availability.
- Wishlist/favourites supported; reviews and ratings excluded for now.
- Stock tracked by each size/colour/other variant combination.
- The owner portal's first inventory prototype is **Garment inventory** under the Ready-to-Wear service menu. It has product, colour/size/SKU and location records; counted opening stock; low-stock thresholds; and an activity log for stock adjustments. These entries are browser-local and do not update customer-shop availability. **Production inventory** is a separate planned business area for workshop materials and supplies; fabric quantities and reservations remain excluded from current functional scope. Customer-owned alteration garments require a separate custody workflow and must not be treated as saleable stock. Connected garment inventory requires staff authentication, authorised stock changes, reservations against paid orders, and reconciliation with the shop.
- **Automatic purchase logging:** When payment for an in-stock ready-to-wear app order is confirmed, the backend deducts the purchased quantities from the exact SKUs and creates a **Customer purchase** entry in Stock activity for each order line. Each entry shows the purchase time, product, colour or fabric variant, size, SKU, quantity purchased and a clickable order number. Commit the order, stock deductions and activity entries together, and process a repeated confirmation only once. Failed or abandoned payments produce no purchase entries. For pre-orders, record fulfilment against stock when units are allocated.
- Give every approved colour variant its own name, swatch and ordered set of product photos. Selecting a colour replaces the displayed photo set, resets the gallery to its first image, and updates the bag line's colour and thumbnail. Track stock and SKU for each colour/size combination. Use photographed assets for customer-facing colours; generated recolours may serve as labelled design concepts until approved product photos arrive.
- NY team can choose whether sold-out variants accept pre-orders or disable purchase until restocked. Exact role permission for that setting remains to confirm.
- Ready-to-Wear purchases and pre-orders require full payment at checkout in the mobile app and any future customer website. Pay on delivery or pickup is not offered. Actual payment processing is deferred; the prototype demonstrates a simulated full-payment checkout.
- Support letter and numeric sizes and display comparison charts for UK, US and EU sizing.
- Use clearly labelled sample size charts now. Replace with verified NY charts later; do not treat universal size equivalence as reliable.
- Switching sizing system changes presentation, not the stock variant being purchased.

### Currency display

GHS is the base currency. Offer GHS, USD, GBP, EUR, CAD, AUD, NGN, ZAR, AED and CHF. Prototype conversions use clearly labelled sample rates. Later integrate live rates and determine settlement/payment currencies; viewing a currency does not imply the gateway supports it.

### Reported decisions from the design conversation

The project context reports approval of:

- Guided multistep RTW checkout.
- Account-required RTW checkout in the mobile app. Guest RTW checkout is the direction for a future website; that website is outside the current build scope.
- Let clients browse and add items to the bag without signing in. When they tap Checkout in the mobile app, ask them to sign in or create an account, then return them to the preserved bag and checkout flow.
- Simulated full-payment options for Mobile Money (MTN MoMo, Telecel Cash, AT Money) and Visa/Mastercard. Other digital payment options remain to be selected. Bank transfer is excluded from the current payment scope; pay on delivery/pickup is excluded for Ready-to-Wear checkout.
- If simulated payment fails, keep the bag and entered checkout details so the client can retry. Retrying must not create a duplicate order.
- An elegant minimal confirmation screen with order reference, items and payment status, plus Track Order and Continue Shopping/Shop More actions.

Approved mobile RTW checkout sequence:

1. Review the bag.
2. Tap Checkout, then sign in or create an account; preserve the bag.
3. Choose collection or delivery and show the applicable delivery charge.
4. Review the full total and complete simulated full payment by card or Mobile Money.
5. Show order confirmation with Track Order and Continue Shopping.

On simulated payment failure, return to the payment step with the bag and entered details intact. Do not show a confirmed order until payment succeeds; a retry must not create a duplicate order.

Approved checkout screen content:

- Bag: garment photo, size, colour, quantity, price and Checkout action.
- Collection/delivery: selected fulfilment option, address where needed and delivery charge.
- Payment/review: items, applicable discount, delivery charge and full total, followed by card or Mobile Money selection. Label prototype payment as simulated.
- Confirmation: order reference, items, payment status, Track Order and Continue Shopping.
- Failure: remain in checkout with a Retry action; retain the bag and entered details.

The mobile account rule was clarified directly by the user and supersedes the earlier design-chat summary that suggested mobile guest checkout. The user also confirmed full payment at Ready-to-Wear checkout, removed pay on delivery/pickup for RTW, and excluded bank transfer from the current payment scope. These decisions are not a complete screen specification. Payment-failure presentation still needs design; the prototype must not imply real funds were collected.

## 10. Payments and discounts

### Payments: prototype only

Real gateway/payment module is deferred. Named customer checkout methods: Mobile Money and bank cards; additional digital methods are undecided. Bank transfer is excluded from the current payment scope. Staff-recorded cash remains available for in-person transactions. Show mock transaction and payment states without collecting real card credentials or transferring money.

Custom deposit: staff-set per order after consultation. Balance terms: before collection, on delivery or a separately agreed date, whichever suits both parties. Reflect agreed terms on the order. Owner, manager and receptionist can view and record customer deposits/balances. Only owner/manager see business finance records.

Later build a secure payment section suitable for the jurisdictions served, including verified transaction handling, reconciliation and applicable requirements. Tax, refund and currency-settlement rules remain to be assessed.

### Discounts

- Owner, manager and receptionist can apply a manual percentage discount when creating RTW, custom or alteration orders.
- Percentage can range from 0% to 100%; no additional discount-limit approval was requested.
- Record who applied the discount. Reason is optional.
- Owner/manager create and manage codes; receptionist can view available codes and apply them to in-person purchases.
- One discount per order; no stacking a manual discount and promotional code.
- Codes have a defined validity period and may be reused by the same client across multiple orders until expiry. The earlier once-per-client idea was explicitly replaced.
- Owner/manager can restrict codes to selected products or service categories, or make them available generally.
- Support discounting clothing/services and waiving delivery, including an entirely free order.
- Define precise calculation order, rounding and code applicability to delivery during technical design; avoid unintentionally treating a delivery waiver as a second stacked discount.

## 11. Collection and delivery

- Support store collection, delivery within Ghana and international delivery.
- NY team sets delivery rates by location/country; show the applicable charge at checkout.
- Rate-setting permissions, destination coverage, unavailable destinations and address validation need implementation decisions.
- Simple manual fulfilment statuses: Ready for collection/delivery, Out for delivery, Delivered/Collected and Delivery unsuccessful with a note.
- Owner, manager and receptionist update fulfilment states.
- No Google Maps courier tracking, courier integration or tracking-link feature in the prototype. Assess courier integration later only if useful.
- Completion should be reflected consistently in item/order progress and fulfilment status.

### Client Orders and Tracking UI — approved direction

- Use one compact Orders list with clear Ready-to-Wear, Custom and Alterations labels. Each order opens to its own detail view.
- Divide the Orders tab into Active and History views. Put orders needing a client action at the top of Active. Each card shows a garment image or design reference when available, plus order type, reference, current status and expected date; grouped custom orders also show the completed-outfit count.
- Show dated milestones and short, understandable explanations in the order detail view. Keep the list itself concise.
- When the client has an action to take, place a clear action panel above the progress timeline, such as design approval, deposit due or fitting confirmation. When no action is needed, lead with the current order status.
- For a grouped custom order, show each outfit's current status at a glance and an overall count such as “1 of 3 outfits complete.” Keep each outfit's dated timeline collapsed by default and expand it when selected. Do not present the count as a percentage of production time or offer handover before every outfit is ready.
- Show only approved production progress as the official customer status. Keep pending staff submissions and internal notes out of the client view.
- In the current prototype, each garment has a current status but no separate dated garment timeline. Show those statuses directly in the rounded outfit cards; add expandable garment timelines when that data exists. Keep the order-level timeline in Progress. Omit “team preview” and “fictional order” badges from the customer-facing Orders screens.
- Show the relevant manual collection or delivery status in the detail view. No courier map or tracking link is part of the prototype.
- If the expected completion date changes, show the new date and a short customer-facing explanation in the order detail. Do not change the displayed date silently.

Approved order-detail layouts by service type:

- **Ready-to-Wear:** One dated progress timeline, purchased items, payment status and collection or delivery details.
- **Custom:** Any required client action first, followed by overall outfit completion count and collapsed cards with each garment's production timeline. Show payment information and shared collection/delivery status in separate sections; no handover until all garments are ready.
- **Alterations:** Garment and agreed adjustment, expected completion date, progress timeline and handover details. Alteration orders remain staff-created.

Approved client-facing milestone wording for these order types:

| Order type | Milestones |
| --- | --- |
| Ready-to-Wear | Order received → Preparing → Ready for collection/delivery → Collected/Delivered |
| Alterations | Order recorded → Adjustments in progress → Final checks → Ready for collection/delivery → Collected/Delivered |

For delivery orders, show “Out for delivery” between ready and delivered when applicable. “Delivery unsuccessful” is an exception status with a clear client-facing note, not a normal milestone. Custom-order milestone wording remains in Section 6.

## 12. Business finances

The owner portal Finances menu includes Finance overview, Sales & payments, Expenses, Debts & obligations, Recurring bills, Refunds and Reports. The five new workspaces have initial layouts with empty registers; entry, processing and reporting remain to be connected.

Owner and manager only. These records are operational tracking, not a promise of a full accounting/payroll system.

### Expenses

Manual expense entry, optionally attach a receipt photo or PDF. Agree expense categories, reporting detail and editing rules during implementation planning.

### Debts and obligations

Track loans, purchases on credit, repayable advances/favours and other amounts/obligations owed. Keep it simple: who is owed, amount borrowed/original obligation, total agreed repayment, interest/charges, full or partial payments, remaining balance and one deadline. No instalment schedule now. Interest is recorded from agreed terms; automatic accrual or a loan calculator has not been requested.

Example: GHS 1,000 borrowed, GHS 1,500 agreed repayment, GHS 500 interest/charges, GHS 750 repaid, GHS 750 outstanding. For non-monetary favours, retain the obligation description; monetary valuation/completion rules are still to clarify.

### Recurring bills

Record payment date and the period covered. Example: annual rent paid January–December covers that whole period, with renewal at the next agreed date. Owner/manager receive portal and email reminders 30, 20, 10 and 7 days before renewal. Recording the new paid period moves reminders to the next renewal. Do not continue reminder notices for a renewal already paid. Exact billing-date/timezone rules remain technical details to define.

The owner portal has one **Finances → Recurring bills** page. Rent and Utilities are bill categories selected when creating a recurring bill, alongside Other; they are not separate navigation items. The current prototype stores entries only in the browser. Connected bill records, payment entry and reminders remain to be built. Utility types and their billing rules still need to be defined with the NY team.

## 13. Dashboard and reports

Role-aware dashboard agreed to show today's appointments, active/overdue orders, pending approvals, stock alerts and outstanding customer balances as permitted. Only owner/manager see sales, expenses and upcoming business bills. Designers/tailors see assigned work only, not the unrestricted dashboard.

Report outputs, date filters, exports and exact financial calculations remain to agree. A dashboard figure should not imply full accounting or an audited financial statement.

## 14. Non-functional requirements: proposed baseline

These are recommended engineering requirements for review, not previously agreed numeric service guarantees.

| Area | Proposed requirement / acceptance approach |
| --- | --- |
| Privacy and access | Enforce the agreed role and record visibility rules; test allowed and denied access, especially assignments, conversations and finances |
| Data integrity | Keep order categories distinct, retain measurement versions, validate stock transitions and avoid duplicate submissions |
| Auditability | Record key status approvals, measurement approvals, discounts, financial changes and permission changes with actor/time |
| Accessibility | Aim for WCAG 2.2 AA where applicable; validate contrast, text scaling, touch targets and screen-reader labels |
| Usability | Consistent navigation, clear loading/empty/error states, useful validation and readable currency/unit labels |
| Responsiveness | Client mobile layouts for Android/iPhone; portal layouts usable on phones and larger screens |
| Performance | Optimise images and paginate long lists; agree device/network test conditions and numeric targets before production |
| Reliability | Preserve data consistently and make failed/pending operations clear; full offline operation is not agreed |
| Security | Keep secrets out of source/client bundles; design authentication, uploads and access checks before production data is used |
| Recovery | Before production, define backup frequency, restore procedure and acceptable data loss/downtime; demonstrate restore |
| Maintainability | Document dependencies and business rules, use version control and verify critical cross-interface scenarios |
| Environment separation | Keep sample/dev data separate from production; make simulation labels obvious |
| Portability | Handover source/configuration guidance and determine data export/migration needs |

## 15. Architecture and stack decisions

The prototype stack is selected. An early Next.js/TypeScript/Supabase suggestion was made before the dedicated mobile requirement was clarified; Supabase is not the selected backend.

The user selected Expo + React Native + TypeScript for the iPhone/Android client app, React + Next.js for the staff portal, and a Laravel API with PostgreSQL. The current [tech stack document](TECH_STACK_PROPOSAL.md) explains the free local demo path and compares alternatives. GraphQL and WebSockets remain optional API/live-update mechanisms. Production hosting has not been selected.

Implemented foundation: the Expo client and responsive Next.js staff portal read fictional orders from the same Laravel API and local PostgreSQL database. The current API route is read-only and gated for demo use. Later authenticated workflows will extend this shared data contract.

Current Atelier preview: the mobile app opens directly with the fictional Ama Mensah demo profile. It saves consultation requests on that device or browser and shows them as **Awaiting confirmation** in Atelier and Account. The profile is not an authenticated account and requests do not reach the Laravel API or staff portal. The current UI captures method, purpose, preferred date/time and notes; reference images, staff confirmation, rescheduling and real account creation still need connected workflows.

Approved folder boundary: the dedicated `codebase/` folder holds `apps/mobile`, `apps/portal` and `apps/api`, separate from `docs/` and `Logo/`.

Decisions still required:

- Decide whether GraphQL or WebSockets add value after the first connected workflows are specified.
- Define account authentication, staff permissions, file storage and production integrations.
- Verify the Expo SDK 58 app in Expo Go on physical devices; the SDK 57-to-58 upgrade and local dependency checks are complete.
- Deployment/build distribution, ownership of service accounts and eventual hosting.

The current runtime versions, Expo Router navigation, TypeScript use, npm/Composer dependency management, sample-data persistence and reset commands are recorded in [the codebase README](../README.md). Verify current official technical documentation when changing dependencies.

## 16. Proposed implementation sequence

No dates or effort commitments are assigned until scope, design and stack are settled.

| Phase | Work | Exit criteria |
| --- | --- | --- |
| 1. Consolidate decisions | Reconcile design-chat changes, agree prototype/integration boundaries and outstanding rules | Current requirements and contradictions resolved for the first build |
| 2. Design client experience | Agree brand direction, navigation and screen flows in the design chat | Client flows approved, including shopping, appointments, custom requests and profiles |
| 3. Technical foundation | Agree stack, set up project structure/data contracts and connected sample dataset | App/portal foundation runs using documented setup; sample records have stable IDs |
| 4. Client prototype | Build catalogue, filters, wishlist, checkout demo, appointments, custom-order views, measurements and conversations | Primary client journeys usable with realistic sample data and honest simulation labels |
| 5. Management prototype | Build role views, customer/order entry, scheduling, approval workflows, stock/catalogue, discounts and finance views | Staff actions update the same connected sample records where supported |
| 6. End-to-end verification | Exercise approval, history, multi-person orders, permissions and reminders | Core scenarios below pass; defects and limitations documented |
| 7. Prototype review/handover | NY team review, revise documentation, prepare reproducible demonstration | Another developer can run/reset the prototype and understand deferred work |
| Later production phase | Implement approved live integrations and hardening | Separate production readiness review, real controls verified and deployment documented |

## 17. Sample scenarios and acceptance checks

These are behavioural examples for development and handover, not evidence of completed testing.

1. **Family custom order:** One account orders three outfits for father, mother and child. Each has separate measurements and progress. One outfit completes first; no handover is offered until all three are ready.
2. **Category separation:** A client buys a stock shirt and commissions a custom outfit. Create separate RTW and custom references and independent fulfilment records; the stock shirt need not wait for the custom garment.
3. **In-store alteration:** A walk-in tries on a garment. Receptionist creates the customer and an alteration order, records instructions and a next-day date. No app signup is required. Assigning the tailor still requires owner/manager.
4. **Appointment negotiation:** Client requests an in-person slot; receptionist proposes another. Client accepts and staff-approved timing is reflected in the appointment. Reminder schedule follows the final time.
5. **No-show:** Appointment time passes without a staff attendance decision. No follow-up is sent. Staff marks no-show; a friendly rescheduling invitation is then eligible to send.
6. **Virtual consultation:** Approved appointment contains a third-party meeting URL. Opening it goes to that service; no in-app video system is implied.
7. **Measurement change:** Client submits updated measurements after weight change. Manager approves a new version. Old orders continue to reference their original version; both client/staff see relevant history.
8. **Stage review:** Assigned tailor submits sewing completion. The official stage stays unchanged until manager/owner approves. Requested changes return feedback without advancing client progress.
9. **Early production:** Deposit is not received. Normal start is blocked according to the eventual rule implementation; recorded owner/manager authorisation permits an exception.
10. **Stock/pre-order:** A size/colour combination reaches zero. It is either unavailable or accepts a pre-order according to staff configuration; another variant remains separately available.
11. **Discount expiry:** Client uses a valid code on two separate orders. Both are allowed. Attempting to combine it with a manual discount fails; use after expiry fails. Optional reason can be blank.
12. **Private finances:** Receptionist records an order deposit but cannot access rent, loans or expenses. Designer/tailor see only assigned production records and no private conversations.
13. **Annual rent:** Paid January–December is recorded with its covered period. Portal/email reminders are scheduled before the next renewal at 30/20/10/7 days. Recording the renewal prevents obsolete reminders.
14. **Partial repayment:** Record GHS 750 against a GHS 1,500 repayment obligation. Remaining balance displays GHS 750 with the single agreed deadline.
15. **Sizing/currency:** Switching chart region or cm/in display does not change the product variant; changing currency does not mutate the GHS base price. Sample charts/rates remain visibly labelled.
16. **Owner protection:** Manager can manage non-owner staff but cannot grant owner privileges or deactivate the owner.
17. **Delivery issue:** Receptionist marks delivery unsuccessful and records a note. Client receives an understandable status; order is not automatically completed.
18. **Mobile RTW checkout:** A client browses and adds an item to the bag without signing in. Tapping Checkout prompts account sign-in/creation and preserves the bag. Simulated full payment by card or Mobile Money succeeds before the order confirmation appears. A failed attempt retains the bag and entered details; retrying produces one order, not duplicates.

Future website guest checkout is outside the current prototype.

## 18. Deferred-work checklist

Unchecked items represent future work, not implemented features.

- [ ] Build the secure production payments module/gateway and confirm jurisdiction-specific requirements; support the agreed methods and staff cash recording.
- [ ] Define payment verification, reconciliation, refunds, tax treatment and production transaction protections.
- [ ] Connect live exchange rates and confirm supported payment/settlement currencies.
- [ ] Replace sample sizing with NY Atelier's verified size charts, UK/US/EU comparisons and cm/in measurements.
- [ ] Obtain authorised access to existing websites and assess integration, content/data portability and migration.
- [ ] If needed, plan a companion/replacement customer website and migration; do not build it in the current phase.
- [ ] Define order cancellation rules, approvals and refund handling; client order cancellation is currently excluded.
- [ ] Add illustrated measurement-taking guidance later.
- [ ] Confirm expanded messaging roles with the NY team if needed; current rules remain owner/manager reply and receptionist read-only.
- [ ] Assess courier integration later if justified; current delivery tracking is manual, with no maps or courier links.
- [ ] Scope and implement approved live WhatsApp, SMS and email connections and reminder delivery before claiming they work in production.
- [ ] Agree production privacy, retention, recovery and operational ownership requirements.

## 19. Open decisions before/during implementation

- [ ] Design mobile account creation/sign-in screens and recovery behaviour; the account prompt occurs when Checkout is tapped.
- [ ] Select any additional digital checkout methods and refine simulated payment-failure messaging for full-payment RTW checkout.
- [ ] Obtain the original wordmark artwork, verify the supplied monogram colour against the palette, and identify the wordmark font if possible.
- [ ] Bring remaining detailed screen decisions into these documents.
- [ ] Decide where Alterations service information is entered from the client app while keeping alteration order creation staff-only.
- [x] Choose the mobile/portal stack and connected sample-data strategy together; the first read-only order slice uses Laravel and local PostgreSQL.
- [ ] Define appointment availability, duration, staff capacity and conflict handling.
- [ ] Define account verification, recovery and secure linking of walk-in customer histories.
- [ ] Confirm remaining permissions: owner stock updates, pre-order configuration, fabric catalogue editing and delivery rate management.
- [ ] Extend the defined fictional order data and reset behaviour to appointments and measurements.
- [ ] Agree notification handling for absent contact details, failed delivery and last-minute changes.
- [ ] Define currency/discount rounding and financial entry correction rules.
- [ ] Agree reports/export detail and any requirements for styling/wardrobe services beyond the common consultation flow.
- [ ] Confirm returns/exchanges needs; no policy was agreed or inferred from website navigation.

## 20. Documentation and developer handover

Keep this plan current throughout development. The delivered project should eventually include:

- Root README with project purpose, actual implementation status and links to documentation.
- Exact stack/runtime versions, installation and run instructions for app and portal.
- Architecture, repository structure and shared data flow.
- Data model, measurement versioning, service categories and approved state transitions.
- Role/permission matrix with enforcement locations and tests.
- Sample-data setup/reset, demo accounts without real secrets and demonstration scenarios.
- Configuration/environment-variable reference and safe example configuration.
- Test commands, results, known limitations and device/browser coverage.
- Integration status: mocked, configured or live, with operational ownership notes.
- Build/distribution/deployment, backup/restore and maintenance guidance as applicable.
- Change log, technical decisions, deferred checklist and migration notes.

Do not commit credentials, private customer data or private keys. Transfer service account ownership/access securely at handover. Documentation must reflect actual implementation rather than aspirational features.

## 21. Decision log

| Date | Decision | Reason / status |
| --- | --- | --- |
| 2026-11-03 | Consolidate planning into local docs | User requested project-folder documentation for build planning and future developer handover |
| 2026-11-03 | Mobile client first; responsive portal with connected sample orders | Agreed prototype focus; no companion website now |
| 2026-11-03 | Real payments deferred | Prototype is the immediate goal |
| 2026-11-03 | Preserve full measurement history; manager-only verification | Track body changes and maintain order-specific records |
| 2026-11-03 | Separate RTW/custom/alteration orders; no partial fulfilment within grouped orders | Different service workflows and clear client progress |
| 2026-11-03 | Appointment cancellations anytime; 24-hour notice preferred | Replaces the earlier hard cancellation cut-off |
| 2026-11-03 | Discount code reusable until expiry; one discount per order | Replaces the earlier once-per-customer idea |
| 2026-11-03 | Flag guest checkout and pay-on-delivery design changes for reconciliation | Later design summaries differ from earlier planning rules |
| 2026-11-03 | Confirm account-required ordering and tracking in the mobile app; guest RTW checkout applies only to a future website | User clarified the app and website distinction during design planning; resolves the mobile guest-checkout conflict |
| 2026-11-03 | Require full payment at RTW checkout in the app and future website; remove pay on delivery/pickup | User chose completed checkout for domestic and international orders; resolves the pay-later conflict |
| 2026-11-03 | Prompt for mobile account sign-in or creation when the client taps Checkout, preserving the bag | Keeps browsing open while requiring an account before ordering |
| 2026-11-03 | Exclude bank transfer from the current payment scope; use cards and Mobile Money as the named customer methods | User chose immediate digital checkout and left other payment options to be defined |
| 2026-11-03 | Preserve bag and entered details after a failed checkout payment; prevent duplicate orders on retry | User approved a recoverable payment-failure experience |
| 2026-11-03 | Approve the five-step mobile RTW checkout sequence from bag review through confirmation | User approved the proposed screen flow without changes |
| 2026-11-03 | Approve the content hierarchy for bag, fulfilment, payment/review, confirmation and payment failure screens | User confirmed the proposed checkout screen content |
| 2026-11-03 | Compact combined Orders list with category labels; dated milestones and garment-level progress in order details, with outfit timelines collapsed by default | User approved the client tracking presentation during design planning |
| 2026-11-03 | Put client actions above the order progress timeline when action is needed | Makes approvals, deposits and fitting confirmations easy to find; otherwise current status leads |
| 2026-11-03 | Approve Ready-to-Wear and Alterations milestone wording, with Out for delivery when applicable | Plain-language tracking stages for the client app |
| 2026-11-03 | Show a new expected completion date with a short client-facing explanation when it changes | Customers should understand schedule changes in the tracking view |
| 2026-11-03 | Incorporate the shared design chat's visual direction, palette, provisional typography, and approved Home/Shop/Product-detail patterns | Preserves earlier design decisions in the local project plan without reopening them |
| 2026-11-03 | Approve Home, Shop, Atelier, Orders and Account as the five client-app tabs; open bag from Shop and keep checkout focused | User approved the proposed main navigation and Atelier label |
| 2026-11-03 | Refine bottom navigation with soft rounded icons, filled when selected and outlined otherwise | User supplied a mobile shopping reference and specified the active-state treatment |
| 2026-11-03 | Float the five-tab navigation in a rounded glass-like container and use rounded action buttons | User supplied a mobile reference showing a layered pill navigation and asked for rounded buttons going forward |
| 2026-11-03 | Use the supplied NY monogram SVG for the Atelier tab and Home header, highlight the selected tab, and round contained images | User marked the two UI locations and requested the image and active-tab refinements |
| 2026-11-03 | Extend the selected-tab highlight behind both icon and label as a rounded oval and soften the bar's frosted finish | User clarified that “leave it” applied only to inactive tabs; the selected state still needed correction |
| 2026-11-03 | Remove the selected-tab oval and rely on the filled icon to show the active destination | User asked to remove the bounding container after reviewing it in the preview |
| 2026-11-03 | Approve Active/History Orders views, action-priority cards and the order-detail content hierarchy | User approved the Orders tab layout for client tracking |
| 2026-11-03 | Approve distinct Ready-to-Wear, Custom and Alterations order-detail layouts within the shared Orders area | User approved the service-specific tracking content |
| 2026-11-03 | Lead Atelier with consultation booking, followed by bespoke and related service information; show upcoming appointments | User approved the Atelier entry screen direction while preserving staff-created alterations |
| 2026-11-03 | Approve the consultation request, staff confirmation/alternative and confirmed appointment display flow | User approved the client booking journey |
| 2026-11-03 | Clarify custom clothing and bespoke clothing as one Atelier journey and one Custom order category | User corrected the terminology to prevent duplicate journeys |
| 2026-11-03 | Confirm Ready-to-Wear, Alterations and Custom/Bespoke (Atelier) as the three main services | Clarifies the customer-facing service hierarchy without adding a fourth order category |
| 2026-11-03 | Put future app, portal and backend code under a separate `codebase/` folder | User requested a clean boundary between project documentation/assets and code |
| 2026-11-03 | Reopen the backend comparison and document cost, portability and operations tradeoffs | User questioned Supabase and requested more sustainable or less expensive alternatives; no replacement has been approved |
| 2026-11-03 | Record React Native for the customer app and React/Next.js for the staff portal as the preferred front end direction; evaluate GraphQL, WebSockets and TypeScript separately | User expressed these framework preferences and asked why the Android application would use TypeScript |
| 2026-11-03 | Select Expo + React Native + TypeScript for the mobile app and React + Next.js for the web portal; evaluate Laravel + PostgreSQL as a low-subscription-cost backend recommendation | User confirmed the front end choices, asked for Expo team demos and requested backend advice with a preference for free initial use and controlled long-term cost |
| 2026-11-03 | Select Laravel API + PostgreSQL for the prototype and begin the first connected foundation under `codebase/` | User stated the tech stack was agreed and asked what to execute next; the first slice uses fictional orders and no paid services |
| 2026-11-03 | Add wishlist and bag icons to Shop cards, use portrait product images and show a price filter beside the listing heading | User supplied a shopping grid reference and asked to implement these Shop refinements |
| 2026-11-03 | Refine product details around a large image, size selection, a fixed wishlist and Add to Bag bar, and an added confirmation | User supplied two product-detail references; current catalogue has one photo per piece and no verified variant data |
| 2026-11-03 | Add a colour selector to product details and swap the displayed image when a colour is chosen | User requested colour variation preview; Amani black is a generated concept rather than a confirmed stock variant |
| 2026-11-03 | Give each colour its own ordered photo gallery, with arrow and swipe navigation and a view counter | User requested several views per colour; the Amani cream example now uses its existing front, fabric-detail and side images |
| 2026-11-03 | Use a rounded 3:4 portrait frame for each product-detail photo and preserve the full source image | User requested a taller detail image that does not crop the garment |
| 2026-11-03 | Center the floating navigation and add top and bottom system-area spacing with pill-shaped buttons | User reported that the phone UI crowded the Dynamic Island and bottom controls, and that navigation appeared left-aligned |
| 2026-11-03 | Rework product modal safe spacing, center the navigation with equal side insets, show verified colour swatches on Shop cards, add the mark to every page header, and add an expandable fit guide | User supplied an Expo screenshot, marked the product gallery's top margin, and requested these refinements; official size measurements and additional verified colours are still unavailable |
| 2026-11-03 | Fix the floating tab bar to a centered, inset pill near the bottom safe area and layer catalogue colour swatches | User's phone screenshots showed an edge-to-edge, high tab bar and Amani's second colour missing from the Shop card; black remains labelled as a visual preview rather than confirmed stock |
| 2026-11-03 | Extend the Home editorial image to the full opening screen and place its content inside the safe areas | User's phone screenshot showed blank bands above and below the hero image; the status text should remain legible over the image |
| 2026-11-03 | Animate the Home hero as an automatically advancing horizontal carousel with swipe and Next controls, and round the progress indicators | User found the image switch abrupt and the indicator ends too square |
| 2026-11-03 | Restyle Shop-card colour variants as small garment-photo previews in a narrow vertical capsule | User supplied a Shein mobile screenshot showing this treatment; Amani Black stays labelled as an unconfirmed visual preview |
| 2026-11-03 | Refine Shop swatches into smaller close-colour circles, add a New Arrivals tab, and remove NY Edit labels from Shop and Home | User clarified that card swatches should show fabric or colour rather than full outfit thumbnails, and asked that Home's image and changing copy slide while its controls remain fixed |
| 2026-11-03 | Add a product-specific Description section beneath the size options | User asked for a short item description in the place previously occupied by the generic preview size note; copy describes visible design details without asserting unverified fabric or fit specifications |
| 2026-11-03 | Add a quantity selector beneath each product description and use that amount when adding the chosen colour and size to the bag | User asked to buy two or three of the same item from its detail page |
| 2026-11-03 | Expand the Shop preview to nine store-sourced items, show recent-listing and promotion demo badges, and simplify the header and Amani card | User requested at least seven items, New Arrival and discount treatments, removal of Amani's black preview caption below the card, and removal of the Shop header's `/ 01` suffix; no live sales or launch dates were verified |
| 2026-11-03 | Shorten Shop image badges to NEW and OFFER and add a muted OUT OF STOCK example card | User found `PREVIEW` and `DEMO` too prominent on the photos and requested an out-of-stock treatment; all 101 current public listings were marked in stock and none on sale, so the examples are explained outside the badges |
| 2026-11-04 | Add seven brochure-listed Atelier offerings and Home promotional snippets; round the consultation card to 10 points | User supplied the NY Atelier services image, requested promotional snippets on Home, and marked the consultation card's corner radius |

Dates above are the consolidation date, not a claim that every underlying decision was originally made that day. Add future decisions with their actual dates and reasons.


### Tablet showroom decision — 15 November 2026

The NY team approved a tablet showroom for use beside customers. The default starting view is a photo welcome screen with Fittings as the first module card and Ready-to-Wear as the second. Module navigation appears across the top once a module is entered. Staff can show existing garments, colour or fabric variants and available sizes, then open the selected customer's fitting records. Retain dated measurement history. Reuse the portal catalogue and customer records. The first layout is available at the portal's /showroom route and uses the existing local prototype storage and staff customer API. Catalogue changes currently follow browser-local storage, so they do not synchronise between tablets. Staff authentication and cross-device catalogue synchronisation remain outstanding.


### Garment fitting templates — 15 November 2026

The showroom fitting module now offers Kaftan, Agbada, Suit, long-sleeve Shirt, short-sleeve Shirt and fitted Trousers. Each template groups the relevant measurements and specifications. The initial Kaftan, Agbada and Suit field sets include matching trousers. Measurements use centimetres. These starter field sets are implementation proposals for refinement with the NY team.

Saved fitting records retain the garment type, date, entered readings and notes. Existing general fitting records remain available. For garment templates, prior readings from the same garment type appear as references beside blank inputs. Outer robe span, finished lengths and openings are explicitly labelled as garment specifications. Cross-device catalogue synchronisation and staff authentication remain deferred.


### Workspace switcher — 15 November 2026

Restore the slim rail at the far left as a shared workspace switcher. Its first tab opens Owner Workspace with the management menus. Its second tab opens the Tablet Showroom welcome screen, where Fittings precedes Ready-to-Wear. Show the active workspace and accessible labels with hover and keyboard-focus tooltips.


### Showroom welcome screen — 15 November 2026

The showroom opens with the supplied portrait photo, Fittings and Ready-to-Wear module cards beside the model, and the NY mark and name at the bottom. The responsive photo layout supports tablet landscape and portrait. Side rails are hidden throughout the showroom, which has an Owner workspace link on its welcome screen and a compact top bar inside the modules. Returning to the welcome screen retains the current customer and garment selection during the session.


### Ready-to-wear sale desk — 15 November 2026

The showroom's Ready-to-Wear module opens with a searchable garment grid and a current-sale basket. Collection and clothing-type filters narrow the grid. Product name, variant SKU, colour and fabric searches return the parent garment. Tapping a garment opens its gallery and colour/fabric/size selection. Staff can add available size variants to the sale, adjust quantities within available stock and attach a customer. The basket is an in-session draft with a subtotal. Payment, persistent sales, inventory deductions, receipts and confirmed orders are not connected in this iteration.


### Compact fitting selector — 15 November 2026

Replace the six garment template cards with one rounded dropdown and a Start fitting action. Keep the selected template's sections, measurement count and unit in a short summary below it. This retains all garment templates while reducing the fitting panel's height.


### Owner workspace navigation treatment — 15 November 2026

Apply the supplied desktop workspace reference to owner navigation. Keep the deep petrol workspace rail and the user-preferred deep green secondary menu, with separated Workspace, Services and Business groups and restrained filled active states. Remove the duplicate monogram beside the owner workspace name and enlarge the monogram in the slim rail. Give the main content surface a rounded upper-left edge. Existing navigation destinations and submenu contents continue to serve the NY Atelier workflows.


### Persistent workspace corners — 15 November 2026

Keep the owner's main panel within the viewport with rounded upper-left and lower-left corners. Its header stays above an independently scrolling content area. The sidebar scrolls separately when needed. On narrow screens the existing horizontal menu sits above the bounded content panel. Reset the content scroll position when navigating to another page or record.
