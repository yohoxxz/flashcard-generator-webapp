function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const textInputButton = document.getElementById('text-input-button');
  const pdfUploadButton = document.getElementById('pdf-upload-button');
  const textInputSection = document.getElementById('text-input-section');
  const pdfUploadSection = document.getElementById('pdf-upload-section');
  const generateButton = document.getElementById('generate-button');
  const textInput = document.getElementById('text-input');
  const pdfInput = document.getElementById('pdf-input');
  const flashcardsContainer = document.getElementById('flashcards-container');
  const navigation = document.getElementById('navigation');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const cardCounter = document.getElementById('card-counter');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyButton = document.getElementById('save-api-key');
  const apiKeyStatus = document.getElementById('api-key-status');
  const apiKeyModal = document.getElementById('api-key-modal');
  const fileName = document.querySelector('.file-name');

  let flashcards = [];
  let currentCardIndex = 0;

  // Check for saved API key in cookies instead of localStorage
  const savedApiKey = getCookie('openai_api_key');
  if (!savedApiKey) {
    document.getElementById('api-key-modal').classList.add('active');
    document.body.classList.add('modal-open');
  }

  // Handle saving API key
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      apiKeyStatus.textContent = '⚠ Please enter an API key';
      apiKeyStatus.className = 'status-error';
      return;
    }

    // Save to cookie instead of localStorage (expires in 30 days)
    setCookie('openai_api_key', apiKey, 30);
    apiKeyStatus.textContent = '✓ API key saved successfully';
    apiKeyStatus.className = 'status-success';

    // Hide modal after successful save
    setTimeout(() => {
      document.getElementById('api-key-modal').classList.remove('active');
      document.body.classList.remove('modal-open');
    }, 1000);
  });

  textInputButton.addEventListener('click', () => {
    textInputButton.classList.add('active');
    pdfUploadButton.classList.remove('active');
    textInputSection.style.display = 'block';
    pdfUploadSection.style.display = 'none';
  });

  pdfUploadButton.addEventListener('click', () => {
    pdfUploadButton.classList.add('active');
    textInputButton.classList.remove('active');
    textInputSection.style.display = 'none';
    pdfUploadSection.style.display = 'block';
  });

  generateButton.addEventListener('click', async () => {
    if (pdfUploadButton.classList.contains('active')) {
      // Handle PDF upload
      if (!pdfInput.files.length) {
        alert('Please select a PDF file.');
        return;
      }
      const file = pdfInput.files[0];
      await processPDF(file);
    } else {
      // Handle text input
      const text = textInput.value.trim();
      if (!text) {
        alert('Please enter some text.');
        return;
      }
      await generateFlashcards({ text });
    }
  });

  async function processPDF(file) {
    generateButton.disabled = true;
    generateButton.textContent = 'Processing PDF...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/.netlify/functions/process-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        await generateFlashcards({ text: data.text });
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while processing the PDF.');
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Flashcards';
    }
  }

  async function generateFlashcards(payload) {
    const apiKey = getCookie('openai_api_key');
    
    if (!apiKey) {
      document.getElementById('api-key-modal').classList.add('active');
      document.body.classList.add('modal-open');
      return;
    }

    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';

    try {
      const response = await fetch('/.netlify/functions/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Instead of displaying flashcards in current page,
        // open them in a new tab
        const flashcardsParam = encodeURIComponent(JSON.stringify(data.flashcards));
        const viewerUrl = `/flashcard-viewer.html?cards=${flashcardsParam}`;
        window.open(viewerUrl, '_blank');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while generating flashcards.');
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Flashcards';
    }
  }

  function displayFlashcards() {
    if (!flashcards.length) {
        alert('No flashcards generated.');
        return;
    }

    // Clear and show flashcards container first
    flashcardsContainer.innerHTML = '';
    flashcardsContainer.style.display = 'block';
    
    // Create flashcards
    flashcards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('flashcard');
        if (index === currentCardIndex) cardElement.classList.add('active');

        cardElement.innerHTML = `
            <div class="card-inner">
                <div class="question">${card.question}</div>
                <div class="answer">${card.answer}</div>
            </div>
        `;

        cardElement.addEventListener('click', () => {
            cardElement.classList.toggle('flipped');
        });

        flashcardsContainer.appendChild(cardElement);
    });

    // Show navigation after cards are created
    navigation.style.display = 'flex';

    // Only hide input section after confirming cards are displayed
    document.getElementById('input-section').style.display = 'none';
    document.getElementById('generate-button').style.display = 'none';

    // Add back button if it doesn't exist
    if (!document.getElementById('back-to-input')) {
        const backButton = document.createElement('button');
        backButton.id = 'back-to-input';
        backButton.textContent = '← Back to Input';
        backButton.onclick = () => {
            document.getElementById('input-section').style.display = 'block';
            document.getElementById('generate-button').style.display = 'block';
            flashcardsContainer.style.display = 'none';
            navigation.style.display = 'none';
            backButton.remove();
        };
        document.body.insertBefore(backButton, flashcardsContainer);
    }

    updateNavigation();
    setupKeyboardShortcuts();
  }

  function updateNavigation() {
    // Make sure navigation elements exist
    if (!prevButton || !nextButton || !cardCounter) {
        console.error('Navigation elements not found');
        return;
    }

    prevButton.disabled = currentCardIndex === 0;
    nextButton.disabled = currentCardIndex === flashcards.length - 1;
    cardCounter.textContent = `Card ${currentCardIndex + 1} of ${flashcards.length}`;
    
    // Debug log
    console.log('Navigation updated:', {
        currentIndex: currentCardIndex,
        totalCards: flashcards.length,
        prevDisabled: prevButton.disabled,
        nextDisabled: nextButton.disabled
    });

    updateActiveCard();
  }

  function updateActiveCard() {
    const cards = document.querySelectorAll('.flashcard');
    cards.forEach((card, index) => {
      card.classList.remove('active');
      if (index === currentCardIndex) {
        card.classList.add('active');
      }
    });
  }

  prevButton.addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateNavigation();
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
      updateNavigation();
    }
  });

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e) {
    if (e.code === 'ArrowLeft' && currentCardIndex > 0) {
      prevButton.click();
    }
    if (e.code === 'ArrowRight' && currentCardIndex < flashcards.length - 1) {
      nextButton.click();
    }
    if (e.code === 'Space') {
      e.preventDefault();
      const activeCard = document.querySelector('.flashcard.active');
      if (activeCard) {
        activeCard.classList.toggle('flipped');
      }
    }
  }

  // Add escape key handler for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && getCookie('openai_api_key')) {
        document.getElementById('api-key-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
    }
  });

  pdfInput.addEventListener('change', function(e) {
    if(this.files && this.files[0]) {
        fileName.textContent = this.files[0].name;
    } else {
        fileName.textContent = '';
    }
  });
}); 