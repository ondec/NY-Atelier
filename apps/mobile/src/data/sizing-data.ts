import reference from './size-charts.json';
import overrides from './size-chart-overrides.json';
import { parseReferenceDataset, validateOverrides } from '../lib/sizing';

// Validate once at the data boundary, before any product screen consumes sizing.
export const referenceSizing = parseReferenceDataset(reference);
export const approvedSizingCharts = validateOverrides(overrides);
