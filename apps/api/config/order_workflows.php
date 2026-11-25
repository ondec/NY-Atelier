<?php

return [
    /**
     * Agreed with the owner on 25 November 2026 (docs/ORDER_FLOWS.md). "auto" stages move by themselves: order saved,
     * fitting linked, sent to production. "customer_notify" stages always notify the customer (main stages only).
     */
    'stages' => [
        'received' => ['label' => 'Order created', 'action' => 'Create order', 'help' => 'The order is recorded and linked to the customer.', 'auto' => true],
        'measurements' => ['label' => 'Measurements confirmed', 'action' => 'Confirm measurements', 'help' => 'Moves on its own when the customer’s fitting is linked to the order.', 'auto' => true],
        'design' => ['label' => 'Design & quotation approved', 'action' => 'Record design approval', 'help' => 'Moves on its own when the front desk sends the order to production.', 'auto' => true],
        'assessment' => ['label' => 'Assessment done', 'action' => 'Record assessment', 'help' => 'Moves on its own when the front desk sends the order to production.', 'auto' => true],
        'in_production' => ['label' => 'In production', 'action' => 'Start production', 'help' => 'The production manager assigns a tailor and inspects the finished work.', 'auto' => true],
        'production_done' => ['label' => 'Production done', 'action' => 'Mark production done', 'help' => 'The garment is made and has passed the production manager’s inspection.'],
        'packaged' => ['label' => 'Packaged', 'action' => 'Mark packaged', 'help' => 'Every garment is checked and packed for handover.'],
        'ready_collection' => ['label' => 'Ready for collection', 'action' => 'Mark ready for collection', 'help' => 'The packaged order is at the agreed collection point.'],
        'collected' => ['label' => 'Collected', 'action' => 'Confirm collection', 'help' => 'Record who collected the order and any handover notes.', 'terminal' => true, 'note_required' => true],
        'out_for_delivery' => ['label' => 'Out for delivery', 'action' => 'Mark out for delivery', 'help' => 'The parcel is on its way to the customer.'],
        'delivered' => ['label' => 'Delivered', 'action' => 'Confirm delivery', 'help' => 'Record the recipient and delivery confirmation.', 'terminal' => true, 'note_required' => true],
    ],
    'preparation' => [
        'Ready-to-Wear' => ['received', 'packaged'],
        'Alterations' => ['received', 'assessment', 'in_production', 'production_done', 'packaged'],
        'Custom' => ['received', 'measurements', 'design', 'in_production', 'production_done', 'packaged'],
    ],
    /** Stages owned by NY Production: In production starts when the order is sent; the production manager records the rest. */
    'production' => [
        'Alterations' => ['in_production', 'production_done', 'packaged'],
        'Custom' => ['in_production', 'production_done', 'packaged'],
    ],
    /** Customers see these as one "In production" step. */
    'production_customer_group' => ['in_production', 'production_done'],
    'production_customer_step' => ['label' => 'In production', 'help' => 'Your garment is being made in the Atelier workroom.'],
    'customer_notify' => ['received', 'in_production', 'ready_collection', 'out_for_delivery', 'collected', 'delivered'],
    'handover' => [
        'Collection' => ['ready_collection', 'collected'],
        'Delivery' => ['out_for_delivery', 'delivered'],
    ],
    'customer_help' => [
        'received' => 'The team has received your order and linked it to your account.',
        'measurements' => 'The team will confirm your measurements.',
        'design' => 'The design, fabric and quotation are agreed with the Atelier.',
        'assessment' => 'The team will confirm the adjustments you would like.',
        'packaged' => 'Your garments will be packed for collection or delivery.',
        'ready_collection' => 'We will let you know when your order is ready to collect.',
        'collected' => 'Collect your order at the agreed location. The team will confirm the handover.',
        'out_for_delivery' => 'The courier will bring your parcel to the agreed delivery address.',
        'delivered' => 'Delivery will be confirmed once your parcel has been received.',
    ],
    /** The shared front-desk (NY Studio) mailbox: told when production sends an order back and when an online order arrives. */
    'front_desk_email' => env('NY_FRONT_DESK_EMAIL'),
    'email_enabled' => (bool) env('ORDER_UPDATE_EMAIL_ENABLED', false),
    'sms_endpoint' => env('ORDER_UPDATE_SMS_ENDPOINT'),
    'sms_token' => env('ORDER_UPDATE_SMS_TOKEN'),
];
