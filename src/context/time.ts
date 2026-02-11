import type { ContextValueProvider } from '../types.ts';
import { Footer } from '../footer.ts';

/* Provider: current local time formatted as 24-hour HH:mm. */
const timeProvider: ContextValueProvider = () => {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/* Register built-in time provider. */
Footer.registerContextValue('time', timeProvider);
