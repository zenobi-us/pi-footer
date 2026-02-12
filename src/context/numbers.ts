import { Footer } from '../footer.ts';
import type { PipelineTransform } from '../core/pipeline.ts';

/* Transform: convert seconds into compact d/h/m/s representation. */
const humanise_time: PipelineTransform = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const seconds = Math.max(0, Math.round(value));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  let text: string;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${minutes}m`;
  else if (minutes > 0) text = `${minutes}m`;
  else text = `${seconds}s`;

  return { ...state, text };
};

/* Transform: normalize ratio/percent values and emit rounded percentage text. */
const humanise_percent: PipelineTransform = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const percent = value <= 1 ? value * 100 : value;
  const rounded = Math.max(0, Math.round(percent));

  return { ...state, value: rounded, text: `${rounded}%` };
};

/* Transform: round numeric value to nearest integer and output plain digits. */
const humanise_amount: PipelineTransform = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  return { ...state, text: Math.round(value).toString() };
};

/** Transform: format numeric value as currency with fixed 2 decimal places and optional symbol (default: '$'). */
const humanise_currency: PipelineTransform = (state, _ctx, symbol = '$') => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  return { ...state, text: `${symbol}${value.toFixed(2)}` };
};

/* Transform: round numeric value and format using suffixes (K/M/B) for thousands/millions/billions. For smaller values, output plain digits. Example outputs:
 * 532 => "532"
 * 1,234 => "1.2K"
 * 56,789 => "56.8K"
 * 1,234,567 => "1.2M"
 * 9,876,543,210 => "9.9B"
 * */
const humanise_number: PipelineTransform = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  let text: string = state.text || '';
  switch (true) {
    case value >= 1_000_000_000:
      text = `${(value / 1_000_000_000).toFixed(1)}B`;
      break;
    case value >= 1_000_000:
      text = `${(value / 1_000_000).toFixed(1)}M`;
      break;
    case value >= 1_000:
      text = `${(value / 1_000).toFixed(1)}K`;
      break;
    default:
      text = Math.round(value).toString();
  }

  return { ...state, text };
};

/* Transform: format numeric value using fixed decimal places. */
const round: PipelineTransform = (state, _ctx, decimals = 0) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const d = typeof decimals === 'number' ? decimals : 0;
  return { ...state, text: value.toFixed(d) };
};

/* Transform: clamp numeric value into [min, max] range and update value + text. */
const clamp: PipelineTransform = (state, _ctx, min = 0, max = 100) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const lo = typeof min === 'number' ? min : 0;
  const hi = typeof max === 'number' ? max : 100;
  const clamped = Math.max(lo, Math.min(hi, value));
  return { ...state, text: clamped.toString(), value: clamped };
};

/* Register built-in numeric formatting transforms. */
Footer.registerContextTransform('humanise_time', humanise_time);
Footer.registerContextTransform('humanise_percent', humanise_percent);
Footer.registerContextTransform('humanise_percentage', humanise_percent);
Footer.registerContextTransform('humanise_amount', humanise_amount);
Footer.registerContextTransform('humanise_number', humanise_number);
Footer.registerContextTransform('humanise_currency', humanise_currency);
Footer.registerContextTransform('round', round);
Footer.registerContextTransform('clamp', clamp);
