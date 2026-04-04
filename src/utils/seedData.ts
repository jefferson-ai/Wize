import { db } from '../db';
import { transactions, categories } from '../db/schema';
import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';

const generateId = () => Crypto.randomUUID();

export async function seed1YearStudentData(userId: string) {
  try {
    // 1. Clean Slate
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(categories).where(eq(categories.userId, userId));
    
    // 2. Define Refined Categories
    const defaultCategories = [
      { name: 'Food & Dining', icon: 'Utensils', color: '#f97316', type: 'expense' },
      { name: 'Transport', icon: 'Bus', color: '#3b82f6', type: 'expense' },
      { name: 'Academics', icon: 'BookOpen', color: '#8b5cf6', type: 'expense' },
      { name: 'Groceries', icon: 'ShoppingCart', color: '#10b981', type: 'expense' },
      { name: 'Housing & Utilities', icon: 'Home', color: '#ef4444', type: 'expense' },
      { name: 'Entertainment & Social', icon: 'Music', color: '#ec4899', type: 'expense' },
      { name: 'Personal Care', icon: 'Scissors', color: '#06b6d4', type: 'expense' },

      { name: 'Parents Allowance', icon: 'Wallet', color: '#16a34a', type: 'income' },
      { name: 'Initial Savings', icon: 'PiggyBank', color: '#059669', type: 'income' },
      { name: 'Student Loan (SLTF)', icon: 'Landmark', color: '#059669', type: 'income' },
      { name: 'Hustle / Part-time', icon: 'Briefcase', color: '#2563eb', type: 'income' },
      { name: 'Dash / Gifts', icon: 'Gift', color: '#d97706', type: 'income' },
    ];

    const categoryDocs: any[] = [];
    for (const cat of defaultCategories) {
      const doc = {
        id: generateId(),
        userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type as 'income' | 'expense'
      };
      await db.insert(categories).values(doc);
      categoryDocs.push(doc);
    }

    const incomeCats = categoryDocs.filter(c => c.type === 'income');
    const expCats = categoryDocs.filter(c => c.type === 'expense');

    const txsToInsert: typeof transactions.$inferInsert[] = [];
    const now = new Date();
    let virtualBalance = 0;

    // Helpers
    const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomAmt = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

    const foodItems = [
      { note: 'Bush Canteen Waakye', min: 20, max: 35 },
      { note: 'Night Market Indomie', min: 15, max: 25 },
      { note: 'Pentagon Food', min: 25, max: 40 },
      { note: 'Jollof at TF', min: 25, max: 35 },
    ];
    
    // START REDESIGN: Iterate Forward for 365 Days
    for (let i = 365; i >= 0; i--) {
      const txDate = new Date(now);
      txDate.setDate(txDate.getDate() - i);
      const isStartOfMonth = txDate.getDate() === 1;
      const dayOfWeek = txDate.getDay();

      // ----------------- 1. INITIAL INJECTION -----------------
      if (i === 365) {
        const amt = 4500;
        txsToInsert.push({
          id: generateId(), userId, type: 'income', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: incomeCats.find(c => c.name === 'Initial Savings')!.id,
          note: 'Opening Year Balance / Savings', amount: amt,
        });
        virtualBalance += amt;
      }

      // ----------------- 2. INCOME -----------------
      // Allowance is guaranteed on 1st
      if (isStartOfMonth) {
        const amt = randomAmt(1800, 2800);
        txsToInsert.push({
          id: generateId(), userId, type: 'income', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: incomeCats.find(c => c.name === 'Parents Allowance')!.id,
          note: 'Monthly Allowance from Home', amount: amt,
        });
        virtualBalance += amt;
      }

      // Small hustle/Dash (reduced frequency)
      if (Math.random() < 0.05) {
        const amt = randomAmt(150, 400);
        txsToInsert.push({
          id: generateId(), userId, type: 'income', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: incomeCats.find(c => c.name === 'Hustle / Part-time')!.id,
          note: pickRandom(['Tutoring Gig', 'Sold Clothes', 'Gift from Uncle']), amount: amt,
        });
        virtualBalance += amt;
      }

      // SLTF Disbursement (Once a year in Sept)
      if (txDate.getMonth() === 8 && txDate.getDate() === 15) {
        const amt = 1500;
        txsToInsert.push({
          id: generateId(), userId, type: 'income', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: incomeCats.find(c => c.name === 'Student Loan (SLTF)')!.id,
          note: 'SLTF Disbursement', amount: amt,
        });
        virtualBalance += amt;
      }

      // ----------------- 3. EXPENSES (With Balance Checks) -----------------
      
      // Rent: Once a year in Sept (Start of Sem)
      if (txDate.getMonth() === 8 && txDate.getDate() === 10) {
        const amt = 2500;
        txsToInsert.push({
          id: generateId(), userId, type: 'expense', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: expCats.find(c => c.name === 'Housing & Utilities')!.id,
          note: 'Hostel Rent (Academic Year)', amount: amt,
        });
        virtualBalance -= amt;
      }

      // Essential Food (Daily)
      if (virtualBalance > 50) {
        const count = Math.floor(Math.random() * 2) + 1;
        for (let idx = 0; idx < count; idx++) {
          const item = pickRandom(foodItems);
          const amt = randomAmt(item.min, item.max);
          txsToInsert.push({
            id: generateId(), userId, type: 'expense', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
            categoryId: expCats.find(c => c.name === 'Food & Dining')!.id,
            note: item.note, amount: amt,
          });
          virtualBalance -= amt;
        }
      }

      // Transport (mostly weekdays)
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && Math.random() < 0.7 && virtualBalance > 200) {
        const amt = randomAmt(5, 15);
        txsToInsert.push({
          id: generateId(), userId, type: 'expense', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: expCats.find(c => c.name === 'Transport')!.id,
          note: 'Campus Shuttle / Trotro', amount: amt,
        });
        virtualBalance -= amt;
      }

      // Groceries (Every 12 days)
      if (Math.random() < 0.08 && virtualBalance > 300) {
        const amt = randomAmt(150, 300);
        txsToInsert.push({
          id: generateId(), userId, type: 'expense', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: expCats.find(c => c.name === 'Groceries')!.id,
          note: 'Madina Market Supplies', amount: amt,
        });
        virtualBalance -= amt;
      }

      // Utilities/Data (Weekly)
      if (Math.random() < 0.12 && virtualBalance > 100) {
        const amt = randomAmt(50, 100);
        txsToInsert.push({
          id: generateId(), userId, type: 'expense', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: expCats.find(c => c.name === 'Housing & Utilities')!.id,
          note: pickRandom(['MTN Data Bundle', 'Electricity Prepaid']), amount: amt,
        });
        virtualBalance -= amt;
      }

      // Entertainment (ONLY on weekends and ONLY if balance is healthy > 800)
      if ((dayOfWeek === 5 || dayOfWeek === 6) && Math.random() < 0.25 && virtualBalance > 800) {
        const amt = randomAmt(100, 250);
        txsToInsert.push({
          id: generateId(), userId, type: 'expense', currency: 'GHS', date: txDate.toISOString(), createdAt: now, updatedAt: now,
          categoryId: expCats.find(c => c.name === 'Entertainment & Social')!.id,
          note: pickRandom(['Concert Ticket', 'Cinema & Drinks']), amount: amt,
        });
        virtualBalance -= amt;
      }
    }

    // Sort Descending for database appearance
    txsToInsert.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Batch Insert
    for (let i = 0; i < txsToInsert.length; i += 50) {
      const batch = txsToInsert.slice(i, i + 50);
      if (batch.length > 0) {
        await db.insert(transactions).values(batch);
      }
    }

    return txsToInsert.length;
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  }
}
