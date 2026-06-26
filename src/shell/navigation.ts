export interface ModuleDef {
  code: string;
  nameKey: 'workspace' | 'crm' | 'trade' | 'inventory' | 'finance' | 'projects' | 'intelligence' | 'aiAssistant' | 'settings';
  count?: string;
  badgeColor?: string;
  badgeBg?: string;
  url?: string;
}

/** Same module set as GCI Platform Shell, minus Quotation itself (shown as the active top item here). */
export const modules: ModuleDef[] = [
  { code: 'WS', nameKey: 'workspace', url: 'https://app.globalcareinfo.com' },
  { code: 'CR', nameKey: 'crm', count: '5', badgeColor: '#E2C988', badgeBg: 'rgba(203,168,92,0.16)', url: 'https://leads.globalcareinfo.com' },
  { code: 'TR', nameKey: 'trade', url: 'https://trade.globalcareinfo.com' },
  { code: 'IV', nameKey: 'inventory', count: '2', badgeColor: '#D0906A', badgeBg: 'rgba(224,132,106,0.14)' },
  { code: 'FN', nameKey: 'finance' },
  { code: 'PJ', nameKey: 'projects' },
  { code: 'BI', nameKey: 'intelligence' },
  { code: 'AI', nameKey: 'aiAssistant' },
  { code: 'ST', nameKey: 'settings' },
];
