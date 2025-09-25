import { jsPDF } from 'jspdf';

// Define the structure of the academic content from Gemini
export interface AcademicContent {
  title: string;
  introduction: string;
  sections: {
    heading: string;
    content: string[];
  }[];
  conclusion: string;
}

export const generatePdf = (data: AcademicContent, targetWindow?: Window | null) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let y = margin;
  let pageNumber = 1;

  const addPageNumber = () => {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(String(pageNumber), pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  const checkPageBreak = (spaceNeeded: number) => {
      if (y + spaceNeeded > pageHeight - margin) {
          addPageNumber();
          doc.addPage();
          pageNumber++;
          y = margin;
          return true;
      }
      return false;
  };

  // Helper function to add text and handle page breaks
  const addText = (text: string, font: 'times' | 'times', style: 'normal' | 'bold' | 'italic', size: number, spaceAfter: number) => {
    const setFontStyles = () => {
        doc.setFont(font, style);
        doc.setFontSize(size);
        doc.setTextColor(style === 'bold' ? '#000000' : '#333333');
    }
    
    setFontStyles();

    const lineHeight = size * 0.55; // Consistent line spacing
    const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
    
    splitText.forEach((line: string) => {
      // checkPageBreak returns true if a page was added
      if (checkPageBreak(lineHeight)) {
          // Re-apply font settings on the new page before drawing text
          setFontStyles();
      }
      const x = margin;
      doc.text(line, x, y);
      y += lineHeight;
    });
    y += spaceAfter;
  };

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor('#000000');
  const titleLines = doc.splitTextToSize(data.title, pageWidth - margin * 2);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += (titleLines.length * (22 * 0.5)) + 15;

  // Introduction
  addText('Introduzione', 'times', 'bold', 14, 4);
  addText(data.introduction, 'times', 'normal', 12, 10);

  // Sections
  data.sections.forEach(section => {
    const headingSize = 14;
    const contentSize = 12;
    const headingLineHeight = headingSize * 0.55;
    const contentLineHeight = contentSize * 0.55;

    const headingLines = doc.splitTextToSize(section.heading, pageWidth - margin * 2);
    const headingBlockHeight = headingLines.length * headingLineHeight;
    
    // Widow/Orphan Control: Check if heading + one line of content fits. 4 is spaceAfter heading.
    const spaceNeeded = headingBlockHeight + 4 + contentLineHeight;
    checkPageBreak(spaceNeeded);

    addText(section.heading, 'times', 'bold', headingSize, 4);
    section.content.forEach(paragraph => {
      addText(paragraph, 'times', 'normal', contentSize, 6);
    });
    y += 4;
  });

  // Conclusion
  checkPageBreak(20); // Check space for conclusion
  addText('Conclusione', 'times', 'bold', 14, 4);
  addText(data.conclusion, 'times', 'normal', 12, 10);

  addPageNumber();
  
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    // Fallback in case the window was closed or not provided
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      alert("Impossibile aprire il PDF. Assicurati che il tuo browser non stia bloccando i pop-up.");
    }
  }
};