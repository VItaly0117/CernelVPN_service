import {useState, useEffect} from 'react';

export interface IpInfo {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', DE: '🇩🇪', NL: '🇳🇱', GB: '🇬🇧', FR: '🇫🇷',
  JP: '🇯🇵', SG: '🇸🇬', CA: '🇨🇦', AU: '🇦🇺', SE: '🇸🇪',
  CH: '🇨🇭', FI: '🇫🇮', NO: '🇳🇴', DK: '🇩🇰', RU: '🇷🇺',
  UA: '🇺🇦', PL: '🇵🇱', CZ: '🇨🇿', AT: '🇦🇹', LU: '🇱🇺',
  HK: '🇭🇰', TR: '🇹🇷', IL: '🇮🇱', IN: '🇮🇳', BR: '🇧🇷',
  KR: '🇰🇷', TW: '🇹🇼', MX: '🇲🇽', AR: '🇦🇷', ZA: '🇿🇦',
};

export function useIpInfo(active: boolean): IpInfo | null {
  const [info, setInfo] = useState<IpInfo | null>(null);

  useEffect(() => {
    if (!active) {
      setInfo(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('https://ipapi.co/json/', {cache: 'no-store'});
        const data = await res.json();
        const code: string = data.country_code ?? '';
        setInfo({
          ip: data.ip ?? '—',
          country: data.country_name ?? '—',
          countryCode: code,
          city: data.city ?? '',
          flag: FLAG_MAP[code] ?? '🌍',
        });
      } catch {
        setInfo(null);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [active]);

  return info;
}
