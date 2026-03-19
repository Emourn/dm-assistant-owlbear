import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { PopoverApp } from './PopoverApp';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <PopoverApp surface="panel" />
    </StrictMode>,
);
