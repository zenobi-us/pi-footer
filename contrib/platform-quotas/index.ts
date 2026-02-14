import type { ExtensionFactory } from '@mariozechner/pi-coding-agent';
import { Footer } from '@zenobius/pi-footer';

import { registerUsageContextValues } from './context/usage.ts';
import './cmds/quotas.ts';
import './services/PlatformTracker/strategies/anthropic.ts';
import './services/PlatformTracker/strategies/antigravity.ts';
import './services/PlatformTracker/strategies/codex.ts';
import './services/PlatformTracker/strategies/copilot.ts';
import './services/PlatformTracker/strategies/gemini.ts';

import { usageTracker } from './services/PlatformTracker/store.ts';

const PiFooterUsageExtension: ExtensionFactory = (pi) => {
  let unsubscribeStore: (() => void) | undefined;
  let unregisterContextValues: (() => void) | undefined;

  const ensureStoreBridge = (): void => {
    if (unsubscribeStore) return;

    unsubscribeStore = usageTracker.subscribe(() => {
      Footer.events.emit('invalidate', {
        source: 'platform-quotas',
        reason: 'usage-store-update',
      });
    });
  };

  const ensureContextLoaded = (): void => {
    if (unregisterContextValues) return;
    unregisterContextValues = registerUsageContextValues();
  };

  pi.on('session_start', () => {
    ensureContextLoaded();
    ensureStoreBridge();
    usageTracker.start();
  });

  pi.on('session_switch', () => {
    ensureContextLoaded();
    ensureStoreBridge();
    usageTracker.trigger('attach');
  });

  pi.on('model_select', () => {
    usageTracker.trigger('attach');
  });

  pi.on('turn_start', () => {
    usageTracker.trigger('turn_start');
  });

  pi.on('tool_result', () => {
    usageTracker.trigger('tool_result');
  });

  pi.on('turn_end', () => {
    usageTracker.trigger('turn_end');
  });

  pi.on('session_shutdown', () => {
    unregisterContextValues?.();
    unregisterContextValues = undefined;

    unsubscribeStore?.();
    unsubscribeStore = undefined;

    usageTracker.stop();
  });
};

export default PiFooterUsageExtension;
