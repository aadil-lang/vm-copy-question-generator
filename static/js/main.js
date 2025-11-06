// Store uploaded files for deletion
window.uploadedFiles = [];

// Handle image upload preview
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    window.uploadedFiles = [];
    
    Array.from(e.target.files).forEach((file) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageWrapper = document.createElement('div');
                imageWrapper.className = 'image-wrapper';
                imageWrapper.dataset.fileName = file.name;
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Preview image';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-image-btn';
                deleteBtn.innerHTML = '✕';
                deleteBtn.title = 'Delete image';
                deleteBtn.onclick = function() {
                    deleteUploadedImage(imageWrapper);
                };
                
                imageWrapper.appendChild(img);
                imageWrapper.appendChild(deleteBtn);
                preview.appendChild(imageWrapper);
                
                window.uploadedFiles.push(file);
            };
            reader.readAsDataURL(file);
        }
    });
});

// Handle URL images preview
let urlImages = [];
document.getElementById('images').addEventListener('input', function(e) {
    const urlPreview = document.getElementById('urlImagePreview');
    urlPreview.innerHTML = '';
    urlImages = [];
    
    const urls = e.target.value.split(',').map(url => url.trim()).filter(url => url.length > 0);
    
    urls.forEach((url) => {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper';
        imageWrapper.dataset.imageUrl = url;
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'URL image';
        img.onerror = function() {
            this.style.display = 'none';
            const btn = this.parentElement.querySelector('.delete-image-btn');
            if (btn) btn.style.display = 'none';
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-image-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = 'Delete image';
        deleteBtn.onclick = function() {
            deleteUrlImage(imageWrapper);
        };
        
        imageWrapper.appendChild(img);
        imageWrapper.appendChild(deleteBtn);
        urlPreview.appendChild(imageWrapper);
        
        urlImages.push(url);
    });
});

// Delete uploaded image
function deleteUploadedImage(imageWrapper) {
    const fileName = imageWrapper.dataset.fileName;
    
    // Remove from uploaded files array
    window.uploadedFiles = window.uploadedFiles.filter(file => file.name !== fileName);
    
    // Update file input
    const fileInput = document.getElementById('imageUpload');
    const dataTransfer = new DataTransfer();
    window.uploadedFiles.forEach(file => {
        dataTransfer.items.add(file);
    });
    fileInput.files = dataTransfer.files;
    
    // Remove from preview
    imageWrapper.remove();
    
    // If no more images, clear preview
    const preview = document.getElementById('imagePreview');
    if (preview.children.length === 0) {
        preview.innerHTML = '';
    }
}

// Delete URL image
function deleteUrlImage(imageWrapper) {
    const imageUrl = imageWrapper.dataset.imageUrl;
    
    // Remove from urlImages array
    urlImages = urlImages.filter(url => url !== imageUrl);
    
    // Update URL input
    document.getElementById('images').value = urlImages.join(', ');
    
    // Remove from preview
    imageWrapper.remove();
    
    // If no more images, clear preview
    const urlPreview = document.getElementById('urlImagePreview');
    if (urlPreview.children.length === 0) {
        urlPreview.innerHTML = '';
    }
}

// Form submission handler
document.getElementById('questionForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get images - use urlImages array if it's been initialized (tracks deletions)
    // Otherwise fall back to input value for manually typed URLs
    const imagesInput = document.getElementById('images').value;
    const imagesToUse = urlImages.length > 0 ? urlImages.join(', ') : imagesInput;
    
    // Get images only if images field is visible (image-based questions)
    const imagesField = document.getElementById('imagesField');
    const isImageBased = imagesField && imagesField.style.display !== 'none';
    
    const formData = {
        baseQuestion: document.getElementById('baseQuestion').value,
        notes: document.getElementById('notes').value,
        solution: document.getElementById('solution').value,
        images: isImageBased ? imagesToUse : '', // Only include images for image-based questions
        numOptions: null, // Will be parsed from base question on backend
        numCopyQuestions: parseInt(document.getElementById('numCopyQuestions').value),
        difficulty: 'Medium', // Default difficulty
        grade: '', // Default to empty
        curriculum: '', // Default to empty
        model: document.getElementById('model').value,
        imageFiles: isImageBased ? [] : [], // Only include imageFiles for image-based questions
        questionType: window.questionType || '' // Pass question type from URL
    };

    // Handle file uploads (use actual file input which is updated on deletion)
    // Only process if images field is visible (image-based questions)
    if (isImageBased) {
        const fileInput = document.getElementById('imageUpload');
        const filesToUpload = fileInput.files.length > 0 ? Array.from(fileInput.files) : [];
        if (filesToUpload.length > 0) {
            for (let file of filesToUpload) {
                const reader = new FileReader();
                await new Promise((resolve) => {
                    reader.onload = (e) => {
                        formData.imageFiles.push({
                            name: file.name,
                            data: e.target.result
                        });
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
    }

    // Show loading state with progress indication
    const selectedModel = document.getElementById('model').value;
    const numQuestions = formData.numCopyQuestions;
    const loadingText = document.getElementById('loadingText');
    
    // Update loading message every 2 seconds to show it's still working
    let dots = 0;
    const loadingInterval = setInterval(() => {
        dots = (dots % 3) + 1;
        loadingText.textContent = `Generating ${numQuestions} questions with ${selectedModel.toUpperCase()}${'.'.repeat(dots)}`;
    }, 1000);
    
    // Store interval ID to clear it later
    window.loadingInterval = loadingInterval;
    
    loadingText.textContent = `Generating ${numQuestions} questions with ${selectedModel.toUpperCase()}...`;
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('generateBtn').disabled = true;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate questions');
        }

        // Log how many questions were received
        console.log(`DEBUG: Received ${data.questions ? data.questions.length : 0} questions from server`);
        
        if (!data.questions || data.questions.length === 0) {
            throw new Error('No questions were generated. Please try again.');
        }
        
        // Check if we got fewer questions than requested
        const requestedNum = formData.numCopyQuestions;
        if (data.questions.length < requestedNum) {
            console.warn(`Warning: Requested ${requestedNum} questions but received only ${data.questions.length}`);
        }
        
        displayResults(data.questions);
        document.getElementById('copyAllBtn').disabled = false;
        document.getElementById('copySelectedBtn').disabled = false;
        updateSelectedCount();

    } catch (error) {
        showError(error.message);
    } finally {
        // Clear loading interval if it exists
        if (window.loadingInterval) {
            clearInterval(window.loadingInterval);
            window.loadingInterval = null;
        }
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('generateBtn').disabled = false;
    }
});

// Display generated questions
function displayResults(questions) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    // Log how many questions we're displaying
    console.log(`DEBUG: Displaying ${questions.length} questions`);

    questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        
        let html = `
            <div class="question-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="question-checkbox" id="question-checkbox-${index}" data-question-index="${index}" onchange="updateSelectedCount()">
                    <span class="question-number">Question ${index + 1}</span>
                </div>
                <div class="button-group-inline">
                    <button class="copy-btn" onclick="copyQuestion(${index}, this)">Copy</button>
                    <button class="solution-btn" onclick="toggleSolution(${index}, this)">View Solution</button>
                </div>
            </div>
            <div class="question-text">${escapeHtml(question.question)}</div>
        `;

        if (question.image) {
            html += `<img src="${escapeHtml(question.image)}" alt="Question Image" class="question-image" onerror="this.style.display='none'">`;
        }

        if (question.options && question.options.length > 0) {
            html += '<h3 class="options-heading">Options</h3>';
            html += '<ul class="options-list">';
            question.options.forEach((option, optIndex) => {
                const isCorrect = option.logic === 'CA' || option.isCorrect;
                html += `
                    <li class="${isCorrect ? 'correct' : 'incorrect'}">
                        <span class="option-label">${String.fromCharCode(65 + optIndex)}.</span>
                        <div>
                            <div>${escapeHtml(option.text)}</div>
                            <div class="option-logic">Logic: ${escapeHtml(option.logic || 'Unknown')}</div>
                        </div>
                    </li>
                `;
            });
            html += '</ul>';
        }

        // Add solution section (hidden by default)
        if (question.solution) {
            html += `<div class="solution-container" id="solution-${index}" style="display: none;">
                <h3 class="solution-title">Solution:</h3>
                <div class="solution-text">${escapeHtml(question.solution)}</div>
            </div>`;
        }

        questionCard.innerHTML = html;
        container.appendChild(questionCard);
    });

    // Store questions globally for copy functionality
    window.generatedQuestions = questions;
    console.log('DEBUG: Stored questions for copying:', window.generatedQuestions.length);
    document.getElementById('results').classList.remove('hidden');
}

