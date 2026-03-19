import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { OwlbearWorkbenchApp } from './OwlbearWorkbenchApp';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <OwlbearWorkbenchApp />
    </StrictMode>,
);
