import assert from 'node:assert/strict';
import test from 'node:test';
import {compressedPhotoName, keepCompressed, photoTargetSize} from './image-compression.ts';

test('large phone photos are scaled so the longest side is 3000 pixels, keeping the shape', () => {
  assert.deepEqual(photoTargetSize(4032, 3024), {width: 3000, height: 2250, resized: true});
  assert.deepEqual(photoTargetSize(3024, 4032), {width: 2250, height: 3000, resized: true});
});

test('photos already within the limit are never enlarged', () => {
  assert.deepEqual(photoTargetSize(1200, 800), {width: 1200, height: 800, resized: false});
  assert.deepEqual(photoTargetSize(3000, 10), {width: 3000, height: 10, resized: false});
});

test('the compressed copy is kept only when it saves space or the photo was scaled down', () => {
  assert.equal(keepCompressed(5_000_000, 900_000, false), true);
  assert.equal(keepCompressed(400_000, 380_000, false), false);
  assert.equal(keepCompressed(400_000, 450_000, true), true);
});

test('compressed photos get a .jpg name', () => {
  assert.equal(compressedPhotoName('IMG_2041.HEIC'), 'IMG_2041.jpg');
  assert.equal(compressedPhotoName('suit.front.png'), 'suit.front.jpg');
  assert.equal(compressedPhotoName('.png'), 'photo.jpg');
});
