import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

// Define basic data types for exports
type ExportValue = string | number | boolean | null | undefined;
type ExportRecord = Record<string, ExportValue>;
type ExportData = ExportRecord[];

interface ExportConfig {
  filename: string;
  title: string;
  metadata?: {
    [key: string]: string;
  };
}

interface SheetData {
  name: string;
  data: ExportData;
  columns?: Array<{ wch: number }>;
}

interface ColumnStyle {
  cellWidth?: number;
  fontStyle?: string;
  halign?: 'left' | 'center' | 'right';
}

interface TableData {
  head: string[][];
  body: string[][];
  columnStyles?: Record<string, ColumnStyle>;
  theme?: string;
  fontSize?: number;
}

interface PDFOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerColor?: number[];
}

interface SummaryConfig {
  countFields?: string[];
  sumFields?: string[];
  avgFields?: string[];
}

type SummaryResult = Record<string, string | number>;

class ExportUtils {
  /**
   * Generate Excel report with multiple sheets
   */
  static generateExcelReport(config: ExportConfig, sheets: SheetData[]): void {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Add metadata sheet if provided
      if (config.metadata) {
        const metadataArray = Object.entries(config.metadata).map(([key, value]) => ({
          Property: key,
          Value: value
        }));
        
        const metadataSheet = XLSX.utils.json_to_sheet(metadataArray);
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info');
      }

      // Add each sheet
      sheets.forEach(sheet => {
        try {
          // Convert data to worksheet
          const worksheet = XLSX.utils.json_to_sheet(sheet.data);
          
          // Apply column widths if provided
          if (sheet.columns && sheet.columns.length > 0) {
            worksheet['!cols'] = sheet.columns;
          }

          // Auto-size columns if no specific widths provided
          if (!sheet.columns) {
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            const cols: Array<{ wch: number }> = [];
            
            for (let col = range.s.c; col <= range.e.c; col++) {
              let maxWidth = 10; // minimum width
              
              for (let row = range.s.r; row <= range.e.r; row++) {
                const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellRef];
                
                if (cell && cell.v) {
                  const cellValue = String(cell.v);
                  maxWidth = Math.max(maxWidth, Math.min(cellValue.length + 2, 50)); // max width 50
                }
              }
              
              cols.push({ wch: maxWidth });
            }
            
            worksheet['!cols'] = cols;
          }

          // Add the sheet to workbook
          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        } catch (sheetError) {
          console.error(`Error processing sheet ${sheet.name}:`, sheetError);
          // Continue with other sheets even if one fails
        }
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${config.filename}_${timestamp}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      console.log(`Excel file generated successfully: ${filename}`);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw new Error('Failed to generate Excel report');
    }
  }

  /**
   * Generate PDF report (placeholder for future implementation)
   */
  static generatePDFReport(config: ExportConfig, tables: TableData[], options?: PDFOptions): void {
    // This is a placeholder - PDF generation would require jsPDF and autoTable
    console.warn('PDF generation not implemented in ExportUtils. Use billingService for PDF generation.');
    throw new Error('PDF generation not implemented. Use specific service methods for PDF exports.');
  }

