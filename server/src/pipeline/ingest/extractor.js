/**
 * Text extraction from uploaded files.
 * Supports: PDF, DOCX, TXT, MD
 */
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(buffer, mimetype, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text, markdown, etc.
  return buffer.toString('utf-8');
}
