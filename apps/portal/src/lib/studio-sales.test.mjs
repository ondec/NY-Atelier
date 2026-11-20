import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier)){try{return nextResolve(`${specifier}.ts`,context);}catch{}}return nextResolve(specifier,context);}});
const { amountToMinor,salePhoto }=await import('./studio-sales.ts');
const { emptyInventory,variantKey }=await import('./inventory.ts');
test('cash parsing is exact in pesewas and rejects invalid or excessive precision',()=>{
  assert.equal(amountToMinor('19.99'),1999);assert.equal(amountToMinor('0.01'),1);assert.equal(amountToMinor('1200'),120000);assert.equal(amountToMinor('12.5'),1250);
  for(const value of ['-10','1e3','NaN','12.345','','1,200','9999999999'])assert.equal(amountToMinor(value),null);
});
test('basket image follows each selected colour or fabric using the same gallery as product preview',()=>{
  const product=emptyInventory.products.find(row=>row.id==='shop-redclover-navy');
  for(const [colour,fabric,edition]of [['Olive',undefined,'olive'],['Claret',undefined,'claret'],['','Pinstripe cotton','pinstripe']]){
    const variant=emptyInventory.variants.find(row=>row.productId===product.id&&row.colour===colour&&row.fabric===fabric);
    assert.equal(salePhoto(emptyInventory,product,variant),`/collections/red-clover-${edition}-front.png`);
  }
});
test('uploaded variant galleries and photos take precedence before garment fallback',()=>{
  const product={id:'test',name:'Shirt',type:'Tops & shirts',price:10,photo:'/default.jpg'};
  const variant={productId:'test',colour:'Green',size:'M',sku:'G-M',id:'green',quantity:2,reorderAt:1};const key=variantKey(variant);
  assert.equal(salePhoto({visuals:{[key]:{gallery:['/green.jpg'],photo:'/fabric.jpg'}}},product,variant),'/green.jpg');
  assert.equal(salePhoto({visuals:{[key]:{photo:'/green.jpg'}}},product,variant),'/green.jpg');
  assert.equal(salePhoto({},product,variant),'/default.jpg');
});
