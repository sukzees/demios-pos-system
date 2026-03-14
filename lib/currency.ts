type CurrencySettings = {
  defaultCurrency: string;
  currencySymbol: string;
  currencyFormat: string;
  currencySymbolPosition?: 'left' | 'right';
};

function formatNumberWithPattern(amount: number, pattern: string): string {
  const trimmed = String(pattern || '').trim();

  // Backward compatibility: if an old locale string is stored (e.g. en-US),
  // continue to use Intl locale formatting.
  if (trimmed && !trimmed.includes('#') && !trimmed.includes('0')) {
    return new Intl.NumberFormat(trimmed, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const hasTwoDecimals = trimmed.includes('.00');
  const useGrouping = trimmed.includes(',');
  const minFractionDigits = hasTwoDecimals ? 2 : 0;
  const maxFractionDigits = hasTwoDecimals ? 2 : 0;

  return new Intl.NumberFormat('en-US', {
    useGrouping,
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

export function formatCurrency(amount: number, settings: CurrencySettings): string {
  try {
    const absoluteAmount = Math.abs(amount);
    const formattedNumber = formatNumberWithPattern(absoluteAmount, settings.currencyFormat);
    const symbolPosition = settings.currencySymbolPosition || 'left';
    const sign = amount < 0 ? '-' : '';
    return symbolPosition === 'right'
      ? `${sign}${formattedNumber}${settings.currencySymbol}`
      : `${sign}${settings.currencySymbol}${formattedNumber}`;
  } catch {
    const fallback = amount.toFixed(2);
    const symbolPosition = settings.currencySymbolPosition || 'left';
    return symbolPosition === 'right'
      ? `${fallback}${settings.currencySymbol}`
      : `${settings.currencySymbol}${fallback}`;
  }
}

export function formatCurrencyTick(value: number | string, settings: CurrencySettings): string {
  const numeric = typeof value === 'number' ? value : parseFloat(String(value));
  const symbolPosition = settings.currencySymbolPosition || 'left';
  if (!Number.isFinite(numeric)) {
    return symbolPosition === 'right'
      ? `${value}${settings.currencySymbol}`
      : `${settings.currencySymbol}${value}`;
  }

  const absoluteValue = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';
  const formatted = formatNumberWithPattern(absoluteValue, settings.currencyFormat);

  return symbolPosition === 'right'
    ? `${sign}${formatted}${settings.currencySymbol}`
    : `${sign}${settings.currencySymbol}${formatted}`;
}
