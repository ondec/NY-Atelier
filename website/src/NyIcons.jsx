import { createElement } from 'react';
import icons from './ny-icons.json';

const names = {
  ArrowLeft: 'arrow-left',
  ArrowRight: 'arrow-right',
  ArrowUpRight: 'arrow-up-right',
  ChevronDown: 'chevron-down',
  Check: 'check',
  Heart: 'heart',
  Menu: 'list',
  Minus: 'minus',
  Plus: 'plus',
  Search: 'search',
  ShoppingBag: 'bag',
  X: 'close',
};

function reactAttributes(attributes) {
  return Object.fromEntries(Object.entries(attributes).map(([name, value]) => [
    name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
    value,
  ]));
}

function renderNode(node, key) {
  return createElement(node.tag, { ...reactAttributes(node.attrs), key },
    node.children.map((child, index) => renderNode(child, index)));
}

function NyIcon({ name, size = 24, fill, ...props }) {
  const definition = icons[names[name]];
  return createElement('svg', {
    ...reactAttributes(definition.attrs),
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    strokeWidth: 2.25,
    fill: fill ?? definition.attrs.fill,
    'aria-hidden': true,
    focusable: false,
    ...props,
  }, definition.children.map((child, index) => renderNode(child, index)));
}

const icon = name => props => <NyIcon name={name} {...props} />;

export const ArrowLeft = icon('ArrowLeft');
export const ArrowRight = icon('ArrowRight');
export const ArrowUpRight = icon('ArrowUpRight');
/** Down arrow for links to a place further down the same page. */
export const ArrowDown = ({ style, ...props }) => <NyIcon name="ArrowRight" style={{ transform: 'rotate(90deg)', ...style }} {...props} />;
export const ChevronDown = icon('ChevronDown');
export const Check = icon('Check');
export const Heart = icon('Heart');
export const Menu = icon('Menu');
export const Minus = icon('Minus');
export const Plus = icon('Plus');
export const Search = icon('Search');
export const ShoppingBag = icon('ShoppingBag');
export const X = icon('X');
