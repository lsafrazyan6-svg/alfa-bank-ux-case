import { build } from 'esbuild';
await build({ entryPoints: ['task-tabs.jsx'], bundle: true, minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: 'task-tabs.js', legalComments: 'eof' });