  /**
   * Download data as CSV
   */
  static downloadCSV(data: Array<Record<string, any>>, filename: string): void {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      // Convert data to CSV
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      // Create blob and download
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw new Error('Failed to generate CSV file');
    }
  }

  /**
   * Download data as JSON
   */
  static downloadJSON(data: any, filename: string): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating JSON:', error);
      throw new Error('Failed to generate JSON file');
    }
  }

  /**
   * Format date for export
   */
  static formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  /**
   * Format currency for export
   */
  static formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
    const safeAmount = amount || 0;
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${safeAmount.toLocaleString('en-IN')}`;
  }

  /**
   * Sanitize data for export (remove null/undefined, handle special characters)
   */
  static sanitizeData(data: Array<Record<string, any>>): Array<Record<string, any>> {
    return data.map(row => {
      const sanitizedRow: Record<string, any> = {};
      
      Object.entries(row).forEach(([key, value]) => {
        // Handle null/undefined values
        if (value === null || value === undefined) {
          sanitizedRow[key] = 'N/A';
        }
        // Handle objects and arrays
        else if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            sanitizedRow[key] = value.length > 0 ? value.join(', ') : 'None';
          } else {
            sanitizedRow[key] = JSON.stringify(value);
          }
        }
        // Handle boolean values
        else if (typeof value === 'boolean') {
          sanitizedRow[key] = value ? 'Yes' : 'No';
        }
        // Handle other values
        else {
          sanitizedRow[key] = String(value);
        }
      });
      
      return sanitizedRow;
    });
  }

  /**
   * Create summary statistics from data
   */
  static generateSummary(data: Array<Record<string, any>>, config: {
    countFields?: string[];
    sumFields?: string[];
    avgFields?: string[];
  }): Record<string, any> {
    const summary: Record<string, any> = {
      'Total Records': data.length
    };

    // Count unique values for specified fields
    if (config.countFields) {
      config.countFields.forEach(field => {
        const uniqueValues = new Set(data.map(row => row[field]).filter(val => val != null));
        summary[`Unique ${field}`] = uniqueValues.size;
      });
    }

    // Sum numeric fields
    if (config.sumFields) {
      config.sumFields.forEach(field => {
        const sum = data.reduce((total, row) => {
          const value = parseFloat(row[field]) || 0;
          return total + value;
        }, 0);
        summary[`Total ${field}`] = sum;
      });
    }

    // Average numeric fields
    if (config.avgFields) {
      config.avgFields.forEach(field => {
        const values = data.map(row => parseFloat(row[field]) || 0).filter(val => val > 0);
        const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        summary[`Average ${field}`] = Math.round(avg * 100) / 100;
      });
    }

    return summary;
  }

  /**
   * Validate export data
   */
  static validateExportData(data: Array<Record<string, any>>, minRows = 1): boolean {
    if (!Array.isArray(data)) {
      toast({
        title: "Invalid Data",
        description: "Export data must be an array",
        variant: "destructive",
      });
      return false;
    }

    if (data.length < minRows) {
      toast({
        title: "Insufficient Data",
        description: `At least ${minRows} record(s) required for export`,
        variant: "destructive",
      });
      return false;
    }

    if (data.length > 0 && Object.keys(data[0]).length === 0) {
      toast({
        title: "Empty Records",
        description: "Export data contains empty records",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }

  /**
   * Get file size estimate
   */
  static getFileSizeEstimate(data: Array<Record<string, any>>, format: 'excel' | 'csv' | 'json'): string {
    const jsonSize = JSON.stringify(data).length;
    
    let multiplier = 1;
    switch (format) {
      case 'excel':
        multiplier = 0.7; // Excel is typically more compressed
        break;
      case 'csv':
        multiplier = 0.6; // CSV is more compact
        break;
      case 'json':
        multiplier = 1; // JSON baseline
        break;
    }

    const estimatedBytes = jsonSize * multiplier;
    
    if (estimatedBytes < 1024) {
      return `${Math.round(estimatedBytes)} B`;
    } else if (estimatedBytes < 1024 * 1024) {
      return `${Math.round(estimatedBytes / 1024)} KB`;
    } else {
      return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    }
  }

  /**
   * Batch export for large datasets
   */
  static async batchExport(
    data: Array<Record<string, any>>,
    config: ExportConfig,
    batchSize = 1000,
    format: 'excel' | 'csv' = 'excel'
  ): Promise<void> {
    try {
      if (data.length <= batchSize) {
        // Small dataset, export normally
        if (format === 'excel') {
          this.generateExcelReport(config, [{ name: 'Data', data }]);
        } else {
          this.downloadCSV(data, config.filename);
        }
        return;
      }

      // Large dataset, split into batches
      const batches = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }

      // Export each batch
      for (let i = 0; i < batches.length; i++) {
        const batchConfig = {
          ...config,
          filename: `${config.filename}_part${i + 1}of${batches.length}`
        };

        if (format === 'excel') {
          this.generateExcelReport(batchConfig, [{ name: 'Data', data: batches[i] }]);
        } else {
          this.downloadCSV(batches[i], batchConfig.filename);
        }

        // Add delay between downloads to prevent browser blocking
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast({
        title: "Batch Export Complete",
        description: `Data exported in ${batches.length} files due to size`,
      });
    } catch (error) {
      console.error('Batch export error:', error);
      throw new Error('Failed to export large dataset');
    }
  }
}

export default ExportUtils;
