// search-index-generator.js
const fs = require('fs').promises;
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

async function generateSearchIndex() {
  const searchIndex = [];
  
  async function crawlDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip hidden directories and node_modules
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await crawlDirectory(fullPath);
          }
        } else if (entry.name === 'index.html') {
          console.log(`Processing index file: ${fullPath}`);
          // Parse index files to get PDF titles
          const content = await fs.readFile(fullPath, 'utf-8');
          const titles = extractTitlesFromIndex(content);
          searchIndex.push(...titles.map(title => ({
            title,
            path: fullPath.replace('index.html', '')
          })));
        } else if (entry.name.endsWith('.html') && entry.name !== 'search.html') {
          console.log(`Processing PDF file: ${fullPath}`);
          // Parse PDF content files
          const content = await fs.readFile(fullPath, 'utf-8');
          const textContent = extractTextContent(content);
          searchIndex.push({
            title: entry.name.replace('.html', ''),
            path: fullPath,
            content: textContent
          });
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error);
    }
  }
  
  function extractTitlesFromIndex(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    // Adjust selector based on your index.html structure
    return Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim());
  }
  
  function extractTextContent(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    // Extract text from all div elements
    return Array.from(document.querySelectorAll('div'))
      .map(div => div.textContent.trim())
      .join(' ');
  }

  try {
    // Start crawling from the current directory
    const startDir = process.cwd();
    console.log('Starting directory scan from:', startDir);
    await crawlDirectory(startDir);
    
    // Write the search index to file
    const outputPath = path.join(startDir, 'search-index.json');
    await fs.writeFile(outputPath, JSON.stringify(searchIndex, null, 2));
    console.log(`Search index generated successfully at: ${outputPath}`);
    console.log(`Total entries indexed: ${searchIndex.length}`);
  } catch (error) {
    console.error('Error generating search index:', error);
  }
}

// Run the generator
generateSearchIndex();
