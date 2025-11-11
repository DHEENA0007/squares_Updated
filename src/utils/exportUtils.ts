import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Export utility interfaces
export interface ExportConfig {
  filename: string;
  title: string;
  metadata?: Record<string, string | number>;
  summaryStats?: Record<string, string | number>;
  filters?: Record<string, string>;
}

export interface ExcelSheetConfig {
  name: string;
  data: any[];
  columns?: { wch: number }[];
}

export interface PDFTableConfig {
  head: string[][];
  body: string[][];
  columnStyles?: Record<number, any>;
  theme?: 'striped' | 'grid' | 'plain';
  fontSize?: number;
}

export class ExportUtils {
  
  /**
   * Generate comprehensive Excel report with multiple sheets
   */
  static generateExcelReport(config: ExportConfig, sheets: ExcelSheetConfig[]): void {
    try {
      const wb = XLSX.utils.book_new();
      const timestamp = new Date().toISOString().split('T')[0];
      const timeString = new Date().toLocaleString();

      // Create overview sheet with metadata
      const overviewData = [
        [config.title],
        ['Generated on:', timeString],
        [''],
        ['Report Summary:']
      ];

      // Add metadata if provided
      if (config.metadata) {
        Object.entries(config.metadata).forEach(([key, value]) => {
          overviewData.push([key, value.toString()]);
        });
        overviewData.push(['']);
      }

      // Add summary statistics if provided
      if (config.summaryStats) {
        overviewData.push(['Statistics:']);
        Object.entries(config.summaryStats).forEach(([key, value]) => {
          overviewData.push([key, value.toString()]);
        });
        overviewData.push(['']);
      }

      // Add filters if provided
      if (config.filters) {
        overviewData.push(['Applied Filters:']);
        Object.entries(config.filters).forEach(([key, value]) => {
          overviewData.push([key, value]);
        });
      }

      const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');

      // Add data sheets
      sheets.forEach(sheet => {
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        
        // Apply column widths if provided
        if (sheet.columns) {
          ws['!cols'] = sheet.columns;
        }
        
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });

      // Generate filename and save
      const filename = config.filename.includes(timestamp) 
        ? config.filename 
        : `${config.filename}_${timestamp}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Generate comprehensive PDF report
   */
  static generatePDFReport(
    config: ExportConfig, 
    tables: PDFTableConfig[], 
    options: {
      orientation?: 'portrait' | 'landscape';
      format?: 'a4' | 'letter';
      includeHeader?: boolean;
      includeFooter?: boolean;
      headerColor?: [number, number, number];
    } = {}
  ): void {
    try {
      const doc = new jsPDF({
        orientation: options.orientation || 'landscape',
        unit: 'mm',
        format: options.format || 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let currentY = margin;

      // Header section
      if (options.includeHeader !== false) {
        currentY = this.addPDFHeader(doc, config, pageWidth, currentY, margin, options.headerColor);
      }

      // Add tables
      tables.forEach((table, index) => {
        // Check if we need a new page
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = margin;
        }

        autoTable(doc, {
          head: table.head,
          body: table.body,
          startY: currentY,
          theme: table.theme || 'striped',
          styles: {
            fontSize: table.fontSize || 8,
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap',
          },
          headStyles: {
            fillColor: options.headerColor || [52, 144, 220],
            textColor: 255,
            fontSize: (table.fontSize || 8) + 1,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: {
            textColor: 50,
          },
          alternateRowStyles: {
            fillColor: [249, 249, 249],
          },
          columnStyles: table.columnStyles || {},
          margin: { top: 0, right: margin, bottom: 0, left: margin },
          tableWidth: 'auto',
        });

        // Update currentY for next table
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      // Footer
      if (options.includeFooter !== false) {
        this.addPDFFooter(doc, pageWidth, pageHeight);
      }

      // Generate filename and save
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = config.filename.includes(timestamp) 
        ? config.filename 
        : `${config.filename}_${timestamp}.pdf`;
      
      doc.save(filename);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF file');
    }
  }

  /**
   * Add PDF header with title, metadata and summary box
   */
  private static addPDFHeader(
    doc: jsPDF, 
    config: ExportConfig, 
    pageWidth: number, 
    startY: number, 
    margin: number,
    headerColor?: [number, number, number]
  ): number {
    let currentY = startY;
    const primaryColor = headerColor || [44, 62, 80];
    const lightColor = [248, 249, 250];

    // Title
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(config.title, margin, currentY);
    currentY += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    const reportDate = new Date().toLocaleString();
    doc.text(`Generated on: ${reportDate}`, margin, currentY);
    doc.text(`Page 1`, pageWidth - margin - 20, currentY);
    currentY += 6;

    // Add metadata
    if (config.metadata) {
      Object.entries(config.metadata).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, margin, currentY);
        currentY += 4;
      });
    }

    // Add filters
    if (config.filters) {
      let filtersText = 'Filters: ';
      Object.entries(config.filters).forEach(([key, value], index) => {
        if (index > 0) filtersText += ' | ';
        filtersText += `${key}: ${value}`;
      });
      doc.text(filtersText, margin, currentY);
      currentY += 6;
    }

    currentY += 4;

    // Summary statistics box
    if (config.summaryStats && Object.keys(config.summaryStats).length > 0) {
      const statsBoxHeight = 20;
      
      // Background
      doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
      doc.rect(margin, currentY, pageWidth - 2 * margin, statsBoxHeight, 'F');
      doc.setDrawColor(222, 226, 230);
      doc.rect(margin, currentY, pageWidth - 2 * margin, statsBoxHeight);

      // Title
      doc.setFontSize(11);
      doc.setTextColor(33, 37, 41);
      doc.text('Summary Statistics', margin + 5, currentY + 7);

      // Stats
      doc.setFontSize(9);
      doc.setTextColor(73, 80, 87);
      let statsX = margin + 5;
      let statsY = currentY + 13;
      let colCount = 0;
      const maxCols = 4;
      const colWidth = (pageWidth - 2 * margin - 10) / maxCols;

      Object.entries(config.summaryStats).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, statsX, statsY);
        colCount++;
        if (colCount >= maxCols) {
          colCount = 0;
          statsX = margin + 5;
          statsY += 6;
        } else {
          statsX += colWidth;
        }
      });

      currentY += statsBoxHeight + 8;
    }

    return currentY;
  }

  /**
   * Add PDF footer with page numbers and timestamp
   */
  private static addPDFFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    const totalPages = (doc as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(108, 117, 125);
      doc.text(
        `Generated on ${new Date().toLocaleDateString('en-GB')} | Page ${i} of ${totalPages} | Confidential Report`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }
  }

  /**
   * Utility to format currency based on currency code
   */
  static formatCurrency(amount: number, currency: string = 'INR'): string {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  }

  /**
   * Utility to format dates consistently
   */
  static formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-GB');
  }

  /**
   * Generate standard column widths for common data types
   */
  static getStandardColumnWidths(type: 'client' | 'financial' | 'analytics'): { wch: number }[] {
    switch (type) {
      case 'client':
        return [
          { wch: 6 },  // Serial
          { wch: 20 }, // Name
          { wch: 25 }, // Email
          { wch: 15 }, // Phone
          { wch: 20 }, // Plan
          { wch: 15 }, // Amount
          { wch: 12 }, // Status
          { wch: 12 }, // Date
        ];
      case 'financial':
        return [
          { wch: 6 },  // Serial
          { wch: 20 }, // Description
          { wch: 15 }, // Date
          { wch: 15 }, // Amount
          { wch: 12 }, // Type
          { wch: 15 }, // Method
          { wch: 12 }, // Status
        ];
      case 'analytics':
        return [
          { wch: 6 },  // Serial
          { wch: 25 }, // Property/Item
          { wch: 12 }, // Views
          { wch: 12 }, // Leads
          { wch: 15 }, // Revenue
          { wch: 12 }, // Rate
          { wch: 12 }, // Score
        ];
      default:
        return [{ wch: 15 }];
    }
  }

  /**
   * Generate standard PDF column styles
   */
  static getStandardPDFColumnStyles(type: 'client' | 'financial' | 'analytics'): Record<number, any> {
    switch (type) {
      case 'client':
        return {
          0: { cellWidth: 8, halign: 'center' },   // Serial
          1: { cellWidth: 25 },                    // Name
          2: { cellWidth: 35 },                    // Email
          3: { cellWidth: 20 },                    // Phone/Plan
          4: { cellWidth: 15, halign: 'right' },   // Amount
          5: { cellWidth: 15, halign: 'center' },  // Status
          6: { cellWidth: 18, halign: 'center' },  // Date
        };
      case 'financial':
        return {
          0: { cellWidth: 8, halign: 'center' },   // Serial
          1: { cellWidth: 30 },                    // Description
          2: { cellWidth: 20, halign: 'center' },  // Date
          3: { cellWidth: 15, halign: 'right' },   // Amount
          4: { cellWidth: 15 },                    // Type
          5: { cellWidth: 15 },                    // Method
          6: { cellWidth: 15, halign: 'center' },  // Status
        };
      case 'analytics':
        return {
          0: { cellWidth: 8, halign: 'center' },   // Serial
          1: { cellWidth: 30 },                    // Item
          2: { cellWidth: 12, halign: 'center' },  // Views
          3: { cellWidth: 12, halign: 'center' },  // Leads
          4: { cellWidth: 15, halign: 'right' },   // Revenue
          5: { cellWidth: 12, halign: 'center' },  // Rate
          6: { cellWidth: 12, halign: 'center' },  // Score
        };
      default:
        return {};
    }
  }
}

export default ExportUtils;