// Copy individual question - make sure it's in global scope
window.copyQuestion = function(index, btn) {
    console.log('DEBUG: Copy button clicked, index:', index);
    console.log('DEBUG: Generated questions:', window.generatedQuestions);
    
    if (!window.generatedQuestions || !window.generatedQuestions[index]) {
        console.error('ERROR: Questions not available or index out of range');
        alert('Error: Question not available. Please regenerate questions.');
        return;
    }
    
    const question = window.generatedQuestions[index];
    let text = `${question.question}\n\n`;
    
    // Add image/model indicator if image exists
    if (question.image && question.image.trim()) {
        text += '[Image/Model]\n\n';
    }
    
    // Add options
    if (question.options && question.options.length > 0) {
        text += 'Options\n\n';
        question.options.forEach((option, optIndex) => {
            const optionLabel = String.fromCharCode(65 + optIndex);
            text += `${optionLabel}) ${option.text}\n`;
        });
    }
    
    console.log('DEBUG: Text to copy:', text);
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
        alert('Failed to copy. Please try again or copy manually.');
    });
}

// Update selected count and enable/disable copy selected button
window.updateSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.question-checkbox:checked');
    const count = checkboxes.length;
    const copySelectedBtn = document.getElementById('copySelectedBtn');
    if (copySelectedBtn) {
        copySelectedBtn.textContent = `Copy Selected (${count})`;
        copySelectedBtn.disabled = count === 0;
    }
}

