// Snapshot of product names / observed prices from NY Atelier-owned sites.
// This IS NOT live stock, pricing, or a product feed. Images are temporary remote references.
// Product imagery is curated separately before launch.
export const PRODUCTS = [
  {id:'aegis-set',name:'Aegis Set',gender:'Men',collection:'The RTW Edit',price:960,originalPrice:1200,tag:'THE RTW EDIT',image:'https://rtw.thenyatelier.com/wp-content/uploads/2021/08/rtw-1-1.jpg',description:'A considered everyday statement with thoughtful proportions and a quietly confident finish.'},
  {id:'amani-set',name:'Amani Set',gender:'Men',collection:'The RTW Edit',price:960,originalPrice:1200,tag:'THE RTW EDIT',image:'https://rtw.thenyatelier.com/wp-content/uploads/2021/08/rtw-2.jpg',description:'A modern ready-to-wear set made for moments that call for refined ease.'},
  {id:'arctic-edge-set',name:'Arctic Edge Set',gender:'Men',collection:'The RTW Edit',price:960,originalPrice:1200,tag:'THE RTW EDIT',image:'https://rtw.thenyatelier.com/wp-content/uploads/2021/08/rtw-3.jpg',description:'Clean lines, considered texture and a contemporary approach to traditional elegance.'},
  {id:'ashwood-crest-set',name:'Ashwood Crest Set',gender:'Men',collection:'The RTW Edit',price:1040,originalPrice:1300,tag:'THE RTW EDIT',image:'https://rtw.thenyatelier.com/wp-content/uploads/2021/08/rtw-4.jpg',description:'Polished tailoring and deliberate details from the ready-to-wear edit.'},
  {id:'regal',name:'Regal',gender:'Women',collection:'Signature Pieces',price:7000,tag:'SIGNATURE',image:'https://thenyatelier.com/wp-content/uploads/2025/08/p-18-2-600x800.jpg',description:'A bold signature piece that brings a distinctive point of view to occasion dressing.'},
  {id:'effortless-elegance',name:'Effortless Elegance',gender:'Women',collection:'Signature Pieces',price:1200,tag:'SIGNATURE',image:'https://thenyatelier.com/wp-content/uploads/2025/08/p-17-1-600x800.jpg',description:'Understated confidence and refined lines for an effortlessly memorable look.'},
  {id:'dionny-black',name:'Dionny — Black',gender:'Women',collection:'Dionny',price:1500,tag:'DIONNY',image:'https://thenyatelier.com/wp-content/uploads/2025/06/p-9-1-600x800.jpg',description:'Deep black, regal accents and a statement silhouette from the Dionny Collection.'},
  {id:'dionny-wine',name:'Dionny — Wine',gender:'Women',collection:'Dionny',price:1500,tag:'DIONNY',image:'https://thenyatelier.com/wp-content/uploads/2025/06/p-1-600x800.jpg',description:'Rich colour and a striking sense of occasion, expressed through the Dionny Collection.'},
];

export const HERO_SLIDES = [
  {image:'/images/editorial/01-landscape.webp',portrait:'/images/editorial/01-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt editorial portrait beside a chair'},
  {image:'/images/editorial/02-landscape.webp',portrait:'/images/editorial/02-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt editorial portrait with a car'},
  {image:'/images/editorial/03-landscape.webp',portrait:'/images/editorial/03-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt editorial portrait by a pool'},
  {image:'/images/editorial/04-landscape.webp',portrait:'/images/editorial/04-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt editorial portrait beside a car'},
  {image:'/images/editorial/05-landscape.webp',portrait:'/images/editorial/05-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt editorial portrait on a sofa'},
  {image:'/images/editorial/06-landscape.webp',portrait:'/images/editorial/06-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt editorial portrait by a chair'},
  {image:'/images/editorial/07-landscape.webp',portrait:'/images/editorial/07-portrait.webp',alt:'NY Atelier ready-to-wear striped shirt close-up editorial portrait'},
];

export const SERVICES = [
  {number:'01',name:'Bespoke tailoring',copy:'A garment shaped around your measurements, vision and the way you want to feel.'},
  {number:'02',name:'Couture experience',copy:'One-of-a-kind concepts for the moments when ordinary is simply not enough.'},
  {number:'03',name:'Occasion & ceremonial wear',copy:'Purposeful clothing for weddings, celebrations and landmark occasions.'},
  {number:'04',name:'Personal styling',copy:'Thoughtful guidance on your style, wardrobe and pieces that express you.'},
  {number:'05',name:'Wardrobe refinement',copy:'Revisit what you own, build versatility and create a wardrobe that feels like you.'},
  {number:'06',name:'Fabric & concept selection',copy:'An intentional approach to fabrics, finishes, accents and custom design ideas.'},
];

export const formatGHS = value => new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',minimumFractionDigits:0,maximumFractionDigits:0}).format(value);
export const findProduct = id => PRODUCTS.find(p=>p.id===id);

/** Home photo row under "Follow the house": six different clients from the image library. */
export const HOME_GALLERY = [
  { src: '/images/home/gallery-49.webp', alt: 'A client on a bicycle in a plum NY Atelier set with gold piping' },
  { src: '/images/home/gallery-40.webp', alt: 'A client in a green floral jacquard NY Atelier jacket' },
  { src: '/images/home/gallery-66.webp', alt: 'Two clients in ivory NY Atelier linen beside a classic car' },
  { src: '/images/home/gallery-37.webp', alt: 'A bride and groom in NY Atelier occasion wear' },
  { src: '/images/home/gallery-14.webp', alt: 'A client in a structured black NY Atelier suit' },
  { src: '/images/home/gallery-42.webp', alt: 'A client in a cocoa-brown floral jacquard NY Atelier set' },
];
