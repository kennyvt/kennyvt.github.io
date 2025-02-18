// search-index-generator.js
const fs = require('fs').promises;
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const pdfParse = require('pdf-parse');

// =========================================================
// IMPORTANT: MODIFY THESE PATHS TO MATCH YOUR DIRECTORY STRUCTURE
// =========================================================
const PDF_DIRECTORY = '../Systems_SplitNumbered/';  // REPLACE WITH YOUR PDF DIRECTORY PATH (e.g., '../pdfs/')
const HTML_DIRECTORY = './'; // REPLACE WITH YOUR HTML DIRECTORY PATH (e.g., '../html/')
// =========================================================

async function generateSearchIndex() {
  const searchIndex = [];
  
  async function crawlPDFDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip hidden directories and node_modules
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await crawlPDFDirectory(fullPath);
          }
        } else if (entry.name.endsWith('.pdf')) {
          console.log(`Processing PDF file: ${fullPath}`);
          try {
            // Read the PDF file
            const pdfBuffer = await fs.readFile(fullPath);
            // Extract text from PDF
            const pdfData = await pdfParse(pdfBuffer);
            
            // Calculate the relative path within the PDF directory
            const relativePath = path.relative(PDF_DIRECTORY, dirPath);
            
            // Map to the corresponding HTML file path
            const htmlFilePath = path.join(
              HTML_DIRECTORY,
              relativePath,
              entry.name.replace('.pdf', '.html')
            );
            
            searchIndex.push({
              title: entry.name.replace('.pdf', ''),
              path: htmlFilePath, // Link to the HTML version
              content: pdfData.text // Store the PDF's text content
            });
          } catch (pdfError) {
            console.error(`Error processing PDF ${fullPath}:`, pdfError);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error);
    }
  }
  
  async function collectIndexFiles(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip hidden directories and node_modules
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await collectIndexFiles(fullPath);
          }
        } else if (entry.name === 'index.html') {
          console.log(`Processing index file: ${fullPath}`);
          const content = await fs.readFile(fullPath, 'utf-8');
          const titles = extractTitlesFromIndex(content);
          searchIndex.push(...titles.map(title => ({
            title,
            path: fullPath.replace('index.html', '')
          })));
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error);
    }
  }
  
  function extractTitlesFromIndex(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    return Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim());
  }

  try {
    // Process PDFs
    console.log('Starting PDF scan from:', PDF_DIRECTORY);
    await crawlPDFDirectory(PDF_DIRECTORY);
    
    // Process index files
    console.log('Starting index file scan from:', HTML_DIRECTORY);
    await collectIndexFiles(HTML_DIRECTORY);
    
    // Write the search index to file
    const outputPath = path.join(process.cwd(), 'search-index.json');
    await fs.writeFile(outputPath, JSON.stringify(searchIndex, null, 2));
    console.log(`Search index generated successfully at: ${outputPath}`);
    console.log(`Total entries indexed: ${searchIndex.length}`);
  } catch (error) {
    console.error('Error generating search index:', error);
  }
}

// Run the generator
generateSearchIndex();
