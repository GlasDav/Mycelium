import type { Note, User } from './engine';

export const users: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'Analyst', team: 'Semis' },
  { id: 'u2', name: 'Owen Vale', role: 'Analyst', team: 'Consumer' },
  { id: 'u3', name: 'Priya Shah', role: 'PM', team: 'Portfolio' },
  { id: 'u4', name: 'Nora Bell', role: 'Compliance', team: 'Compliance' }
];

export const seedNotes: Note[] = [
  { id: 'n0', title: 'Historical AI server digest — last spring', authorId: 'u1', team: 'Semis', visibility: 'team', sourceType: 'Channel check', createdAt: '2025-05-01', observedAt: '2025-05-01', appliesToStart: '2025-05-01', appliesToEnd: '2025-07-30', horizon: 'near_term', body: 'Nvidia H100 demand was weak as cloud buyers paused GPU orders after a digestion cycle. Microsoft Azure capex growth was lower as budget pressure delayed purchases.' },
  { id: 'n1', title: 'AI server channel check — Taipei ODMs', authorId: 'u1', team: 'Semis', visibility: 'team', sourceType: 'Channel check', createdAt: '2026-05-01', observedAt: '2026-05-01', appliesToStart: '2026-05-01', appliesToEnd: '2026-08-01', horizon: 'near_term', body: 'Nvidia H100 demand remains strong and Blackwell orders are accelerating into Q3. Azure capex conversations suggest Microsoft demand for AI infrastructure is higher than prior plans. GPU supply is still tight, which supports pricing.' },
  { id: 'n2', title: 'Cloud buyer call: budget digestion', authorId: 'u1', team: 'Semis', visibility: 'team', sourceType: 'Expert call', createdAt: '2026-05-02', observedAt: '2026-05-02', appliesToStart: '2026-05-02', appliesToEnd: '2026-08-02', horizon: 'near_term', body: 'Nvidia demand may slow after the current H100 backlog clears because several buyers flagged budget pressure. Microsoft Azure growth is improving, but some Copilot attach-rate evidence remains weak.' },
  { id: 'n3', title: 'Apple Asia supply chain read', authorId: 'u2', team: 'Consumer', visibility: 'team', sourceType: 'Supplier call', createdAt: '2026-05-03', observedAt: '2026-05-03', body: 'Apple iPhone orders were cut for June and demand looks soft in China. Services revenue remains robust and App Store pricing is improving.' },
  { id: 'n4', title: 'Tesla dealer checks', authorId: 'u2', team: 'Consumer', visibility: 'public', sourceType: 'Channel check', createdAt: '2026-05-04', observedAt: '2026-05-04', body: 'Tesla Model Y inventory is increasing and EV demand is weak across coastal stores. Supercharger utilization is improving, but vehicle margin pressure remains a downside risk.' },
  { id: 'n5', title: 'Shopify merchant roundtable', authorId: 'u1', team: 'Semis', visibility: 'public', sourceType: 'Expert call', createdAt: '2026-05-04', observedAt: '2026-05-04', body: 'Shopify merchant demand is recovering and payments attach is higher. Churn risk declined among larger merchants, supporting margin improvement.' },
  { id: 'n6', title: 'PM private thesis scratchpad', authorId: 'u3', team: 'Portfolio', visibility: 'private', sourceType: 'Internal memo', createdAt: '2026-05-05', observedAt: '2026-05-05', body: 'Nvidia upside may be capped if cloud capex growth slows. Apple services durability is underappreciated despite weak iPhone demand.' }
];
