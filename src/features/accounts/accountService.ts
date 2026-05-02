import { db } from '../../db';
import { accounts, transactions } from '../../db/schema';
import { eq, sum, and, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { syncData } from '../sync/syncService';

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
  
  // 1. Create the account record
  await db.insert(accounts).values(newAccount);
  
  // 2. If there's a starting balance, create a "Starting Balance" transaction
  // so that reconciliation logic (sum of transactions) matches the balance.
  if (newAccount.balance !== 0) {
    await db.insert(transactions).values({
      id: uuidv4(),
      userId: newAccount.userId,
      accountId: newAccount.id,
      amount: Math.abs(newAccount.balance),
      type: newAccount.balance > 0 ? 'income' : 'expense',
      date: newAccount.createdAt.toISOString(),
      note: 'Starting Balance',
      currency: newAccount.currency,
      categoryId: null, // Uncategorized for initial balance
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  syncData(newAccount.userId).catch(err => console.warn('Account sync failed', err));
  return newAccount;
};

export const updateAccount = async (accountId: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  await db.update(accounts)
    .set(data)
    .where(eq(accounts.id, accountId));
  
  const acc = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (acc[0]?.userId) syncData(acc[0].userId).catch(err => console.warn('Account update sync failed', err));
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  const acc = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const userId = acc[0]?.userId;

  // 1. Delete from Supabase first
  if (userId) {
    const { supabase } = await import('../../utils/supabase');
    await Promise.all([
      supabase.from('transactions').delete().eq('account_id', accountId),
      supabase.from('accounts').delete().eq('id', accountId)
    ]);
  }

  // 2. Delete all transactions locally
  await db.delete(transactions).where(eq(transactions.accountId, accountId));
  // 3. Delete the account locally
  await db.delete(accounts).where(eq(accounts.id, accountId));

  if (userId) syncData(userId).catch(err => console.warn('Account delete sync failed', err));
};

export const updateAccountBalance = async (accountId: string, amount: number): Promise<void> => {
  const current = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (current.length > 0) {
    await db.update(accounts)
      .set({ balance: (current[0].balance || 0) + amount })
      .where(eq(accounts.id, accountId));
    
    if (current[0].userId) syncData(current[0].userId).catch(err => console.warn('Balance sync failed', err));
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

/**
 * Re-calculates account balances from the ground up based on transactions.
 * Crucial after a fresh sync to ensure the balance field matches actual data.
 */
export const reconcileAccountBalances = async (userId: string) => {
  const userAccounts = await getAccounts(userId);
  if (userAccounts.length === 0) return;

  // Safety: Link any "orphan" transactions (null accountId) to the main account
  // This happens if data was synced from a device without account support
  const mainAccountId = userAccounts[0].id;
  await db.update(transactions)
    .set({ accountId: mainAccountId })
    .where(and(eq(transactions.userId, userId), isNull(transactions.accountId)));

  for (const account of userAccounts) {
    const txs = await db.select().from(transactions).where(eq(transactions.accountId, account.id));
    const total = txs.reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);
    
    await db.update(accounts)
      .set({ balance: total })
      .where(eq(accounts.id, account.id));
  }
};
