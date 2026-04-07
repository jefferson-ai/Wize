import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  type: text('type', { enum: ['bank', 'credit', 'cash'] }).notNull(),
  balance: real('balance').default(0).notNull(),
  currency: text('currency').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id), // New link to account
  date: text('date').notNull(), // Stored as ISO string
  note: text('note'),
  receiptUrl: text('receipt_url'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  recurrenceType: text('recurrence_type', { enum: ['daily', 'weekly', 'monthly'] }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  categoryId: text('category_id').references(() => categories.id),
  amount: real('amount').notNull(),
  period: text('period', { enum: ['monthly', 'weekly'] }).notNull(),
  startDate: text('start_date').notNull(), // Stored as ISO string
});

export const savingGoals = sqliteTable('saving_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').default(0).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
});

export const challenges = sqliteTable('challenges', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  type: text('type').notNull(), // 'reduced_spending', 'no_spend'
  categoryId: text('category_id').references(() => categories.id),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').default(0).notNull(),
  status: text('status', { enum: ['active', 'completed', 'failed'] }).default('active').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
