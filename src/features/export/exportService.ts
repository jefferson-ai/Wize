import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from '../../db';
import { transactions, categories } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export async function exportTransactionsToCSV(userId: string) {
  try {
    // 1. Fetch all transactions for the user
    const userTx = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        currency: transactions.currency,
        note: transactions.note,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));

    // 2. Format as CSV string
    const headers = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Note'];
    
    // Map data to rows, escaping commas and quotes in notes
    const rows = userTx.map(tx => {
       const rawDate = new Date(tx.date).toLocaleDateString();
       const safeNote = tx.note ? `"${tx.note.replace(/"/g, '""')}"` : '';
       const safeCategory = tx.categoryName ? `"${tx.categoryName}"` : 'Unknown';
       return [
         rawDate,
         tx.type,
         tx.amount.toString(),
         tx.currency,
         safeCategory,
         safeNote
       ].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');

    // 3. Write to a temporary file
    if (!FileSystem.documentDirectory) {
      throw new Error('Document directory is not accessible');
    }
    
    const fileName = `Wize_Export_${new Date().getTime()}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 4. Prompt native share sheet
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (isSharingAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Wize Transactions',
        UTI: 'public.comma-separated-values-text' // helps iOS recognize CSV
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

    return true;
  } catch (error) {
    console.error('Error exporting CSV', error);
    throw error;
  }
}