// Copy selected questions
document.getElementById('copySelectedBtn').addEventListener('click', function() {
    console.log('DEBUG: Copy Selected button clicked');
    
    const checkboxes = document.querySelectorAll('.question-checkbox:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.questionIndex));
    
    if (selectedIndices.length === 0) {
        alert('Please select at least one question to copy.');
        return;
    }
    
    if (!window.generatedQuestions) {
        console.error('ERROR: No questions available');
        alert('Error: No questions available. Please generate questions first.');
        return;
    }
    
    let allText = '';
    selectedIndices.forEach((index, arrIndex) => {
        const question = window.generatedQuestions[index];
        if (!question) {
            console.error(`ERROR: Question at index ${index} not found`);
            return;
        }
        
        allText += `${question.question}\n\n`;
        
        // Add image/model indicator if image exists
        if (question.image && question.image.trim()) {
            allText += '[Image/Model]\n\n';
        }
        
        // Add options
        if (question.options && question.options.length > 0) {
            allText += 'Options\n\n';
            question.options.forEach((option, optIndex) => {
                const optionLabel = String.fromCharCode(65 + optIndex);
                allText += `${optionLabel}) ${option.text}\n`;
            });
        }
        
        // Add separator between questions (except for last one)
        if (arrIndex < selectedIndices.length - 1) {
            allText += '\n---\n\n';
        }
    });
    
    console.log(`DEBUG: Copying ${selectedIndices.length} selected questions`);
    console.log('DEBUG: Text to copy (first 500 chars):', allText.substring(0, 500));
    
    navigator.clipboard.writeText(allText).then(() => {
        const btn = this;
        const originalText = btn.textContent;
        btn.textContent = `Copied ${selectedIndices.length}!`;
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
        alert('Failed to copy. Please try again or copy manually.');
    });
});

// Copy all questions
document.getElementById('copyAllBtn').addEventListener('click', function() {
    console.log('DEBUG: Copy All button clicked');
    console.log('DEBUG: Generated questions:', window.generatedQuestions);
    
    if (!window.generatedQuestions || window.generatedQuestions.length === 0) {
        console.error('ERROR: No questions available');
        alert('Error: No questions available. Please generate questions first.');
        return;
    }
    
    let allText = '';
    window.generatedQuestions.forEach((question, index) => {
        allText += `${question.question}\n\n`;
        
        // Add image/model indicator if image exists
        if (question.image && question.image.trim()) {
            allText += '[Image/Model]\n\n';
        }
        
        // Add options
        if (question.options && question.options.length > 0) {
            allText += 'Options\n\n';
            question.options.forEach((option, optIndex) => {
                const optionLabel = String.fromCharCode(65 + optIndex);
                allText += `${optionLabel}) ${option.text}\n`;
            });
        }
        
        allText += '\n---\n\n';
    });
    
    console.log('DEBUG: Text to copy (first 500 chars):', allText.substring(0, 500));
    
    navigator.clipboard.writeText(allText).then(() => {
        const btn = this;
        const originalText = btn.textContent;
        btn.textContent = 'All Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
        alert('Failed to copy. Please try again or copy manually.');
    });
});

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.classList.remove('hidden');
}

// Toggle solution display
function toggleSolution(index, btn) {
    const solutionDiv = document.getElementById(`solution-${index}`);
    if (solutionDiv) {
        if (solutionDiv.style.display === 'none') {
            solutionDiv.style.display = 'block';
            btn.textContent = 'Hide Solution';
        } else {
            solutionDiv.style.display = 'none';
            btn.textContent = 'View Solution';
        }
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

