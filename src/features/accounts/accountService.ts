import { db } from '../../db';
import { accounts, transactions } from '../../db/schema';
import { eq, sum } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'bank' | 'credit' | 'cash';
  balance: number;
  currency: string;
  color: string;
  icon: string;
  createdAt: Date;
}

export const getAccounts = async (userId: string): Promise<Account[]> => {
  const res = await db.select().from(accounts).where(eq(accounts.userId, userId));
  return res as Account[];
};

export const createAccount = async (data: Omit<Account, 'id' | 'createdAt'>): Promise<Account> => {
  const newAccount: Account = {
    ...data,
    id: uuidv4(),
    createdAt: new Date(),
  };
  await db.insert(accounts).values(newAccount);
  return newAccount;
};

export const updateAccount = async (accountId: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  await db.update(accounts)
    .set(data)
    .where(eq(accounts.id, accountId));
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  // First delete all transactions associated with the account to maintain data integrity
  await db.delete(transactions).where(eq(transactions.accountId, accountId));
  // Then delete the account
  await db.delete(accounts).where(eq(accounts.id, accountId));
};

export const updateAccountBalance = async (accountId: string, amount: number): Promise<void> => {
  const current = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (current.length > 0) {
    await db.update(accounts)
      .set({ balance: (current[0].balance || 0) + amount })
      .where(eq(accounts.id, accountId));
  }
};

export const getTotalBalance = async (userId: string): Promise<number> => {
  const userAccounts = await getAccounts(userId);
  return userAccounts.reduce((acc, curr) => {
    // Credit card balances are typically debt, so they might be subtractive 
    // depending on how the user inputs them. Usually, we just sum the raw balance.
    return acc + curr.balance;
  }, 0);
};

/**
 * Migration helper to ensure every user has at least one account.
 * Links all existing transactions without accountId to this new default account.
 */
export const ensureDefaultAccount = async (userId: string, currency: string): Promise<Account> => {
  const existing = await getAccounts(userId);
  if (existing.length > 0) return existing[0];

  // Create default "Cash" or "Main Bank"
  const defaultAccount = await createAccount({
    userId,
    name: 'Main Wallet',
    type: 'cash',
    balance: 0,
    currency,
    color: '#3b82f6',
    icon: 'Wallet',
  });

  // Link all existing transactions that have no accountId
  // In Drizzle SQLite, we need to check for null
  await db.update(transactions)
    .set({ accountId: defaultAccount.id })
    .where(eq(transactions.userId, userId));

  return defaultAccount;
};
