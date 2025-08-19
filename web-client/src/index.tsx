/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
import App from './App';
import { trpc } from '@trpc-client';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

(window as any).trpc = trpc;

trpc.ping.query().then(console.log);
// trpc.projects.finish.mutate({ id: '' });
trpc.users.findMany.query({ search: 'Robert' }).then(console.log);

render(() => <App />, root!);
