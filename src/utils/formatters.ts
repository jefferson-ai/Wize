export const formatAmount = (amount: number, fractionDigits: number = 2): string => {
  return amount.toFixed(fractionDigits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
