import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { OwlbearPopoverApp } from './OwlbearPopoverApp';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <OwlbearPopoverApp />
    </StrictMode>,
);
