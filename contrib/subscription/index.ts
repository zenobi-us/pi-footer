import * as subshared from '@marckrenn/pi-sub-shared';
import subcore from '@marckrenn/pi-sub-core';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { Footer } from '@zenobius/pi-footer';

export default function createExtension(pi: ExtensionAPI): void {
  subcore(pi);

  const store: {
    state?: subshared.SubCoreState;
    settings?: subshared.CoreSettings;
  } = {};

  /**
   * Provides the following chain.
   *
   *   subscriptions -> sub-usage (with index arg) -> sub-usage-reset
   *                                               -> sub-usage-reset-desc
   *                                               -> ...
   */

  Footer.registerContextValue('subscriptions', () => {
    return store.state?.usage?.windows;
  });

  /**
   * Provides ability to select a specific usage window from the list of subscriptions.
   * Expects an index argument to specify which usage window to select.
   * If the index is out of bounds or invalid, it returns null.
   *
   * {{ subscriptions | sub-window(0) | sub-reset | humanise_date }}
   */
  Footer.registerContextTransform('sub-window', (state, ctx, ...args) => {
    if (state.source !== 'subscriptions') {
      return state;
    }

    const index = Number(args[0]) || 0;
    const usage = store.state?.usage?.windows?.[index] || null;
    return {
      ...state,
      text: '',
      value: usage,
    };
  });

  /**
   * Select the label from the selected usage window. Expects the input state to be a usage window object.
   * If the input state is not a usage window or does not have a label, it returns 'N/A'.
   *
   * {{ subscriptions | sub-usage(0) | sub-usage-label }}
   */
  Footer.registerContextTransform('sub-usage-label', (state) => {
    if (state.source !== 'subscriptions' || !state.value) {
      return state;
    }

    const value = state.value as subshared.RateWindow;
    const label = value.label;
    if (!label) {
      return {
        ...state,
        text: 'N/A',
        value: null,
      };
    }

    return {
      ...state,
      text: label,
      value: label,
    };
  });

  /**
   * Select the reset time from the selected usage window. Expects the input state to be a usage window object.
   * If the input state is not a usage window or does not have a reset time, it returns null.
   *
   * {{ subscriptions | sub-usage(0) | sub-reset | humanise_date }}
   */
  Footer.registerContextTransform('sub-reset', (state) => {
    if (state.source !== 'subscriptions' || !state.value) {
      return state;
    }

    const value = state.value as subshared.RateWindow;
    const resetAt = value.resetAt;
    if (!resetAt) {
      return {
        ...state,
        text: 'No reset',
        value: null,
      };
    }

    return {
      ...state,
      text: resetAt,
      value: resetAt,
    };
  });

  /**
   * Select the reset description from the selected usage window. Expects the input state to be a usage window object.
   * If the input state is not a usage window or does not have a reset description, it returns '-'.
   *
   * {{ subscriptions | sub-window(0) | sub-reset-desc }}
   */
  Footer.registerContextTransform('sub-reset-desc', (state) => {
    if (state.source !== 'subscriptions' || !state.value) {
      return state;
    }

    const value = state.value as subshared.RateWindow;
    const description = value.resetDescription;
    if (!description) {
      return {
        ...state,
        text: '-',
        value: null,
      };
    }

    return {
      ...state,
      text: description,
      value,
    };
  });

  /**
   * Select the usage percentage from the selected usage window. Expects the input state to be a usage window object.
   * If the input state is not a usage window or does not have a usage percentage, it returns null.
   *
   * {{ subscriptions | sub-usage(0) | sub-usage-pct }}
   */
  Footer.registerContextTransform('sub-usage-pct', (state) => {
    if (state.source !== 'subscriptions' || !state.value) {
      return state;
    }

    const value = state.value as subshared.RateWindow;
    const pct = value.usedPercent;
    if (pct === undefined || pct === null) {
      return {
        ...state,
        text: 'N/A',
        value: null,
      };
    }

    return {
      ...state,
      text: `${pct}%`,
      value: pct,
    };
  });

  /**
   * Update Events
   *
   * Listen for updates from the sub-core and update the store accordingly. This ensures that the footer context values are reactive to changes in the subscription data.
   * The sub-core emits the following events:
   * - 'sub-core:ready': Emitted when the sub-core is initialized and ready with the initial state.
   * - 'sub-core:update-current': Emitted when there is an update to the current subscription state.
   * - 'sub-core:update-all': Emitted when there is an update to all subscription states, providing an array of entries.
   *
   * Each event handler extracts the relevant state from the payload and updates the store, which in turn updates the footer context values.
   */

  pi.events.on('sub-core:ready', (payload: unknown) => {
    const data = payload as { state?: subshared.SubCoreState };
    store.state = data.state;
  });

  pi.events.on('sub-core:update-current', (payload: unknown) => {
    const data = payload as { state?: subshared.SubCoreState };
    store.state = data.state;
  });

  pi.events.on('sub-core:update-all', (payload: unknown) => {
    const data = payload as { state?: subshared.SubCoreAllState };
    const entry = data.state?.entries?.[0];
    if (!entry) return;
    store.state = entry;
  });
}
