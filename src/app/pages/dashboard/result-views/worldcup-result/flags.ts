const COUNTRY_TO_ISO2: Record<string, string> = {
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  belgium: 'BE',
  bolivia: 'BO',
  brazil: 'BR',
  cameroon: 'CM',
  canada: 'CA',
  'cape verde': 'CV',
  'cabo verde': 'CV',
  chile: 'CL',
  colombia: 'CO',
  'costa rica': 'CR',
  'côte d’ivoire': 'CI',
  "cote d'ivoire": 'CI',
  croatia: 'HR',
  cuba: 'CU',
  'czech republic': 'CZ',
  czechia: 'CZ',
  denmark: 'DK',
  ecuador: 'EC',
  egypt: 'EG',
  'el salvador': 'SV',
  finland: 'FI',
  france: 'FR',
  germany: 'DE',
  ghana: 'GH',
  greece: 'GR',
  guatemala: 'GT',
  haiti: 'HT',
  honduras: 'HN',
  hungary: 'HU',
  iceland: 'IS',
  iran: 'IR',
  'iran (islamic republic of)': 'IR',
  iraq: 'IQ',
  ireland: 'IE',
  'republic of ireland': 'IE',
  italy: 'IT',
  'ivory coast': 'CI',
  jamaica: 'JM',
  japan: 'JP',
  jordan: 'JO',
  'korea republic': 'KR',
  'south korea': 'KR',
  'korea, republic of': 'KR',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  'new zealand': 'NZ',
  nigeria: 'NG',
  norway: 'NO',
  panama: 'PA',
  paraguay: 'PY',
  peru: 'PE',
  poland: 'PL',
  portugal: 'PT',
  qatar: 'QA',
  romania: 'RO',
  'saudi arabia': 'SA',
  senegal: 'SN',
  serbia: 'RS',
  slovakia: 'SK',
  slovenia: 'SI',
  'south africa': 'ZA',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  tunisia: 'TN',
  turkey: 'TR',
  'türkiye': 'TR',
  'trinidad and tobago': 'TT',
  ukraine: 'UA',
  'united arab emirates': 'AE',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  uruguay: 'UY',
  uzbekistan: 'UZ',
  venezuela: 'VE',
  wales: 'GB-WLS',
  scotland: 'GB-SCT',
  england: 'GB-ENG',
  'northern ireland': 'GB-NIR',
  algeria: 'DZ',
};

const HOME_NATIONS: Record<string, string> = {
  'GB-ENG': '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'GB-SCT': '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  'GB-WLS': '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
  'GB-NIR': '🇬🇧',
};

const PLACEHOLDER_FLAG = '⚽';

export interface TeamLabel {
  flag: string;
  name: string;
  isPlaceholder: boolean;
  ariaLabel: string;
}

export function teamLabel(raw: string | null | undefined): TeamLabel {
  const name = (raw ?? '').trim();
  if (!name) return { flag: PLACEHOLDER_FLAG, name: 'Por definir', isPlaceholder: true, ariaLabel: 'Por definir' };

  const placeholder = expandPlaceholder(name);
  if (placeholder)
    return { flag: PLACEHOLDER_FLAG, name: placeholder, isPlaceholder: true, ariaLabel: placeholder };

  const iso = COUNTRY_TO_ISO2[name.toLowerCase()];
  if (!iso) return { flag: PLACEHOLDER_FLAG, name, isPlaceholder: true, ariaLabel: name };

  const flag = iso.startsWith('GB-') ? HOME_NATIONS[iso] ?? PLACEHOLDER_FLAG : isoToFlagEmoji(iso);
  return { flag, name, isPlaceholder: false, ariaLabel: `Bandera de ${name}` };
}

function isoToFlagEmoji(iso2: string): string {
  if (iso2.length !== 2) return PLACEHOLDER_FLAG;
  const A = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  const first = iso2.charCodeAt(0) - a + A;
  const second = iso2.charCodeAt(1) - a + A;
  return String.fromCodePoint(first, second);
}

function expandPlaceholder(name: string): string | null {
  const upper = name.toUpperCase();

  const winnerMatch = upper.match(/^W(\d+)$/);
  if (winnerMatch) return `Ganador partido ${winnerMatch[1]}`;

  const loserMatch = upper.match(/^L(\d+)$/);
  if (loserMatch) return `Perdedor partido ${loserMatch[1]}`;

  const groupMatch = upper.match(/^([A-L])(\d)$/);
  if (groupMatch) {
    const pos = Number(groupMatch[2]);
    const suffix = ['', '1º', '2º', '3º', '4º'][pos] ?? `${pos}º`;
    return `${suffix} Grupo ${groupMatch[1]}`;
  }

  return null;
}
