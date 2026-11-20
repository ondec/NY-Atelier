export const demoSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
type Size = typeof demoSizes[number];
type DemoVariant = {
  id: string;
  colour: string;
  fabric?: string;
  swatch: string;
  stock: Partial<Record<Size, number>>;
};

export const demoStock: Readonly<Record<string, readonly DemoVariant[]>> = {
  ember: [
    { id: 'black-white', colour: 'Black & white', swatch: '#252527', stock: { S: 3, M: 7, L: 4, XL: 2 } },
    { id: 'indigo', colour: 'Indigo', swatch: '#374c6b', stock: { M: 4, L: 5, XL: 1 } },
    { id: 'sand', colour: 'Sand', swatch: '#baa484', stock: { S: 2, M: 5, L: 3 } },
  ],
  'heritage-stripe-navy': [
    { id: 'navy', colour: 'Navy blue', swatch: '#25334A', stock: { S: 2, M: 6, L: 7, XL: 3, '2XL': 1 } },
    { id: 'charcoal', colour: 'Charcoal', swatch: '#43474b', stock: { M: 3, L: 5, XL: 4, '2XL': 2, '3XL': 1 } },
  ],
  'redclover-navy': [
    { id: 'navy', colour: 'Navy blue', swatch: '#31568D', stock: { S: 4, M: 5, L: 3, XL: 0 } },
    { id: 'olive', colour: 'Olive', swatch: '#626546', stock: { S: 2, M: 4, L: 6 } },
    { id: 'claret', colour: 'Claret', swatch: '#733c47', stock: { M: 6, L: 3, XL: 2 } },
    { id: 'pinstripe', colour: '', fabric: 'Pinstripe cotton', swatch: '#9a958c', stock: { S: 3, M: 4, L: 4, XL: 2, '2XL': 1 } },
  ],
  'old-money': [
    { id: 'black', colour: 'Black', swatch: '#212023', stock: { S: 3, M: 4, L: 6, XL: 3 } },
    { id: 'espresso', colour: 'Espresso', swatch: '#493229', stock: { M: 3, L: 4, XL: 1 } },
    { id: 'oat', colour: 'Oat', swatch: '#d1c1a0', stock: { S: 4, M: 6, L: 2, XL: 2, '2XL': 1 } },
  ],
  aegis: [
    { id: 'navy', colour: 'Navy', swatch: '#202431', stock: { S: 2, M: 5, L: 6, XL: 3, '2XL': 2, '3XL': 1 } },
    { id: 'slate', colour: 'Slate', swatch: '#5f6973', stock: { M: 3, L: 4, XL: 2, '2XL': 2 } },
    { id: 'forest', colour: 'Forest', swatch: '#3c5344', stock: { S: 3, M: 4, L: 4 } },
  ],
  'milano-pants': [
    { id: 'brown', colour: 'Brown', swatch: '#9A673E', stock: { S: 3, M: 5, L: 2, XL: 1 } },
    { id: 'stone', colour: 'Stone', swatch: '#b8ad99', stock: { S: 4, M: 6, L: 3 } },
    { id: 'black', colour: 'Black', swatch: '#222326', stock: { M: 2, L: 4, XL: 4, '2XL': 2 } },
  ],
  amani: [
    { id: 'cream', colour: 'Cream', swatch: '#DCCB9B', stock: { S: 3, M: 5, L: 4, XL: 2 } },
    { id: 'black-preview', colour: 'Black', swatch: '#242424', stock: { S: 2, M: 3, L: 4, XL: 1 } },
    { id: 'green', colour: 'Green', swatch: '#42634b', stock: { S: 10, M: 5, L: 5 } },
    { id: 'red', colour: 'Red', swatch: '#963d43', stock: { M: 4, L: 3, XL: 2, '2XL': 1 } },
  ],
  arctic: [
    { id: 'white', colour: 'White', swatch: '#EDEDEB', stock: { S: 4, M: 6, L: 3, XL: 2 } },
    { id: 'ice-blue', colour: 'Ice blue', swatch: '#a9bdc9', stock: { S: 3, M: 4, L: 2 } },
    { id: 'linen', colour: '', fabric: 'Natural linen', swatch: '#cabf9e', stock: { M: 5, L: 4, XL: 3, '2XL': 2, '3XL': 1 } },
  ],
  'aurel-tunic': [
    { id: 'white', colour: 'White', swatch: '#E9E9E7', stock: { S: 4, M: 7, L: 5, XL: 2, '2XL': 1 } },
    { id: 'ink', colour: 'Ink', swatch: '#333b50', stock: { S: 2, M: 4, L: 3, XL: 1 } },
    { id: 'gold', colour: 'Soft gold', swatch: '#c3a974', stock: { M: 3, L: 4, XL: 2 } },
  ],
};

export function unitsOnHand(stock: DemoVariant['stock']) {
  return Object.values(stock).reduce((total, quantity) => total + quantity, 0);
}
