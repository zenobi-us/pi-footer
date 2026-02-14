import { TemplateService } from './core/template.ts';
import type { FooterInstance } from './types.ts';
import { renderTemplateLine } from './core/render.ts';
import { createEventService } from './core/events.ts';
/*
 * Purpose:
 * Build the singleton footer runtime that owns provider/transform registries.
 *
 * Returns:
 * - Footer instance with public registration and rendering API
 */
function createFooter() {
  const template = new TemplateService();

  const events = createEventService();

  const service: FooterInstance = {
    /*
     * Public template runtime for command-level introspection/debugging.
     */
    template,

    /**
     * Event service for emitting lifecycle events (e.g. invalidate) and subscribing to them from providers or external modules.
     * Consumers can subscribe to events like this:
     * ```
     * Footer.events.on('invalidate', () => {
     *   // Handle footer invalidation (e.g. clear caches, trigger updates)
     * });
     * ```
     */
    events,

    /**
     * Registry of subcommands that can be invoked from the footer command palette. Maps subcommand names to their descriptions and callback factories.
     */
    subCommands: new Map(),

    /**
     * Registers a subcommand that can be invoked from the footer command palette.
     *
     * @param name - The name of the subcommand (e.g. 'reload')
     * @param description - A brief description of the subcommand's purpose, shown in the command palette
     * @param factory - A function that returns the callback to execute when the subcommand is invoked. The factory is used to allow lazy initialization of any resources needed by the callback.
     * The callback receives the raw argument string and the command context, and can return a string or array of strings to display in the footer, or void to display nothing.
     */
    registerSubCommand(name, description, factory) {
      if (service.subCommands.has(name)) {
        // eslint-disable-next-line no-console
        console.warn(`Subcommand "${name}" is already registered.`);
        return;
      }

      service.subCommands.set(name, { description, callback: factory });
    },

    /*
     * Purpose:
     * Register a context provider accessible from template placeholders.
     */
    registerContextValue(name, provider) {
      template.registerContextProvider(name, provider);
      return () => template.unregisterContextProvider(name);
    },

    /*
     * Purpose:
     * Unregister a context provider.
     */
    unregisterContextValue(name) {
      template.unregisterContextProvider(name);
    },

    /*
     * Purpose:
     * Register a transform accessible from template pipeline expressions.
     */
    registerContextTransform(name, transform) {
      template.registerTransform(name, transform);
      return () => template.unregisterTransform(name);
    },

    /*
     * Purpose:
     * Unregister a transform.
     */
    unregisterContextTransform(name) {
      template.unregisterTransform(name);
    },

    /*
     * Purpose:
     * Render all configured rows using a fresh context snapshot.
     *
     * Returns:
     * - One rendered string per template row
     */
    render(pi, ctx, theme, width, options) {
      if (!options.template) {
        return [''];
      }

      const context = template.createContext({ pi, ctx, theme });
      const separator = theme.fg('dim', ' · ');
      const lines: string[] = [];

      for (const line of options.template) {
        lines.push(renderTemplateLine(template, context, line, width, separator));
      }

      return lines;
    },
  };

  return service;
}

/*
 * Global footer instance consumed by extension entrypoint and built-in context modules.
 */
export const Footer = createFooter();
