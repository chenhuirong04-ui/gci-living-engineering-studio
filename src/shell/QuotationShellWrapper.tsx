import { useMemo, useState, type ReactNode } from 'react';
import { AppShell, Sidebar, Header, LangToggle, type NavModItem } from '@gci/design-system';
import { LangContext, dictionaries, type Lang } from '@gci/i18n';
import { modules } from './navigation';

/**
 * Phase 2 scope: wraps the existing Quotation Center app with the shared GCI
 * Platform chrome (sidebar + header + lang toggle) only. The 555KB App.tsx
 * business logic (BOQ/OCR parsing, supplier quotes, PDF generation, pricing
 * engine) and its brand-brown/gold print theme are untouched — this is an
 * outer frame, not a reskin of the quotation tool's internals.
 */
export function QuotationShellWrapper({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const dict = dictionaries[lang];

  const navMods: NavModItem[] = useMemo(
    () =>
      modules.map((m) => ({
        code: m.code,
        name: dict.nav[m.nameKey],
        count: m.count,
        badgeColor: m.badgeColor,
        badgeBg: m.badgeBg,
        href: m.url,
        onClick: m.url ? undefined : () => {},
      })),
    [dict],
  );

  const dateLine = new Date()
    .toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
    .toUpperCase()
    .replace(/\//g, '.');

  return (
    <LangContext.Provider value={{ lang, dict, setLang }}>
      <AppShell
        sidebar={
          <Sidebar
            navTop={{ code: 'QT', name: dict.nav.quotation }}
            navMods={navMods}
            workspaceLabel={dict.nav.workspaceSection}
            modulesLabel={dict.nav.modulesSection}
            userName="Chris"
            userRole={dict.profile.owner}
          />
        }
        header={
          <Header
            eyebrow="GCI UNIFIED · QUOTATION CENTER"
            dateLine={dateLine}
            searchPlaceholder={dict.header.searchPlaceholder}
            syncedLabel={dict.header.synced}
            trailing={<LangToggle lang={lang} onChange={setLang} />}
          />
        }
      >
        {children}
      </AppShell>
    </LangContext.Provider>
  );
}
