export const atelierServices = [
  {
    number: '01', id: 'couture', title: 'Couture Experience', purpose: 'Couture Experience',
    note: 'One-of-a-kind garments handcrafted around your personal style.',
    description: 'Experience haute couture through a one-of-a-kind design handcrafted for you. Each garment is conceived as a work of art, with details that express your personal style and make a statement of elegance.',
    image: require('../../assets/ny/home-green.jpg'),
  },
  {
    number: '02', id: 'bespoke', title: 'Bespoke Tailor-Made Clothing', purpose: 'Custom clothing',
    note: 'Made to your measurements, from fabric choice to final stitch.',
    description: 'Work with the Atelier to choose your fabric, fit and finishing details. From the fabric choice to the final stitch, your piece is made to your measurements and specifications for a fit and style of your own.',
    image: require('../../assets/ny/atelier.jpg'),
  },
  {
    number: '03', id: 'special-events', title: 'Unique Idea Development for Special Events', purpose: 'Special event outfit',
    note: 'A distinctive look for a wedding, gala or milestone.',
    description: 'Bring your ideas for a wedding, gala or other significant occasion. Our team works with you to develop an outfit concept that captures the spirit of the event and reflects your personal flair.',
    image: require('../../assets/ny/home-blue.jpg'),
  },
  {
    number: '04', id: 'consultancy', title: 'Consultancy Services', purpose: 'Consultancy Services',
    note: 'Personal styling, wardrobe curation and shopping advice.',
    description: 'Get guidance on styling, wardrobe curation and personal shopping. Whether you are updating your wardrobe or looking for ways to pair accessories with an outfit, we can help you make choices that suit you.',
    image: require('../../assets/ny/product-aurel-tunic.jpg'),
  },
  {
    number: '05', id: 'fabric', title: 'Custom Fabric Selection', purpose: 'Custom Fabric Selection',
    note: 'Explore luxury fabrics for the look and feel you want.',
    description: 'Choose from a selection of luxury fabrics with guidance from the Atelier. Explore texture, pattern and finish, and find a fabric that suits your garment and how you want it to feel and move.',
    image: require('../../assets/ny/product-amani-cream-detail.jpg'),
  },
  {
    number: '06', id: 'wardrobe', title: 'Wardrobe Revamping', purpose: 'Wardrobe Revamping',
    note: 'Refresh your wardrobe with pieces that fit your lifestyle.',
    description: 'Give your wardrobe a fresh start with advice on pieces that fit your lifestyle. Build a wardrobe that works day to day, brings in trends you enjoy and still feels like your own style.',
    image: require('../../assets/ny/product-old-money.png'),
  },
  {
    number: '07', id: 'accessories', title: 'Personalized Accessories Design', purpose: 'Personalized Accessories Design',
    note: 'Find or design finishing touches that complement your outfit.',
    description: 'Complete your look with accessories designed or selected to complement your outfit. Explore options such as bespoke jewellery, handcrafted shoes and bags to find the finishing touch.',
    image: require('../../assets/ny/product-amani-cream-side.jpg'),
  },
] as const;

export type AtelierService = (typeof atelierServices)[number];
