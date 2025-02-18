class PDFSearch {
    constructor() {
        this.searchIndex = null;
        this.loadSearchIndex();
    }
    
    async loadSearchIndex() {
        try {
            const response = await fetch('search-index.json');
            this.searchIndex = await response.json();
            console.log('Search index loaded successfully');
        } catch (error) {
            console.error('Error loading search index:', error);
        }
    }
    
    search(query) {
        if (!this.searchIndex) return [];
        
        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
        if (searchTerms.length === 0) return [];
        
        // Score and filter results
        const results = this.searchIndex
            .map(item => {
                const titleLower = (item.title || '').toLowerCase();
                const contentLower = (item.content || '').toLowerCase();
                
                // Calculate scores
                let titleScore = 0;
                let contentScore = 0;
                
                // Check for exact title match (highest priority)
                if (titleLower === query.toLowerCase()) {
                    titleScore += 1000;
                }
                
                // Check for partial title matches
                for (const term of searchTerms) {
                    if (titleLower.includes(term)) {
                        // Title matches are weighted heavily
                        titleScore += 100;
                        // Bonus for term at beginning of title
                        if (titleLower.startsWith(term)) {
                            titleScore += 50;
                        }
                    }
                    
                    // Count occurrences in content
                    if (contentLower) {
                        // Start position for search
                        let pos = 0;
                        let termCount = 0;
                        
                        // Count all occurrences
                        while (true) {
                            pos = contentLower.indexOf(term, pos);
                            if (pos === -1) break;
                            termCount++;
                            pos += term.length;
                        }
                        
                        contentScore += termCount * 1; // 1 point per occurrence
                    }
                }
                
                const totalScore = titleScore + contentScore;
                
                // Only include results that have at least one match
                if (totalScore > 0) {
                    return {
                        ...item,
                        titleScore,
                        contentScore,
                        totalScore,
                        snippets: this.getContentSnippets(item.content, searchTerms, 3)
                    };
                }
                return null;
            })
            .filter(item => item !== null);
        
        // Sort by total score (descending)
        results.sort((a, b) => b.totalScore - a.totalScore);
        
        return results;
    }
    
    getContentSnippets(content, searchTerms, maxSnippets = 3) {
        if (!content) return [];
        
        const snippets = [];
        const contentLower = content.toLowerCase();
        
        // For each search term
        for (const term of searchTerms) {
            let lastPos = 0;
            
            // Find occurrences until we have enough snippets
            while (snippets.length < maxSnippets) {
                const pos = contentLower.indexOf(term, lastPos);
                if (pos === -1) break;
                
                // Extract snippet with context
                const start = Math.max(0, pos - 50);
                const end = Math.min(content.length, pos + term.length + 50);
                const snippet = content.slice(start, end);
                
                snippets.push({
                    text: '...' + snippet + '...',
                    term: term
                });
                
                lastPos = pos + term.length;
            }
        }
        
        // If we have too many snippets, select the best ones
        if (snippets.length > maxSnippets) {
            return snippets.slice(0, maxSnippets);
        }
        
        return snippets;
    }
}

// This function should be added to your search.html or index.html script section
function initSearch() {
    const searcher = new PDFSearch();
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        const results = await searcher.search(query);
        
        if (results.length === 0) {
            searchResults.innerHTML = '<li class="no-results">No matching results found</li>';
            return;
        }
        
        searchResults.innerHTML = results.map(result => `
            <li class="result-item">
                <a href="../${result.path}" class="result-title">${result.title}</a>
                <div class="result-metadata">
                    Relevance: ${Math.min(100, Math.floor(result.totalScore / 10))}%
                    ${result.titleScore > 0 ? ' (title match)' : ''}
                </div>
                ${result.snippets.length > 0 ? `
                    <div class="result-snippets">
                        ${result.snippets.map(snippet => `
                            <div class="result-snippet">
                                ${highlightTerms(snippet.text, [snippet.term])}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </li>
        `).join('');
    });
}

function highlightTerms(text, terms) {
    let result = text;
    terms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        result = result.replace(regex, match => `<mark>${match}</mark>`);
    });
    return result;
}

// Call the init function when the page loads
document.addEventListener('DOMContentLoaded', initSearch);
