import { Footer } from '../footer.ts';
import type { PipelineStep } from '../core/pipeline.ts';

const humanise_time: PipelineStep = (state) => {
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

const humanise_percent: PipelineStep = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  // Accept either ratio (0..1) or percentage (0..100+)
  const percent = value <= 1 ? value * 100 : value;
  const rounded = Math.max(0, Math.round(percent));

  return { ...state, value: rounded, text: `${rounded}%` };
};

const humanise_amount: PipelineStep = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  return { ...state, text: Math.round(value).toString() };
};

const humanise_number: PipelineStep = (state) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  return { ...state, text: Math.round(value).toLocaleString() };
};

const round: PipelineStep = (state, _ctx, decimals = 0) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const d = typeof decimals === 'number' ? decimals : 0;
  return { ...state, text: value.toFixed(d) };
};

const clamp: PipelineStep = (state, _ctx, min = 0, max = 100) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const lo = typeof min === 'number' ? min : 0;
  const hi = typeof max === 'number' ? max : 100;
  const clamped = Math.max(lo, Math.min(hi, value));
  return { ...state, text: clamped.toString(), value: clamped };
};

Footer.registerContextFilter('humanise_time', humanise_time);
Footer.registerContextFilter('humanise_percent', humanise_percent);
Footer.registerContextFilter('humanise_percentage', humanise_percent);
Footer.registerContextFilter('humanise_amount', humanise_amount);
Footer.registerContextFilter('humanise_number', humanise_number);
Footer.registerContextFilter('round', round);
Footer.registerContextFilter('clamp', clamp);
