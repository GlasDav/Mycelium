export const companyLexicon: Record<string, { ticker: string; aliases: string[]; themes: string[] }> = {
  Nvidia: { ticker: 'NVDA', aliases: ['nvidia', 'nvda', 'gpu', 'h100', 'blackwell'], themes: ['AI infrastructure', 'Semiconductors'] },
  Apple: { ticker: 'AAPL', aliases: ['apple', 'aapl', 'iphone', 'app store'], themes: ['Consumer hardware', 'Services'] },
  Tesla: { ticker: 'TSLA', aliases: ['tesla', 'tsla', 'model y', 'supercharger'], themes: ['EV demand', 'Autonomy'] },
  Shopify: { ticker: 'SHOP', aliases: ['shopify', 'shop', 'merchant'], themes: ['SMB commerce', 'Payments'] },
  Microsoft: { ticker: 'MSFT', aliases: ['microsoft', 'msft', 'azure', 'copilot'], themes: ['AI infrastructure', 'Enterprise software'] }
};

export const themeLexicon = ['AI infrastructure', 'Semiconductors', 'EV demand', 'Autonomy', 'Consumer hardware', 'Services', 'SMB commerce', 'Payments', 'Enterprise software', 'Cloud spend'];
export const kpiWords = ['revenue', 'margin', 'gross margin', 'demand', 'inventory', 'capex', 'orders', 'churn', 'pricing', 'utilization', 'growth', 'supply'];
export const positiveDirectionWords = ['accelerat', 'strong', 'improv', 'beat', 'expanding', 'tight', 'robust', 'upside', 'recover', 'increase', 'higher', 'raised'];
export const negativeDirectionWords = ['slow', 'weak', 'declin', 'miss', 'pressure', 'soft', 'excess', 'risk', 'downside', 'cut', 'lower', 'delay'];
