export interface Transaction {
  date: string;
  campaignName: string;
  action: 'claim' | 'redeem';
  amount: number;
  transactionHash: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class ExportService {
  static filterByDateRange(transactions: Transaction[], dateRange?: DateRange): Transaction[] {
    if (!dateRange) return transactions;
    
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= dateRange.startDate && txDate <= dateRange.endDate;
    });
  }

  static generateCSV(transactions: Transaction[], dateRange?: DateRange): string {
    const headers = ['Date', 'Campaign Name', 'Action', 'Amount', 'Transaction Hash'];
    const filteredTransactions = this.filterByDateRange(transactions, dateRange);
    
    // Escape commas and quotes in CSV values
    const escapeCSV = (value: string | number): string => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        escapeCSV(t.date),
        escapeCSV(t.campaignName),
        escapeCSV(t.action),
        escapeCSV(t.amount),
        escapeCSV(t.transactionHash)
      ].join(','))
    ].join('\n');
    
    return csvContent;
  }

  static generateFilename(dateRange?: DateRange): string {
    if (!dateRange) {
      const today = new Date().toISOString().split('T')[0];
      return `rewards-${today}.csv`;
    }
    
    const start = dateRange.startDate.toISOString().split('T')[0];
    const end = dateRange.endDate.toISOString().split('T')[0];
    return `rewards-${start}-to-${end}.csv`;
  }

  static downloadCSV(filename: string, content: string): void {
    // Use chunked approach for large files
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  }

  static async exportToCSV(transactions: Transaction[], dateRange?: DateRange): Promise<void> {
    // Handle large datasets with chunking
    if (transactions.length > 1000) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const csv = this.generateCSV(transactions, dateRange);
          const filename = this.generateFilename(dateRange);
          this.downloadCSV(filename, csv);
          resolve();
        }, 0);
      });
    }
    
    const csv = this.generateCSV(transactions, dateRange);
    const filename = this.generateFilename(dateRange);
    this.downloadCSV(filename, csv);
  }
}
