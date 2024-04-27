// Function to generate and append dynamic blocks
function generateBlock(content) {
    // Create a new div element
    const block = document.createElement('div');
    block.classList.add('block');

    // Add content based on its type (text, image, or both)
    if (typeof content === 'string') {
        block.textContent = content;
    } else if (content instanceof Image) {
        block.appendChild(content);
    } else {
        // Handle both text and image combination
        const textElement = document.createElement('p');
        textElement.textContent = content.text;
        block.appendChild(textElement);
        block.appendChild(content.image);
    }

    // Append the block to the container element
    document.querySelector('.container').appendChild(block);
}

// Generate several blocks with different content types
generateBlock('This is a text block.');
generateBlock(new Image('https://example.com/image.jpg'));
generateBlock({ text: 'Image and text block!', image: new Image('https://example.com/image2.jpg') });

// You can further customize this function to generate blocks based on data from an API or any other source
