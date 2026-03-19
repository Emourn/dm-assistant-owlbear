import { NarrationBlock } from '../../types/campaignNavigator';

let _id = Date.now();
const bid = () => `dh-b-${++_id}-${Math.random().toString(36).slice(2, 6)}`;

export const B = (type: NarrationBlock['type'], text: string, extra: Partial<NarrationBlock> = {}): NarrationBlock => ({ 
    id: bid(), 
    type, 
    text: text.trim(), 
    ...extra 
});
