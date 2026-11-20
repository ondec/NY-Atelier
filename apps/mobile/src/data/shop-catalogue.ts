import { productSizing } from './product-sizing';
import type { PurchasableVariant, SizingProfile } from '../lib/sizing';
import { redCloverEditionPhotos } from '@/data/shop-collections';
import { demoStock, unitsOnHand } from '@/data/demo-stock';

type ProductPhoto = { id: string; label: string; image: number };
type ProductColor = { id: string; name: string; swatch: string; photos: ProductPhoto[]; concept?: boolean; inventory?: PurchasableVariant[]; stock?: (typeof demoStock)[string][number]["stock"] };
export type ClothingType = 'tops' | 'trousers' | 'sets' | 'accessories';
export type ColorGroup = 'black' | 'blue' | 'light' | 'brown';
export type Product = { sizing?: SizingProfile; id: string; name: string; description: string; price: string; priceValue: number; image: number; category: string; clothingType: ClothingType; colorGroups: ColorGroup[]; colors: ProductColor[]; newArrivalPreview?: boolean; promotionPreviewPrice?: string; stockStateExample?: boolean };
const catalogue: Product[] = [
  {
    id: 'ember', name: 'The Ember Pocket', description: 'A black-and-white striped shirt with a contrast collar, sleeves and chest pocket. The graphic front gives this look its character.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-ember.jpg'), category: 'MEN', clothingType: 'tops', colorGroups: ['black'], newArrivalPreview: true,
    colors: [{ id: 'black-white', name: 'Black & white', swatch: '#252527', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-ember.jpg') }] }],
  },
  {
    id: 'heritage-stripe-navy', name: 'Heritage Stripe Set — Navy Blue Edition', description: 'Navy and white stripes meet solid navy pocket panels, collar and trousers in a coordinated look.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-heritage-stripe-navy.jpg'), category: 'MEN', clothingType: 'sets', colorGroups: ['blue'], newArrivalPreview: true,
    colors: [{ id: 'navy', name: 'Navy blue', swatch: '#25334A', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-heritage-stripe-navy.jpg') }] }],
  },
  {
    id: 'redclover-navy', name: 'Red Clover Set', description: 'A short-sleeve striped top with a small red clover on the pocket, paired with coordinating trousers.', price: 'GH₵ 1,200', priceValue: 1200, image: redCloverEditionPhotos.navy[0].image, category: 'MEN', clothingType: 'sets', colorGroups: ['blue'], newArrivalPreview: true,
    colors: [
      { id: 'navy', name: 'Navy blue', swatch: '#31568D', photos: redCloverEditionPhotos.navy },
      { id: 'olive', name: 'Olive', swatch: '#626546', photos: redCloverEditionPhotos.olive },
      { id: 'claret', name: 'Claret', swatch: '#733C47', photos: redCloverEditionPhotos.claret },
      { id: 'pinstripe', name: 'Pinstripe cotton', swatch: '#9A958C', photos: redCloverEditionPhotos.pinstripe },
    ],
  },
  {
    id: 'old-money', name: 'Old Money Set', description: 'An all-black look with a textured panel on one side of the shirt and matching relaxed trousers.', price: 'GH₵ 1,300', priceValue: 1300, image: require('../../assets/ny/product-old-money.png'), category: 'MEN', clothingType: 'sets', colorGroups: ['black'], promotionPreviewPrice: 'GH₵ 1,500',
    colors: [{ id: 'black', name: 'Black', swatch: '#212023', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-old-money.png') }] }],
  },
  {
    id: 'aegis', name: 'Aegis Set', description: 'A deep navy matching set with a longline top, offset button detail and a neat chest pocket. A clean, confident look for the moments that call for it.', price: 'GH₵ 1,150', priceValue: 1150, image: require('../../assets/ny/product-aegis.png'), category: 'MEN', clothingType: 'sets', colorGroups: ['blue'],
    colors: [{ id: 'navy', name: 'Navy', swatch: '#202431', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-aegis.png') }] }],
  },
  {
    id: 'milano-pants', name: 'Milano Pleated Pants', description: 'Brown pleated trousers with a gathered waist, roomy legs and a relaxed finish.', price: 'GH₵ 500', priceValue: 500, image: require('../../assets/ny/product-milano-pants.png'), category: 'MEN', clothingType: 'trousers', colorGroups: ['brown'],
    colors: [{ id: 'brown', name: 'Brown', swatch: '#9A673E', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-milano-pants.png') }] }],
  },
  {
    id: 'amani', name: 'Amani Set', description: 'A coordinated set with a button-front top and patterned pocket accents. Its simple lines let the details stand out.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-amani.jpg'), category: 'MEN', clothingType: 'sets', colorGroups: ['light'],
    colors: [
      { id: 'cream', name: 'Cream', swatch: '#DCCB9B', photos: [
        { id: 'front', label: 'Front', image: require('../../assets/ny/product-amani.jpg') },
        { id: 'detail', label: 'Fabric detail', image: require('../../assets/ny/product-amani-cream-detail.jpg') },
        { id: 'side', label: 'Side', image: require('../../assets/ny/product-amani-cream-side.jpg') },
      ] },
      { id: 'black-preview', name: 'Black', swatch: '#242424', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-amani-black-preview.jpg') }], concept: true },
    ],
  },
  {
    id: 'arctic', name: 'Arctic Edge Set', description: 'A white matching set with dark contrast trim and a clean half-placket neckline. A sharp, understated finish from top to trouser.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-arctic.png'), category: 'MEN', clothingType: 'sets', colorGroups: ['light'],
    colors: [{ id: 'white', name: 'White', swatch: '#EDEDEB', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-arctic.png') }] }],
  },
  {
    id: 'aurel-tunic', name: 'The Aurel Signature Tunic', description: 'A white longline tunic with a clean front and gold-toned chest detail.', price: 'GH₵ 1,200', priceValue: 1200, image: require('../../assets/ny/product-aurel-tunic.jpg'), category: 'MEN', clothingType: 'tops', colorGroups: ['light'],
    colors: [{ id: 'white', name: 'White', swatch: '#E9E9E7', photos: [{ id: 'front', label: 'Front', image: require('../../assets/ny/product-aurel-tunic.jpg') }] }],
  },
];
export const products = catalogue.map((entry): Product => {
  const product = { ...entry, sizing: entry.sizing ?? productSizing[entry.id] };
  const variants = demoStock[product.id];
  if (!variants) return product;

  const colors = variants.map((variant): ProductColor => {
    const original = product.colors.find((color) => color.id === variant.id);
    return {
      id: variant.id,
      name: [variant.colour, variant.fabric].filter(Boolean).join(' · '),
      swatch: variant.swatch,
      photos: original?.photos ?? [],
      concept: original?.concept,
      stock: variant.stock,
      inventory: original?.inventory,
    };
  });
  return { ...product, colors, stockStateExample: variants.every((variant) => unitsOnHand(variant.stock) === 0) };
});
