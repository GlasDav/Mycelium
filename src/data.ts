import type { Note, User } from './engine';

export const users: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'Analyst', team: 'Semis' },
  { id: 'u2', name: 'Owen Vale', role: 'Analyst', team: 'Consumer' },
  { id: 'u3', name: 'Priya Shah', role: 'PM', team: 'Portfolio' },
  { id: 'u4', name: 'Nora Bell', role: 'Compliance', team: 'Compliance' }
];

export const seedNotes: Note[] = [
  { id: 'n1', title: 'AI server channel check — Taipei ODMs', authorId: 'u1', team: 'Semis', visibility: 'team', sourceType: 'Channel check', createdAt: '2026-05-01', body: 'Nvidia H100 demand remains strong and Blackwell orders are accelerating into Q3. Azure capex conversations suggest Microsoft demand for AI infrastructure is higher than prior plans. GPU supply is still tight, which supports pricing.' },
  { id: 'n2', title: 'Cloud buyer call: budget digestion', authorId: 'u1', team: 'Semis', visibility: 'team', sourceType: 'Expert call', createdAt: '2026-05-02', body: 'Nvidia demand may slow after the current H100 backlog clears because several buyers flagged budget pressure. Microsoft Azure growth is improving, but some Copilot attach-rate evidence remains weak.' },
  { id: 'n3', title: 'Apple Asia supply chain read', authorId: 'u2', team: 'Consumer', visibility: 'team', sourceType: 'Supplier call', createdAt: '2026-05-03', body: 'Apple iPhone orders were cut for June and demand looks soft in China. Services revenue remains robust and App Store pricing is improving.' },
  { id: 'n4', title: 'Tesla dealer checks', authorId: 'u2', team: 'Consumer', visibility: 'public', sourceType: 'Channel check', createdAt: '2026-05-04', body: 'Tesla Model Y inventory is increasing and EV demand is weak across coastal stores. Supercharger utilization is improving, but vehicle margin pressure remains a downside risk.' },
  { id: 'n5', title: 'Shopify merchant roundtable', authorId: 'u1', team: 'Semis', visibility: 'public', sourceType: 'Expert call', createdAt: '2026-05-04', body: 'Shopify merchant demand is recovering and payments attach is higher. Churn risk declined among larger merchants, supporting margin improvement.' },
  { id: 'n6', title: 'PM private thesis scratchpad', authorId: 'u3', team: 'Portfolio', visibility: 'private', sourceType: 'Internal memo', createdAt: '2026-05-05', body: 'Nvidia upside may be capped if cloud capex growth slows. Apple services durability is underappreciated despite weak iPhone demand.' }
];
