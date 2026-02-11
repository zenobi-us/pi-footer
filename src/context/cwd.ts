import { Footer } from '../footer.ts';

/* Provider: basename of current working directory for compact footer display. */
Footer.registerContextValue('cwd', (props) => {
  return props.ctx.cwd.split('/').pop() || props.ctx.cwd;
});
