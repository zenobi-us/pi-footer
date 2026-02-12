import nconf from 'nconf';
import path from 'path';

import { homedir } from 'os';
import { DEFAULT_TEMPLATE } from './defaults';
import type { ResolvedConfig } from './schema.ts';
import { normalizeConfig } from './schema.ts';

const appname = 'pi-footer';
const envprefix = appname.toUpperCase().replace(/-/g, '_') + '_';

nconf
  .env({
    separator: '__',
    match: new RegExp(`^${envprefix}`),
  })
  .file({
    file: path.join(homedir(), '.pi', 'agent', 'pi-footer.json'),
  })
  .defaults({
    template: DEFAULT_TEMPLATE,
  });

function readConfig(): ResolvedConfig {
  return normalizeConfig(nconf.get());
}

export let Config: ResolvedConfig = readConfig();

/*
 * Reload values from env + config file and return the normalized config snapshot.
 */
export function reloadConfig(): ResolvedConfig {
  nconf.load();
  Config = readConfig();
  return Config;
}
