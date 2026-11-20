import { redCloverCollectionInfo } from './collection-info';

export const redCloverCollection = {
  ...redCloverCollectionInfo,
  photos: [
    { id: 'campaign-front', label: 'Front look', image: require('../../assets/ny/royal-blue-stripes-1.jpg') },
    { id: 'campaign-side', label: 'Side look', image: require('../../assets/ny/royal-blue-stripes-2.jpg') },
    { id: 'campaign-field', label: 'Field look', image: require('../../assets/ny/royal-blue-stripes-3.jpg') },
    { id: 'campaign-detail', label: 'Pocket detail', image: require('../../assets/ny/royal-blue-stripes-4.jpg') },
  ],
};

export const shopCollections = [redCloverCollection];

export const redCloverEditionPhotos = {
  navy: [
    { id: 'front', label: 'Front', image: require('../../assets/ny/red-clover-navy-front.png') },
    ...redCloverCollection.photos,
  ],
  olive: [
    { id: 'front', label: 'Front', image: require('../../assets/ny/red-clover-olive-front.png') },
    { id: 'campaign-front', label: 'Front look', image: require('../../assets/ny/red-clover-olive-campaign-front.png') },
    { id: 'campaign-side', label: 'Side look', image: require('../../assets/ny/red-clover-olive-campaign-side.png') },
    { id: 'campaign-field', label: 'Field look', image: require('../../assets/ny/red-clover-olive-campaign-field.png') },
    { id: 'campaign-detail', label: 'Pocket detail', image: require('../../assets/ny/red-clover-olive-campaign-detail.png') },
  ],
  claret: [
    { id: 'front', label: 'Front', image: require('../../assets/ny/red-clover-claret-front.png') },
    { id: 'campaign-front', label: 'Front look', image: require('../../assets/ny/red-clover-claret-campaign-front.png') },
    { id: 'campaign-side', label: 'Side look', image: require('../../assets/ny/red-clover-claret-campaign-side.png') },
    { id: 'campaign-field', label: 'Field look', image: require('../../assets/ny/red-clover-claret-campaign-field.png') },
    { id: 'campaign-detail', label: 'Pocket detail', image: require('../../assets/ny/red-clover-claret-campaign-detail.png') },
  ],
  pinstripe: [
    { id: 'front', label: 'Front', image: require('../../assets/ny/red-clover-pinstripe-front.png') },
    { id: 'campaign-front', label: 'Front look', image: require('../../assets/ny/red-clover-pinstripe-campaign-front.png') },
    { id: 'campaign-side', label: 'Side look', image: require('../../assets/ny/red-clover-pinstripe-campaign-side.png') },
    { id: 'campaign-field', label: 'Field look', image: require('../../assets/ny/red-clover-pinstripe-campaign-field.png') },
    { id: 'campaign-detail', label: 'Pocket detail', image: require('../../assets/ny/red-clover-pinstripe-campaign-detail.png') },
  ],
};
