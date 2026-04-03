import { createRoot } from 'react-dom/client';
import App from './App';
import 'shared-css/base.css';
import 'shared-css/table.css';

createRoot(document.getElementById('root')!).render(<App />);
