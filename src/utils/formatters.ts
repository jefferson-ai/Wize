export const formatAmount = (amount: number | string | undefined | null, currencyOrDigits?: string | number): string => {
  const numericAmount = Number(amount ?? 0);
  const safeAmount = isNaN(numericAmount) ? 0 : numericAmount;
  
  const fractionDigits = typeof currencyOrDigits === 'number' ? currencyOrDigits : 2;
  const formatted = safeAmount.toFixed(fractionDigits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (typeof currencyOrDigits === 'string') {
    return `${currencyOrDigits} ${formatted}`;
  }
  
  return formatted;
};
