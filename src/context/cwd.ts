import { Footer } from '../footer.ts';

/* Provider: full current working directory path. */
Footer.registerContextValue('path', (props) => {
  return props.ctx.cwd;
});

/* Provider: basename of current working directory for compact footer display. */
Footer.registerContextValue('cwd', (props) => {
  return props.ctx.cwd.split('/').pop() || props.ctx.cwd;
});
